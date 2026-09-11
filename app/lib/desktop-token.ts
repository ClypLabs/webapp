import { createHmac, timingSafeEqual } from "node:crypto";
import { pool } from "@/app/lib/auth";
import { readCached, writeCached } from "@/app/lib/account-cache";

const tokenLifetimeSeconds = 60 * 60 * 24 * 30;

function secret() {
  return process.env.BETTER_AUTH_SECRET ?? "development-only-change-me-before-deploying";
}

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function createDesktopToken(userId: string) {
  const payload = encode(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds }));
  return `${payload}.${sign(payload)}`;
}

export function verifyDesktopToken(token: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  const actualBytes = Buffer.from(signature, "base64url");
  const expectedBytes = Buffer.from(expected, "base64url");
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    if (!value.sub || !value.exp || value.exp <= Math.floor(Date.now() / 1000)) return null;
    return { userId: value.sub, expiresAt: value.exp };
  } catch {
    return null;
  }
}

/**
 * Verifies the compatible signed token, then checks its subject still exists.
 * A signature failure and a deleted user are both unauthenticated; a database
 * failure is allowed to reach callers as a service error instead.
 *
 * "Still exists" comes from the account cache when it can: this runs on every
 * desktop poll, and a database read each time kept Neon awake. Deleting the
 * account expires the cached answer everywhere (see databaseHooks in auth.ts),
 * so a deleted user's token still stops working on its next use. Only a
 * positive answer is cached - a missing user is always re-checked.
 */
export async function verifyActiveDesktopToken(token: string) {
  const identity = verifyDesktopToken(token);
  if (!identity) return null;
  if (await readCached<boolean>(identity.userId, "exists")) return identity;
  console.info("[db] desktop token user check");
  // The same read fills the profile entry, so showing the name and picture in
  // the app costs no query of its own.
  const profile = await readProfile(identity.userId);
  if (!profile) return null;
  await Promise.all([writeCached(identity.userId, "exists", true), writeCached(identity.userId, "profile", profile)]);
  return identity;
}

/** Name and picture the desktop app shows on its account card. */
export type DesktopProfile = { name: string; image: string | null };

async function readProfile(userId: string): Promise<DesktopProfile | null> {
  const result = await pool.query<{ name: string; image: string | null }>('SELECT name, image FROM "user" WHERE id = $1', [userId]);
  const row = result.rows[0];
  return row ? { name: row.name, image: row.image } : null;
}

// Changes to the name or picture - a Discord sign-in refreshing them, or a new
// display name from /account - expire this through the user.update hook.
export async function getDesktopProfile(userId: string): Promise<DesktopProfile | null> {
  const cached = await readCached<DesktopProfile>(userId, "profile");
  if (cached) return cached;
  console.info("[db] desktop profile read");
  const profile = await readProfile(userId);
  if (profile) await writeCached(userId, "profile", profile);
  return profile;
}

export const desktopTokenLifetimeSeconds = tokenLifetimeSeconds;
