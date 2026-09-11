import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { refreshDiscordProfile } from "@/app/lib/discord-profile";
import { getDesktopProfile } from "@/app/lib/desktop-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Refresh button on /account: pulls the Discord name and picture now
// instead of at the next 30-minute check. The app picks the change up on its
// next poll, so this updates both.
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in again to refresh your profile." }, { status: 401 });
  const result = await refreshDiscordProfile(session.user.id, true);
  if (result === "unavailable") {
    return NextResponse.json({ error: "Discord did not answer. Try again in a moment." }, { status: 503 });
  }
  const profile = await getDesktopProfile(session.user.id);
  return NextResponse.json({ result, name: profile?.name ?? null, image: profile?.image ?? null });
}
