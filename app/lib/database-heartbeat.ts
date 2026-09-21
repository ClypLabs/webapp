import { getCache } from "@vercel/functions";

// The status endpoint used to prove the database was up by querying it, and
// Neon bills for being awake: a status page (or anyone opening the API page)
// woke it for five minutes each time the ten-minute verdict lapsed. Real
// traffic proves the same thing for free. Anything that has just read or
// written Postgres successfully leaves a timestamp here, and the status check
// takes that as its answer, so it only queries the database when nothing else
// has reached it lately.
//
// Long enough to bridge the gap between the desktop app's own reads (one per
// half hour per open app, see AUTH_STATE_TTL_SECONDS in desktop-token.ts), short
// enough that an outage nothing is reading through shows up as "down" within
// the hour instead of never.
export const HEARTBEAT_TTL_SECONDS = 35 * 60;

const cache = () => getCache({ namespace: "clypdat-status" });
const KEY = "database-seen-ok";

/** Call after a Postgres query has succeeded. Best effort; never throws. */
export async function noteDatabaseReachable(): Promise<void> {
  try {
    await cache().set(KEY, Date.now(), { ttl: HEARTBEAT_TTL_SECONDS, name: "database-seen-ok" });
  } catch {
    // The status check falls back to asking the database itself.
  }
}

/** Whether a query succeeded within the last HEARTBEAT_TTL_SECONDS. */
export async function databaseSeenReachable(): Promise<boolean> {
  try {
    return Boolean(await cache().get(KEY));
  } catch {
    return false;
  }
}
