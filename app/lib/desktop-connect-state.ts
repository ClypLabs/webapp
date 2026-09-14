import { getCache } from "@vercel/functions";

// Bridges a desktop /api/desktop/connect handoff across a sign-in detour.
// The desktop app opens a local listener and waits for the browser to redirect
// back to it with a token - but if the browser had to detour through signing
// in first (Discord's own consent screen, 2FA), that round trip can outlast
// the listener's own window. /api/desktop/connect stashes the token here the
// moment a session is found, keyed by the attempt's own `state`, so the
// desktop app can claim it directly (app/api/desktop/connect/claim/route.ts)
// instead of the token being lost and the user having to notice and retry.
//
// No session check on the claim side: `state` is 24 random bytes minted by
// the desktop app for this one attempt, and that unguessability is the same
// trust model the local-callback handoff itself already relies on.
const cache = () => getCache({ namespace: "clypdat-account" });

const STASH_TTL_SECONDS = 15 * 60;

export type PendingConnect = { token: string; expiresIn: number };

function key(state: string) {
  return `connect-state:${state}`;
}

export async function storePendingConnect(state: string, token: string, expiresIn: number): Promise<void> {
  try {
    await cache().set(key(state), { token, expiresIn } satisfies PendingConnect, {
      ttl: STASH_TTL_SECONDS,
      tags: [],
      name: "desktop-connect-state",
    });
  } catch (error) {
    console.error("Desktop connect: stashing the token failed", error);
  }
}

// Single-use: claimed once, then removed, so a retried request from the
// desktop app cannot replay the same token twice.
export async function claimPendingConnect(state: string): Promise<PendingConnect | null> {
  try {
    const value = await cache().get(key(state));
    if (value === null || value === undefined) return null;
    await cache().delete(key(state));
    return value as PendingConnect;
  } catch {
    return null;
  }
}
