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
// A Refresh button pressed repeatedly still asks Discord at most this often.
const FORCE_MIN_SECONDS = 20;
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

export type DiscordProfileCheck = "changed" | "unchanged" | "skipped" | "unavailable";

/**
 * Compares the account's Discord name and picture with Discord's, and saves
 * them when they differ. Skipped when checked within the last 30 minutes (or,
 * with <paramref name="force"/>, the last 20 seconds). Never throws: a failed
 * check keeps what the account already shows.
 */
export async function refreshDiscordProfile(userId: string, force = false): Promise<DiscordProfileCheck> {
  const key = force ? "discord-forced" : "discord-checked";
  if (await readCached<boolean>(userId, key)) return "skipped";
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
    if (force) await writeCached(userId, "discord-forced", true, FORCE_MIN_SECONDS);
  }
}
