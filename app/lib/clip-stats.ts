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
  // The database is awake for this write anyway, so the fresh totals are read
  // now and cached; page views then never have to wake it. The tag expiry
  // reaches every region, so none keeps serving the old number.
  await expireStatsCache();
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
    await statsCache().set(STATS_KEY, stats, { ttl: 24 * 60 * 60, tags: [STATS_TAG], name: "clip-stats" });
  } catch {
    // Uncached: the next read goes to the database.
  }
}

async function expireStatsCache(): Promise<void> {
  try {
    await statsCache().expireTag(STATS_TAG);
  } catch (error) {
    console.error("Clip stats: expiring the cached totals failed", error);
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
