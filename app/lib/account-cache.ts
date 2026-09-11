import { getCache } from "@vercel/functions";

// Account data the desktop app's Xbox poll needs on every request, held in
// Vercel's Runtime Cache instead of read from Postgres each time.
//
// The poll runs every 15-60s per user for as long as the app is open. When
// each one queried the database, Neon never reached its five idle minutes, so
// one user was enough to keep it billing compute around the clock. With these
// entries in place a poll touches the database only when an entry is missing.
//
// Revocation stays immediate: every entry carries its user's tag, and every
// change to that user - deleting the account, linking or unlinking a provider
// or Xbox - calls expireUserCache, which Vercel propagates to every region
// within about 300ms. The TTLs are a backstop for a change that somehow skipped
// that call, not the mechanism anything relies on.

const cache = () => getCache({ namespace: "clypdat-account" });

// Long on purpose. Freshness comes from expireUserCache on every change, not
// from this; the TTL only bounds how long a change that skipped that call could
// go unnoticed. At 15 minutes, each active user's entries lapsed four times an
// hour, and every lapse woke Neon for its five-minute idle window - with a few
// users online the database never slept. Matches the Xbox session's own cap.
export const ACCOUNT_CACHE_TTL_SECONDS = 12 * 60 * 60;

const userTag = (userId: string) => `user:${userId}`;

export async function readCached<T>(userId: string, key: string): Promise<T | undefined> {
  try {
    const value = await cache().get(`${userId}:${key}`);
    return value === null || value === undefined ? undefined : (value as T);
  } catch {
    // A cache outage degrades to the database path, never to an error.
    return undefined;
  }
}

export async function writeCached(
  userId: string,
  key: string,
  value: unknown,
  ttlSeconds = ACCOUNT_CACHE_TTL_SECONDS,
): Promise<void> {
  try {
    await cache().set(`${userId}:${key}`, value, {
      ttl: Math.max(1, Math.floor(ttlSeconds)),
      tags: [userTag(userId)],
      // Named by kind only. The default name is the key, which would put user
      // IDs into Vercel's observability dashboard.
      name: `account-${key}`,
    });
  } catch {
    // Not cached this time; the next request reads the database again.
  }
}

export async function deleteCached(userId: string, key: string): Promise<void> {
  try {
    await cache().delete(`${userId}:${key}`);
  } catch {
    // The entry's TTL still bounds how long it can outlive this.
  }
}

/** Drops everything cached for a user, in every region. Call on any account change. */
export async function expireUserCache(userId: string): Promise<void> {
  try {
    await cache().expireTag(userTag(userId));
  } catch (error) {
    console.error("Account cache: expiring a user's entries failed", error);
  }
}
