import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { REFRESH_COOLDOWN_SECONDS, discordRefreshCooldown, refreshDiscordProfile } from "@/app/lib/discord-profile";
import { getDesktopProfile } from "@/app/lib/desktop-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// How long until the Refresh button works again, so /account can show the
// countdown after a reload rather than a button that only says no when pressed.
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in again to refresh your profile." }, { status: 401 });
  try {
    return NextResponse.json({ retryAfter: await discordRefreshCooldown(session.user.id) });
  } catch {
    return NextResponse.json({ retryAfter: 0 });
  }
}

// The Refresh button on /account: pulls the Discord name and picture now
// instead of at the next 30-minute check. The app picks the change up on its
// next poll, so this updates both. Once per REFRESH_COOLDOWN_SECONDS, shared
// with the app's own Refresh button.
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in again to refresh your profile." }, { status: 401 });
  const result = await refreshDiscordProfile(session.user.id, true);
  if (result === "cooldown") {
    const retryAfter = await discordRefreshCooldown(session.user.id).catch(() => REFRESH_COOLDOWN_SECONDS);
    return NextResponse.json(
      { error: "Refreshed recently. Try again when the timer runs out.", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }
  if (result === "unavailable") {
    return NextResponse.json({ error: "Discord did not answer. Try again later.", retryAfter: await discordRefreshCooldown(session.user.id).catch(() => 0) }, { status: 503 });
  }
  const profile = await getDesktopProfile(session.user.id);
  return NextResponse.json({ result, name: profile?.name ?? null, image: profile?.image ?? null, retryAfter: REFRESH_COOLDOWN_SECONDS });
}
