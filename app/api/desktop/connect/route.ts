import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { connectSearchParams, isSameOriginPost, issueConnectCode, readConnectRequest } from "@/app/lib/desktop-connect";
import { createDesktopToken, desktopTokenLifetimeSeconds } from "@/app/lib/desktop-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Where the desktop app's Link button lands. Never issues anything itself: it
// only passes the request on to the confirmation page (see desktop-connect.ts
// for why).
export async function GET(request: Request) {
  const url = new URL(request.url);
  const connect = readConnectRequest(url.searchParams);
  if (!connect) return NextResponse.json({ error: "Invalid desktop callback" }, { status: 400 });
  const confirm = new URL("/account/connect", url.origin);
  confirm.search = connectSearchParams(connect).toString();
  return NextResponse.redirect(confirm, 303);
}

// The confirmation page's Link / Cancel buttons.
export async function POST(request: Request) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Cross-site request refused" }, { status: 403 });
  const form = await request.formData().catch(() => null);
  const connect = form ? readConnectRequest(form) : null;
  if (!form || !connect) return NextResponse.json({ error: "Invalid desktop callback" }, { status: 400 });

  const callback = new URL(connect.redirectUri);
  callback.searchParams.set("state", connect.state);

  if (form.get("decision") !== "link") {
    callback.searchParams.set("error", "access_denied");
    return NextResponse.redirect(callback, 303);
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    const account = new URL("/account", new URL(request.url).origin);
    account.search = connectSearchParams(connect).toString();
    return NextResponse.redirect(account, 303);
  }

  if (connect.codeChallenge) {
    callback.searchParams.set("code", await issueConnectCode(session.user.id, connect.codeChallenge));
  } else {
    // Apps from before the code exchange read the token off the redirect.
    callback.searchParams.set("token", await createDesktopToken(session.user.id));
    callback.searchParams.set("expires_in", String(desktopTokenLifetimeSeconds));
  }
  return NextResponse.redirect(callback, 303);
}
