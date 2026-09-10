import { pool } from "@/app/lib/auth";

// The public "clips saved" counter. The desktop app reports a count whenever
// it saves a clip, an auto-clip or a full session - a number, nothing else.
// No clip, file name, game, account or install ID ever reaches this table.
//
// The site shows one number, the total of all three. They are stored apart
// so a split can be shown later without having lost it in the meantime.

export const CLIP_STAT_KINDS = ["clip", "auto_clip", "full_session"] as const;
export type ClipStatKind = (typeof CLIP_STAT_KINDS)[number];
export type ClipStatCounts = Record<ClipStatKind, number>;

// The app batches saves it could not report (offline, site down) and sends
// them later, so one request can legitimately carry more than one. The cap is
// what bounds how far a single forged request can move the number.
export const MAX_PER_REQUEST = 100;

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  schemaReady ??= pool
    .query(`
      CREATE TABLE IF NOT EXISTS clypdat_clip_stats (
        kind TEXT PRIMARY KEY,
        count BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    .then(() => undefined)
    .catch((error) => {
      schemaReady = null;
      throw error;
    });
  return schemaReady;
}

export async function addClipStats(counts: Partial<ClipStatCounts>): Promise<void> {
  const rows = CLIP_STAT_KINDS.map((kind) => [kind, counts[kind] ?? 0] as const).filter(
    ([, amount]) => amount > 0,
  );
  if (!rows.length) return;
  await ensureSchema();
  // One statement for every kind in the request, so a batch is all or nothing
  // and costs a single round trip.
  const values = rows.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2}::bigint)`).join(", ");
  await pool.query(
    `INSERT INTO clypdat_clip_stats (kind, count)
     VALUES ${values}
     ON CONFLICT (kind) DO UPDATE
       SET count = clypdat_clip_stats.count + EXCLUDED.count, updated_at = NOW()`,
    rows.flat(),
  );
}

export async function getClipStats(): Promise<ClipStatCounts & { total: number }> {
  await ensureSchema();
  const result = await pool.query<{ kind: string; count: string }>(
    "SELECT kind, count FROM clypdat_clip_stats",
  );
  const counts: ClipStatCounts = { clip: 0, auto_clip: 0, full_session: 0 };
  for (const row of result.rows) {
    if ((CLIP_STAT_KINDS as readonly string[]).includes(row.kind)) {
      counts[row.kind as ClipStatKind] = Number(row.count);
    }
  }
  return { ...counts, total: counts.clip + counts.auto_clip + counts.full_session };
}
