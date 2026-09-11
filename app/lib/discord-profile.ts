import { auth, pool } from "@/app/lib/auth";
import { deleteCached, expireUserCache, readCached, writeCached } from "@/app/lib/account-cache";
import { getDesktopProfile } from "@/app/lib/desktop-token";
import { openToken, sealToken } from "@/app/lib/xbox";

// Keeps the Discord name and picture on a ClypDat account current. Better Auth
// only copies them at sign-in and when Discord is linked, so a new avatar
// would otherwise wait for the next Discord sign-in - and the old CDN link
// stops working in the meantime.
//
// Checked at most every CHECK_INTERVAL per user, or on demand from a Refresh
// button. Neon is touched only when something actually changed: the Discord
// access token is held (sealed) in the runtime cache, and the profile compared
// against is the cached one the desktop poll already reads.

const CHECK_INTERVAL_SECONDS = 30 * 60;
// The Refresh button (on /account and in the app, one shared allowance) asks
// Discord at most this often. Kept in the database, not only the runtime
// cache: reloading, signing in again, or any other account change must not
// reset it, and a cache entry can be evicted or expired with the user's tag.
export const REFRESH_COOLDOWN_SECONDS = 20 * 60;
const DISCORD_TIMEOUT_MS = 4_000;

type CachedToken = { token: string; expiresAt: number };
type DiscordUser = { id: string; username: string; global_name: string | null; avatar: string | null; discriminator: string };

