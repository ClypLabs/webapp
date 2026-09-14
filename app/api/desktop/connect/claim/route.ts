import { NextResponse } from "next/server";
import { claimPendingConnect } from "@/app/lib/desktop-connect-state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The fallback half of the desktop connect handoff (see
 * app/api/desktop/connect/route.ts and app/lib/desktop-connect-state.ts): the
 * desktop app polls this once its own local listener has given up waiting,
 * to claim a token that was already minted server-side for its `state`.
 *
 * No bearer/session auth here - `state` is 24 random bytes the desktop app
 * generated for this one attempt, and is itself the capability, the same
 * trust model the local-callback handoff already relies on.
 */
export async function GET(request: Request) {
  const state = new URL(request.url).searchParams.get("state");
  if (!state) return NextResponse.json({ error: "Missing state" }, { status: 400 });

  const pending = await claimPendingConnect(state);
  if (!pending) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ token: pending.token, expires_in: pending.expiresIn });
}
