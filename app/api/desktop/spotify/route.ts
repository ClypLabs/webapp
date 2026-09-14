import { NextResponse } from "next/server";
import { setSpotifyConnected } from "@/app/lib/spotify-status";
import { verifyActiveDesktopToken } from "@/app/lib/desktop-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readIdentity(request: Request) {
  const value = request.headers.get("authorization");
  const token = value?.startsWith("Bearer ") ? value.slice("Bearer ".length).trim() : "";
  return verifyActiveDesktopToken(token);
}

/** The desktop app reports its own Spotify connect/disconnect here so the account page can show it. */
export async function POST(request: Request) {
  try {
    const identity = await readIdentity(request);
    if (!identity) return NextResponse.json({ error: "Desktop sign-in expired" }, { status: 401 });
    const body = (await request.json().catch(() => null)) as { connected?: unknown } | null;
    if (typeof body?.connected !== "boolean") return NextResponse.json({ error: "Missing connected" }, { status: 400 });
    await setSpotifyConnected(identity.userId, body.connected);
    return NextResponse.json({ connected: body.connected });
  } catch {
    return NextResponse.json({ error: "Spotify status update failed" }, { status: 503 });
  }
}
