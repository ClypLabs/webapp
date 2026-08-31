import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createDesktopToken, desktopTokenLifetimeSeconds } from "@/app/lib/desktop-token";
import { getXboxAccount } from "@/app/lib/xbox";

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
    const callback = new URL(redirectUri);
    callback.searchParams.set("state", state);
    callback.searchParams.set("error", "login-required");
    return NextResponse.redirect(callback);
  }

  const callback = new URL(redirectUri);
  callback.searchParams.set("state", state);
  if (!await getXboxAccount(session.user.id)) {
    callback.searchParams.set("error", "xbox-not-linked");
    return NextResponse.redirect(callback);
  }
  callback.searchParams.set("token", createDesktopToken(session.user.id));
  callback.searchParams.set("expires_in", String(desktopTokenLifetimeSeconds));
  return NextResponse.redirect(callback);
}
