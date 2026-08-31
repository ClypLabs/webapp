import { createHmac, timingSafeEqual } from "node:crypto";

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

export const desktopTokenLifetimeSeconds = tokenLifetimeSeconds;
