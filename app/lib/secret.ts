import { hkdfSync } from "node:crypto";

// BETTER_AUTH_SECRET signs sessions, and everything this app signs or seals
// itself is keyed from it too. A missing secret used to fall back to a
// published development string, so a production deploy without the variable
// would have accepted desktop tokens anyone could forge. Production now refuses
// instead; development keeps the fallback so the site runs without a .env.
const DEVELOPMENT_SECRET = "development-only-change-me-before-deploying";

export function authSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("BETTER_AUTH_SECRET is not set");
  return DEVELOPMENT_SECRET;
}

export type KeyPurpose = "desktop-token" | "account-merge" | "xbox-oauth" | "xbox-seal" | "stats-ip";

const derived = new Map<string, Buffer>();

/**
 * One key per job, derived from the secret, so a value signed for one purpose
 * can never be replayed as another and the AES key is not also an HMAC key.
 * Cached per secret: the derivation is cheap, but it runs on every poll.
 */
export function purposeKey(purpose: KeyPurpose): Buffer {
  const secret = authSecret();
  const id = `${purpose}\0${secret}`;
  let key = derived.get(id);
  if (!key) {
    key = Buffer.from(hkdfSync("sha256", secret, "clypdat", `clypdat:${purpose}`, 32));
    derived.set(id, key);
  }
  return key;
}
