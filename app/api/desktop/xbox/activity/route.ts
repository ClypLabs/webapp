import { NextResponse } from "next/server";
import { deleteXboxAccount, getXboxAccount, getXboxActivity } from "@/app/lib/xbox";
import { getDesktopProfile, verifyActiveDesktopToken, type DesktopProfile } from "@/app/lib/desktop-token";
import { getLinkedSocialProviders } from "@/app/lib/auth";
import { refreshDiscordProfile } from "@/app/lib/discord-profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The app's account card shows a name and picture only for accounts with
// Discord linked - the site says so at sign-in. The picture must be Discord's:
// accounts first made with Google (sign-in since removed) can still hold a
// Google photo until their next Discord sign-in replaces it.
function discordProfile(profile: DesktopProfile | null) {
  if (!profile) return null;
  let image: string | null = null;
  try {
    if (profile.image && new URL(profile.image).hostname === "cdn.discordapp.com") image = profile.image;
  } catch {
    // Not a URL; show the name alone.
  }
  return { name: profile.name, image };
}

export async function GET(request: Request) {
  const value = request.headers.get("authorization");
  const token = value?.startsWith("Bearer ") ? value.slice("Bearer ".length).trim() : "";
  try {
    const identity = await verifyActiveDesktopToken(token);
    if (!identity) return NextResponse.json({ error: "Desktop sign-in expired" }, { status: 401 });
    let providers = await getLinkedSocialProviders(identity.userId);
    // Discord name and picture: rechecked at most every 30 minutes, or now
    // when the app's Refresh button asks with ?profile=refresh. A change
    // expires the account cache, so the reads below pick it up.
    if (providers.includes("discord")) {
      const force = new URL(request.url).searchParams.get("profile") === "refresh";
      if ((await refreshDiscordProfile(identity.userId, force)) === "changed") providers = await getLinkedSocialProviders(identity.userId);
    }
    const account = await getXboxAccount(identity.userId);
    const profile = providers.includes("discord") ? discordProfile(await getDesktopProfile(identity.userId)) : null;
    if (!account) return NextResponse.json({ connected: false, account: null, activity: null, providers, profile });
    const activity = await getXboxActivity(identity.userId);
    return NextResponse.json({ connected: true, account, activity, providers, profile });
  } catch {
    return NextResponse.json({ error: "Xbox activity is temporarily unavailable" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const value = request.headers.get("authorization");
  const token = value?.startsWith("Bearer ") ? value.slice("Bearer ".length).trim() : "";
  try {
    const identity = await verifyActiveDesktopToken(token);
    if (!identity) return NextResponse.json({ error: "Desktop sign-in expired" }, { status: 401 });
    await deleteXboxAccount(identity.userId);
    return NextResponse.json({ connected: false });
  } catch {
    return NextResponse.json({ error: "Xbox disconnect failed" }, { status: 503 });
  }
}
