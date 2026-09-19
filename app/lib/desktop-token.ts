import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { pool } from "@/app/lib/auth";
import { expireUserCache, readCached, writeCached } from "@/app/lib/account-cache";
import { authSecret, purposeKey } from "@/app/lib/secret";

const tokenLifetimeSeconds = 60 * 60 * 24 * 30;

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", purposeKey("desktop-token")).update(value).digest("base64url");
}

// Tokens issued before per-purpose keys were signed with the raw secret. They
// stay valid until they expire (30 days at most) or are revoked with the rest
// of the account's desktop sign-ins; nothing new is signed this way.
function signLegacy(value: string) {
  return createHmac("sha256", authSecret()).update(value).digest("base64url");
}

function matches(signature: string, expected: string) {
  const actualBytes = Buffer.from(signature, "base64url");
  const expectedBytes = Buffer.from(expected, "base64url");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

type TokenClaims = { sub?: string; exp?: number; ver?: number; jti?: string };

export type DesktopIdentity = { userId: string; expiresAt: number; version: number; tokenId: string | null };

export async function createDesktopToken(userId: string) {
  const state = await readDesktopAuthState(userId);
  if (!state) throw new Error("Desktop account no longer exists");
  const { version } = state;
  const claims: TokenClaims = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + tokenLifetimeSeconds,
    ver: version,
    jti: randomBytes(12).toString("base64url"),
  };
  const payload = encode(JSON.stringify(claims));
  return `${payload}.${sign(payload)}`;
}

export function verifyDesktopToken(token: string): DesktopIdentity | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  if (!matches(signature, sign(payload)) && !matches(signature, signLegacy(payload))) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as TokenClaims;
    if (typeof value.sub !== "string" || !value.sub || !Number.isSafeInteger(value.exp) || value.exp! <= Math.floor(Date.now() / 1000)) return null;
    if (value.ver !== undefined && (!Number.isSafeInteger(value.ver) || value.ver < 0)) return null;
    return {
      userId: value.sub,
      expiresAt: value.exp!,
      version: typeof value.ver === "number" ? value.ver : 0,
      tokenId: typeof value.jti === "string" ? value.jti : null,
    };
  } catch {
    return null;
  }
}

// Desktop sign-ins can be taken back. The signed token alone used to be good
// for its full 30 days whatever happened on the site; now each account keeps a
// version (bumped by "Sign out ClypDat on all PCs") and a short list of single
// tokens signed out from the app. Authorization reads this durable row, never
// the profile cache: delayed invalidation or a racing cache fill must not
// restore a token after sign-out. Profile data remains cached separately.
type DesktopAuthState = { version: number; revoked: { jti: string; exp: number }[] };

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  schemaReady ??= pool
    .query(`
      CREATE TABLE IF NOT EXISTS clypdat_desktop_auth (
        user_id TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
        version INTEGER NOT NULL DEFAULT 0,
        revoked JSONB NOT NULL DEFAULT '[]'::jsonb,
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

async function readDesktopAuthState(userId: string): Promise<DesktopAuthState | null> {
  await ensureSchema();
  const result = await pool.query<{ version: number; revoked: { jti: string; exp: number }[] }>(
    `SELECT COALESCE(a.version, 0) AS version, COALESCE(a.revoked, '[]'::jsonb) AS revoked
       FROM "user" u LEFT JOIN clypdat_desktop_auth a ON a.user_id = u.id WHERE u.id = $1`,
    [userId],
  );
  const row = result.rows[0];
  return row ? { version: row.version, revoked: row.revoked ?? [] } : null;
}

/** Signs out one desktop token: the app's own Sign out. */
export async function revokeDesktopToken(identity: DesktopIdentity): Promise<void> {
  await ensureSchema();
  const now = Math.floor(Date.now() / 1000);
  if (identity.tokenId) {
    // Expired entries are dropped on the way in, so the list never outgrows the
    // tokens that could still be presented.
    await pool.query(
      `INSERT INTO clypdat_desktop_auth (user_id, revoked) VALUES ($1, jsonb_build_array(jsonb_build_object('jti', $2::text, 'exp', $3::bigint)))
       ON CONFLICT (user_id) DO UPDATE SET
         revoked = COALESCE((SELECT jsonb_agg(entry) FROM jsonb_array_elements(clypdat_desktop_auth.revoked) entry WHERE (entry->>'exp')::bigint > $4), '[]'::jsonb)
           || jsonb_build_array(jsonb_build_object('jti', $2::text, 'exp', $3::bigint)),
         updated_at = NOW()`,
      [identity.userId, identity.tokenId, identity.expiresAt, now],
    );
  } else {
    // A token from before token ids can only be taken back with the rest.
    await revokeAllDesktopTokens(identity.userId);
    return;
  }
  await expireUserCache(identity.userId);
}

/** Signs out every desktop app on the account. */
export async function revokeAllDesktopTokens(userId: string): Promise<void> {
  await ensureSchema();
  await pool.query(
    `INSERT INTO clypdat_desktop_auth (user_id, version) VALUES ($1, 1)
     ON CONFLICT (user_id) DO UPDATE SET version = clypdat_desktop_auth.version + 1, revoked = '[]'::jsonb, updated_at = NOW()`,
    [userId],
  );
  await expireUserCache(userId);
}

function isRevoked(identity: DesktopIdentity, state: DesktopAuthState) {
  if (identity.version !== state.version) return true;
  return identity.tokenId !== null && state.revoked.some((entry) => entry.jti === identity.tokenId);
}

/**
 * Verifies the signed token, then checks its subject still exists and that it
 * has not been signed out. A signature failure, a deleted user and a revoked
 * token are all unauthenticated; a database failure is allowed to reach callers
 * as a service error instead.
 *
 * Account existence and revocation are checked together against Postgres.
 * This costs one read per authenticated request but remains correct when the
 * runtime cache is unavailable or has not received an invalidation yet.
 */
export async function verifyActiveDesktopToken(token: string) {
  const identity = verifyDesktopToken(token);
  if (!identity) return null;
  const state = await readDesktopAuthState(identity.userId);
  if (!state || isRevoked(identity, state)) return null;
  if (!(await readCached<boolean>(identity.userId, "exists"))) {
    console.info("[db] desktop token user check");
    // The same read fills the profile entry, so showing the name and picture in
    // the app costs no query of its own.
    const profile = await readProfile(identity.userId);
    if (!profile) return null;
    await Promise.all([writeCached(identity.userId, "exists", true), writeCached(identity.userId, "profile", profile)]);
  }
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

/** The bearer token on a desktop request, or an empty string. */
export function readBearer(request: Request) {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice("Bearer ".length).trim() : "";
}

export const desktopTokenLifetimeSeconds = tokenLifetimeSeconds;
