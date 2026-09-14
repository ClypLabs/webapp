import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createDesktopToken, desktopTokenLifetimeSeconds } from "@/app/lib/desktop-token";
import { storePendingConnect } from "@/app/lib/desktop-connect-state";

export const runtime = "nodejs";

function isLocalCallback(value: string | null) {
  if (!value) return false;
  try {
    const uri = new URL(value);
    return (uri.protocol === "http:" && (uri.hostname === "127.0.0.1" || uri.hostname === "localhost") && uri.pathname === "/callback/");
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUri = url.searchParams.get("redirect_uri");
  const state = url.searchParams.get("state");
  if (!isLocalCallback(redirectUri) || !state || state.length > 200) {
    return NextResponse.json({ error: "Invalid desktop callback" }, { status: 400 });
  }
  if (!redirectUri) return NextResponse.json({ error: "Invalid desktop callback" }, { status: 400 });

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    const account = new URL("/account", url.origin);
    account.searchParams.set("desktop_connect", "1");
    account.searchParams.set("redirect_uri", redirectUri);
    account.searchParams.set("state", state);
    return NextResponse.redirect(account);
  }

  const token = createDesktopToken(session.user.id);
  // Stashed the moment a session is found, before the redirect below - so the
  // token is claimable (see app/api/desktop/connect/claim/route.ts) even if
  // this redirect never reaches the desktop app's local listener, whose own
  // window can run out first on a slow or interrupted round trip.
  await storePendingConnect(state, token, desktopTokenLifetimeSeconds);

  const callback = new URL(redirectUri);
  callback.searchParams.set("state", state);
  callback.searchParams.set("token", token);
  callback.searchParams.set("expires_in", String(desktopTokenLifetimeSeconds));
  return NextResponse.redirect(callback);
}
