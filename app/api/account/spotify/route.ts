import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { isSameOriginPost } from "@/app/lib/desktop-connect";
import { requestSpotifyDisconnect } from "@/app/lib/spotify-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Disconnect Spotify from /account. The Spotify token only exists in the
// desktop app, so this leaves a request the app carries out on its next
// check-in (app/lib/spotify-status.ts); the page shows it disconnected now.
export async function POST(request: Request) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Cross-site request refused" }, { status: 403 });
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Sign in again to change your connections." }, { status: 401 });
    const status = await requestSpotifyDisconnect(session.user.id);
    return NextResponse.json({ spotify: status });
  } catch {
    return NextResponse.json({ error: "Spotify could not be disconnected. Try again." }, { status: 503 });
  }
}
