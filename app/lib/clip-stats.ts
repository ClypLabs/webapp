import { getCache } from "@vercel/functions";
import { pool } from "@/app/lib/auth";

// The public "clips saved" counter. The desktop app reports a count whenever
// it saves a clip, an auto-clip or a full session, plus how many seconds of
// gameplay those saves hold - numbers, nothing else. No clip, file name,
// game, account or install ID ever reaches this table.
//
// The site shows totals. The kinds are stored apart so a split can be shown
// later without having lost it in the meantime.
//
// Only ever goes up. It counts saves, not clips that still exist: deleting,
// trimming or a storage limit clearing old files must never subtract, which
// is why nothing here accepts a negative amount or offers a decrement.

export const CLIP_STAT_KINDS = ["clip", "auto_clip", "full_session"] as const;
export type ClipStatKind = (typeof CLIP_STAT_KINDS)[number];
export type ClipStatCounts = Record<ClipStatKind, number>;
export type ClipStatAdd = { count: number; seconds: number };

// The app batches saves it could not report (offline, site down) and sends
// them later, so one request can legitimately carry more than one. The cap is
// what bounds how far a single forged request can move the number.
export const MAX_PER_REQUEST = 100;

// The most gameplay one save can plausibly hold, used to cap `*_seconds` at
// count x this. Replay length tops out at 5 minutes; the headroom covers a
// buffer that ran slightly long. A full session is capped at a day.
export const MAX_SECONDS_PER_SAVE: Record<ClipStatKind, number> = {
  clip: 10 * 60,
  auto_clip: 10 * 60,
  full_session: 24 * 60 * 60,
};

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clypdat_clip_stats (
        kind TEXT PRIMARY KEY,
        count BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    // Added after the table first shipped; existing rows start at zero.
    await pool.query(
      "ALTER TABLE clypdat_clip_stats ADD COLUMN IF NOT EXISTS seconds BIGINT NOT NULL DEFAULT 0",
    );
    // The same numbers filed by UTC day, for /stats/clips/history. Totals stay
    // in clypdat_clip_stats: summing every day on each read would grow without
    // bound, and the totals predate this table.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clypdat_clip_stats_daily (
        day DATE NOT NULL,
        kind TEXT NOT NULL,
        count BIGINT NOT NULL DEFAULT 0,
        seconds BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (day, kind)
      )
    `);
  })().catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

export async function addClipStats(adds: Partial<Record<ClipStatKind, ClipStatAdd>>): Promise<void> {
  const rows = CLIP_STAT_KINDS.flatMap((kind) => {
    const add = adds[kind];
    return add && (add.count > 0 || add.seconds > 0) ? [[kind, add.count, add.seconds] as const] : [];
  });
  if (!rows.length) return;
  await ensureSchema();
  // One statement for every kind in the request, so a batch is all or nothing
  // and costs a single round trip.
  const values = rows
    .map((_, index) => `($${index * 3 + 1}, $${index * 3 + 2}::bigint, $${index * 3 + 3}::bigint)`)
    .join(", ");
  await pool.query(
    `INSERT INTO clypdat_clip_stats (kind, count, seconds)
     VALUES ${values}
     ON CONFLICT (kind) DO UPDATE
       SET count = clypdat_clip_stats.count + EXCLUDED.count,
           seconds = clypdat_clip_stats.seconds + EXCLUDED.seconds,
           updated_at = NOW()`,
    rows.flat(),
  );
  await pool.query(
    `INSERT INTO clypdat_clip_stats_daily (day, kind, count, seconds)
     VALUES ${rows.map((_, index) => `((NOW() AT TIME ZONE 'UTC')::date, $${index * 3 + 1}, $${index * 3 + 2}::bigint, $${index * 3 + 3}::bigint)`).join(", ")}
     ON CONFLICT (day, kind) DO UPDATE
       SET count = clypdat_clip_stats_daily.count + EXCLUDED.count,
           seconds = clypdat_clip_stats_daily.seconds + EXCLUDED.seconds`,
    rows.flat(),
  );
  // Today's bar changed, so every cached history window is stale. Deleted
  // rather than rebuilt: nobody may look at a given window before it changes
  // again, and the next read rebuilds it from a database that is awake anyway.
  await Promise.all(HISTORY_WINDOWS.map((days) => statsCache().delete(historyKey(days)).catch(() => undefined)));
  // The database is awake for this write anyway, so the fresh totals are read
  // now and written over the cached ones; page views then never have to wake
  // it. An overwrite, not expireTag-then-set: the tag expiry lands up to 300ms
  // later and was wiping the entry just written, so the next view missed.
  // Hobby runs functions in a single region, so there is no other region's
  // copy to go stale; the TTL below covers it if that ever changes.
  await cacheStats(await readClipStats());
}

// The totals are read on every page view and every 10s by an open API tab, and
// each read used to query Postgres - which kept Neon from ever idling while
// someone had the page open. They only change when a save arrives, so they
// are cached until one does (addClipStats above). The TTL is a backstop.
const statsCache = () => getCache({ namespace: "clypdat-stats" });
const STATS_KEY = "totals";
const STATS_TAG = "clip-stats";

async function cacheStats(stats: ClipStats): Promise<void> {
  try {
    await statsCache().set(STATS_KEY, stats, { ttl: 60 * 60, tags: [STATS_TAG], name: "clip-stats" });
  } catch {
    // Uncached: the next read goes to the database.
  }
}

export type ClipStats = ClipStatCounts & {
  total: number;
  seconds: ClipStatCounts & { total: number };
};

export async function getClipStats(): Promise<ClipStats> {
  try {
    const cached = await statsCache().get(STATS_KEY);
    if (cached) return cached as ClipStats;
  } catch {
    // Fall through to the database.
  }
  const stats = await readClipStats();
  await cacheStats(stats);
  return stats;
}

async function readClipStats(): Promise<ClipStats> {
  console.info("[db] clip stats read");
  await ensureSchema();
  const result = await pool.query<{ kind: string; count: string; seconds: string }>(
    "SELECT kind, count, seconds FROM clypdat_clip_stats",
  );
  const counts: ClipStatCounts = { clip: 0, auto_clip: 0, full_session: 0 };
  const seconds: ClipStatCounts = { clip: 0, auto_clip: 0, full_session: 0 };
  for (const row of result.rows) {
    if ((CLIP_STAT_KINDS as readonly string[]).includes(row.kind)) {
      counts[row.kind as ClipStatKind] = Number(row.count);
      seconds[row.kind as ClipStatKind] = Number(row.seconds);
    }
  }
  const sum = (values: ClipStatCounts) => values.clip + values.auto_clip + values.full_session;
  return { ...counts, total: sum(counts), seconds: { ...seconds, total: sum(seconds) } };
}

// Per-day history. Windows are a fixed set so the cache holds a handful of
// entries, not one per arbitrary ?days= value someone types.
export const HISTORY_WINDOWS = [7, 30, 90, 365] as const;
export type HistoryWindow = (typeof HISTORY_WINDOWS)[number];
const historyKey = (days: number) => `history:${days}`;

export type ClipHistoryDay = ClipStatCounts & {
  date: string;
  total: number;
  seconds: number;
};

export async function getClipHistory(days: HistoryWindow): Promise<ClipHistoryDay[]> {
  try {
    const cached = await statsCache().get(historyKey(days));
    if (cached) return cached as ClipHistoryDay[];
  } catch {
    // Fall through to the database.
  }
  const history = await readClipHistory(days);
  try {
    // Until the next save deletes it (addClipStats), or midnight UTC adds a
    // day - the TTL is what rolls the window over.
    await statsCache().set(historyKey(days), history, { ttl: 60 * 60, tags: [STATS_TAG], name: "clip-history" });
  } catch {
    // Uncached: the next read goes to the database.
  }
  return history;
}

async function readClipHistory(days: number): Promise<ClipHistoryDay[]> {
  console.info("[db] clip history read");
  await ensureSchema();
  const result = await pool.query<{ day: string; kind: string; count: string; seconds: string }>(
    `SELECT to_char(day, 'YYYY-MM-DD') AS day, kind, count, seconds
     FROM clypdat_clip_stats_daily
     WHERE day > (NOW() AT TIME ZONE 'UTC')::date - $1::int`,
    [days],
  );
  // Every day in the window appears, including days with nothing saved, so a
  // chart can draw the gaps instead of joining the bars either side of them.
  const byDay = new Map<string, ClipHistoryDay>();
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset))
      .toISOString()
      .slice(0, 10);
    byDay.set(date, { date, clip: 0, auto_clip: 0, full_session: 0, total: 0, seconds: 0 });
  }
  for (const row of result.rows) {
    const day = byDay.get(row.day);
    if (!day || !(CLIP_STAT_KINDS as readonly string[]).includes(row.kind)) continue;
    day[row.kind as ClipStatKind] += Number(row.count);
    day.total += Number(row.count);
    day.seconds += Number(row.seconds);
  }
  return [...byDay.values()];
}
