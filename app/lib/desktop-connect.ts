import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { pool } from "@/app/lib/auth";

// Linking the desktop app to an account. The app opens
// /api/desktop/connect?redirect_uri=http://127.0.0.1:<port>/callback/&state=..&code_challenge=..
// in the browser; the site asks the signed-in person to confirm on
// /account/connect, and only that confirmation - a same-origin POST - issues
// anything.
//
// Anything a browser can be sent to must not hand out a token by itself: a
// page that navigates a signed-in visitor here would otherwise get one minted
// for their account. The old flow did exactly that, and then gave the token to
// whoever presented the (attacker-chosen) state on /claim.
//
// With a code_challenge the loopback redirect carries only a one-time code.
// The app swaps it for the token at /api/desktop/token with the verifier that
// never left the PC, so the token is not in browser history and a code seen by
// anyone else is useless. Apps from before this send no challenge; after the
// confirmation they still get the token on the redirect, as they always did.

export type ConnectRequest = { redirectUri: string; state: string; codeChallenge: string | null };

const STATE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function isLocalCallback(value: string) {
  try {
    const uri = new URL(value);
    return uri.protocol === "http:" && (uri.hostname === "127.0.0.1" || uri.hostname === "localhost") && uri.pathname === "/callback/" && !uri.search && !uri.hash && !uri.username && !uri.password;
  } catch {
    return false;
  }
}

/** Reads and checks the parameters the desktop app sends, from a query string or a form. */
export function readConnectRequest(values: { get(name: string): string | null | FormDataEntryValue }): ConnectRequest | null {
  const text = (name: string) => {
    const value = values.get(name);
    return typeof value === "string" ? value : null;
  };
  const redirectUri = text("redirect_uri");
  const state = text("state");
  const codeChallenge = text("code_challenge");
  const method = text("code_challenge_method");
  if (!redirectUri || !isLocalCallback(redirectUri)) return null;
  if (!state || !STATE_PATTERN.test(state)) return null;
  if (codeChallenge !== null && (!CHALLENGE_PATTERN.test(codeChallenge) || method !== "S256")) return null;
  return { redirectUri, state, codeChallenge };
}

export function connectSearchParams(request: ConnectRequest) {
  const params = new URLSearchParams({ desktop_connect: "1", redirect_uri: request.redirectUri, state: request.state });
  if (request.codeChallenge) {
    params.set("code_challenge", request.codeChallenge);
    params.set("code_challenge_method", "S256");
  }
  return params;
}

// Six characters both the site and the app derive from the state, shown on
// each so the person can see the request in front of them came from the app
// they just pressed Link in. The desktop app computes the same thing
// (ClypDatAccountActivityService.PairingCode); keep the two in step.
const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function pairingCode(state: string) {
  const digest = createHash("sha256").update(`clypdat-desktop-connect:${state}`).digest();
  let code = "";
  for (let index = 0; index < 6; index++) code += PAIRING_ALPHABET[digest[index] % PAIRING_ALPHABET.length];
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

const CODE_TTL_SECONDS = 60;

type PendingCode = { userId: string; challenge: string };

let schemaReady: Promise<void> | null = null;

async function ensureSchema() {
  schemaReady ??= pool.query(`CREATE TABLE IF NOT EXISTS clypdat_desktop_connect (
    code_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
  )`).then(() => undefined).catch((error) => {
    schemaReady = null;
    throw error;
  });
  await schemaReady;
}

const codeHash = (code: string) => createHash("sha256").update(code).digest("hex");

export async function issueConnectCode(userId: string, challenge: string): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  await ensureSchema();
  await pool.query("DELETE FROM clypdat_desktop_connect WHERE expires_at <= NOW()");
  await pool.query(
    "INSERT INTO clypdat_desktop_connect (code_hash, user_id, challenge, expires_at) VALUES ($1, $2, $3, NOW() + $4 * INTERVAL '1 second')",
    [codeHash(code), userId, challenge, CODE_TTL_SECONDS],
  );
  return code;
}

/**
 * Single use: removed on the first attempt whether or not the verifier fits,
 * so a code cannot be guessed at. Returns the user the code was issued to.
 */
export async function redeemConnectCode(code: string, verifier: string): Promise<string | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(code) || !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return null;
  await ensureSchema();
  // DELETE RETURNING consumes the code atomically across function instances.
  // A cache get followed by delete lets simultaneous exchanges both succeed.
  const result = await pool.query<PendingCode>(
    'DELETE FROM clypdat_desktop_connect WHERE code_hash = $1 AND expires_at > NOW() RETURNING user_id AS "userId", challenge',
    [codeHash(code)],
  );
  const pending = result.rows[0];
  if (!pending) return null;
  const actual = Buffer.from(createHash("sha256").update(verifier).digest("base64url"));
  const expected = Buffer.from(pending.challenge);
  return actual.length === expected.length && timingSafeEqual(actual, expected) ? pending.userId : null;
}

/** A POST that came from a page on this site, as opposed to one another site's form sent. */
export function isSameOriginPost(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin && request.headers.get("sec-fetch-site") === "same-origin";
}
