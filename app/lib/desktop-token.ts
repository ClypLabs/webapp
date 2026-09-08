import { createHmac, timingSafeEqual } from "node:crypto";
import { pool } from "@/app/lib/auth";

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
 */
export async function verifyActiveDesktopToken(token: string) {
  const identity = verifyDesktopToken(token);
  if (!identity) return null;
  const result = await pool.query('SELECT 1 FROM "user" WHERE id = $1', [identity.userId]);
  return result.rowCount ? identity : null;
}

export const desktopTokenLifetimeSeconds = tokenLifetimeSeconds;