// The same URL Better Auth builds at sign-in (social-providers/discord), so a
// check never flips an avatar between two spellings of the same picture.
function avatarUrl(user: DiscordUser): string {
  if (user.avatar === null) {
    const index = user.discriminator === "0" ? Number(BigInt(user.id) >> BigInt(22)) % 6 : parseInt(user.discriminator) % 5;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const format = user.avatar.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${format}`;
}

async function discordAccessToken(userId: string): Promise<string | null> {
  const cached = await readCached<CachedToken>(userId, "discord-token");
  if (cached && cached.expiresAt - Date.now() > 60_000) {
    try {
      return openToken(cached.token);
    } catch {
      // Sealed under an older secret; fetch a fresh one.
    }
  }
  console.info("[db] discord token read");
  const account = await pool.query<{ id: string }>('SELECT id FROM "account" WHERE "userId" = $1 AND "providerId" = $2', [userId, "discord"]);
  const accountId = account.rows[0]?.id;
  if (!accountId) return null;
  // Refreshes and stores a new token through Better Auth when this one expired.
  const tokens = await auth.api.getAccessToken({ body: { accountId, userId } });
  if (!tokens?.accessToken) return null;
  const expiresAt = tokens.accessTokenExpiresAt ? new Date(tokens.accessTokenExpiresAt).getTime() : Date.now() + 60 * 60 * 1000;
  const ttl = Math.min((expiresAt - Date.now()) / 1000 - 60, 12 * 60 * 60);
  if (ttl > 60) await writeCached(userId, "discord-token", { token: sealToken(tokens.accessToken), expiresAt }, ttl);
  return tokens.accessToken;
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  schemaReady ??= pool
    .query(`
      CREATE TABLE IF NOT EXISTS clypdat_discord_refresh (
        user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
        refreshed_at TIMESTAMPTZ NOT NULL
      )
    `)
    .then(() => undefined)
    .catch((error) => {
      schemaReady = null;
      throw error;
    });
  return schemaReady;
}

type RefreshWindow = { until: number };

/**
 * Seconds until the Refresh button may ask Discord again; 0 when it may now.
 * Answered from the runtime cache when it can, so a page showing the countdown
 * does not wake the database on every load. The entry is untagged, so account
 * changes that expire the user's cache leave it alone.
 */
export async function discordRefreshCooldown(userId: string): Promise<number> {
  const remaining = (until: number) => Math.max(0, Math.ceil((until - Date.now()) / 1000));
  const cached = await readCached<RefreshWindow>(userId, "discord-refresh-window");
  if (cached) return remaining(cached.until);
  console.info("[db] discord refresh cooldown read");
  await ensureSchema();
  const result = await pool.query<{ refreshed_at: Date }>("SELECT refreshed_at FROM clypdat_discord_refresh WHERE user_id = $1", [userId]);
  const last = result.rows[0]?.refreshed_at;
  const until = last ? last.getTime() + REFRESH_COOLDOWN_SECONDS * 1000 : 0;
  // A known "ready" is cached too, for as long as a window would last: the only
  // thing that can end it is a refresh, and that rewrites this entry.
  await writeCached(userId, "discord-refresh-window", { until }, remaining(until) || REFRESH_COOLDOWN_SECONDS, { survivesExpiry: true });
  return remaining(until);
}

/**
 * Claims the Refresh allowance. The UPDATE only lands when the last refresh is
 * older than the cooldown, so two presses at once (the site and the app, or
 * two tabs) cannot both get through.
 */
async function claimRefresh(userId: string): Promise<boolean> {
  await ensureSchema();
  console.info("[db] discord refresh claim");
  const result = await pool.query(
    `INSERT INTO clypdat_discord_refresh (user_id, refreshed_at) VALUES ($1, NOW())
     ON CONFLICT (user_id) DO UPDATE SET refreshed_at = NOW()
     WHERE clypdat_discord_refresh.refreshed_at <= NOW() - make_interval(secs => $2)`,
    [userId, REFRESH_COOLDOWN_SECONDS],
  );
  const claimed = (result.rowCount ?? 0) > 0;
  // Either way the window is now known; a lost race re-reads the real one.
  if (claimed) {
    await writeCached(userId, "discord-refresh-window", { until: Date.now() + REFRESH_COOLDOWN_SECONDS * 1000 }, REFRESH_COOLDOWN_SECONDS, { survivesExpiry: true });
  } else {
    await deleteCached(userId, "discord-refresh-window");
  }
  return claimed;
}

export type DiscordProfileCheck = "changed" | "unchanged" | "skipped" | "cooldown" | "unavailable";

/**
 * Compares the account's Discord name and picture with Discord's, and saves
 * them when they differ. Skipped when checked within the last 30 minutes.
 * With <paramref name="force"/> (a Refresh button) it goes now instead, but
 * only once per REFRESH_COOLDOWN_SECONDS - "cooldown" otherwise. A press counts
 * even when Discord then fails to answer. Never throws: a failed check keeps
 * what the account already shows.
 */
export async function refreshDiscordProfile(userId: string, force = false): Promise<DiscordProfileCheck> {
  if (force) {
    try {
      if ((await discordRefreshCooldown(userId)) > 0 || !(await claimRefresh(userId))) return "cooldown";
    } catch (error) {
      console.error("Discord refresh cooldown unavailable", error);
      return "unavailable";
    }
  } else if (await readCached<boolean>(userId, "discord-checked")) {
    return "skipped";
  }
  try {
    const token = await discordAccessToken(userId);
    if (!token) return "unavailable";
    const response = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS),
      cache: "no-store",
    });
    if (response.status === 401) {
      // Revoked or expired early. Next check goes back to Better Auth.
      await deleteCached(userId, "discord-token");
      return "unavailable";
    }
    if (!response.ok) return "unavailable";
    const user = (await response.json()) as DiscordUser;
    const name = user.global_name || user.username;
    const image = avatarUrl(user);

    const current = await getDesktopProfile(userId);
    if (current && current.name === name && current.image === image) return "unchanged";

    console.info("[db] discord profile update");
    await pool.query('UPDATE "user" SET name = $2, image = $3, "updatedAt" = now() WHERE id = $1', [userId, name, image]);
    // A direct UPDATE, so Better Auth's user hook never sees it.
    await expireUserCache(userId);
    return "changed";
  } catch (error) {
    console.error("Discord profile check failed", error);
    return "unavailable";
  } finally {
    // Written after any expireUserCache above, which would otherwise wipe it.
    await writeCached(userId, "discord-checked", true, CHECK_INTERVAL_SECONDS);
  }
}
