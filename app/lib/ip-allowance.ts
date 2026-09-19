import { createHmac } from "node:crypto";
import { getCache } from "@vercel/functions";
import { purposeKey } from "@/app/lib/secret";
import { pool } from "@/app/lib/auth";

// Per-address daily allowances for the public counters, shared by every
// function instance through Postgres. Exhausted allowances are cached to stop
// repeated requests without more database writes. Addresses are kept only as
// a keyed hash that changes with the day, so nothing here can be turned back
// into an IP or followed across days.

const cache = () => getCache({ namespace: "clypdat-stats" });
const DAY_SECONDS = 24 * 60 * 60;
let schemaReady: Promise<void> | null = null;

async function ensureSchema() {
  schemaReady ??= pool.query(`
    CREATE TABLE IF NOT EXISTS clypdat_stats_allowance (
      bucket TEXT PRIMARY KEY,
      used INTEGER NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
    CREATE INDEX IF NOT EXISTS clypdat_stats_allowance_expiry ON clypdat_stats_allowance (expires_at);
    DELETE FROM clypdat_stats_allowance WHERE expires_at <= NOW();
  `).then(() => undefined).catch((error) => {
    schemaReady = null;
    throw error;
  });
  await schemaReady;
}

export function clientAddress(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function dayKey(kind: string, address: string) {
  const day = new Date().toISOString().slice(0, 10);
  const hash = createHmac("sha256", purposeKey("stats-ip")).update(`${day}\0${address}`).digest("base64url").slice(0, 22);
  return `allowance:${kind}:${day}:${hash}`;
}

/**
 * Takes `amount` from today's allowance for this address and says whether it
 * fitted. The conditional upsert is atomic across instances. A cache miss or
 * outage falls back to Postgres; it cannot reset an allowance.
 */
export async function takeDailyAllowance(kind: string, address: string, amount: number, limit: number): Promise<boolean> {
  if (!Number.isSafeInteger(amount) || amount <= 0 || !Number.isSafeInteger(limit) || limit < amount || limit > 2_147_483_647) return false;
  const key = dayKey(kind, address);
  try {
    if (await cache().get(key) === true) return false;
  } catch {
    // Cache availability does not affect the durable allowance.
  }
  await ensureSchema();
  const result = await pool.query<{ used: number }>(
    `INSERT INTO clypdat_stats_allowance (bucket, used, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '2 days')
     ON CONFLICT (bucket) DO UPDATE SET used = clypdat_stats_allowance.used + EXCLUDED.used
       WHERE clypdat_stats_allowance.used <= $3 - EXCLUDED.used
     RETURNING used`,
    [key, amount, limit],
  );
  const used = result.rows[0]?.used;
  if ((used !== undefined && used >= limit) || (used === undefined && amount === 1)) {
    try { await cache().set(key, true, { ttl: DAY_SECONDS, tags: [], name: `allowance-${kind}` }); } catch { }
  }
  return used !== undefined;
}
