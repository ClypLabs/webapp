import { NextResponse } from "next/server";
import { redeemConnectCode } from "@/app/lib/desktop-connect";
import { createDesktopToken, desktopTokenLifetimeSeconds } from "@/app/lib/desktop-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The desktop app's half of linking: the one-time code from the loopback
 * redirect, plus the verifier only the app holds, for a desktop token. See
 * app/lib/desktop-connect.ts.
 */
export async function POST(request: Request) {
  if (request.headers.has("origin")) return NextResponse.json({ error: "Browser requests are not accepted" }, { status: 403 });
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return NextResponse.json({ error: "Expected application/json" }, { status: 415 });
  }
  const body = (await request.json().catch(() => null)) as { code?: unknown; code_verifier?: unknown } | null;
  if (typeof body?.code !== "string" || typeof body.code_verifier !== "string") {
    return NextResponse.json({ error: "Missing code or code_verifier" }, { status: 400 });
  }
  try {
    const userId = await redeemConnectCode(body.code, body.code_verifier);
    if (!userId) return NextResponse.json({ error: "The link code is invalid or has expired. Press Link again." }, { status: 401 });
    return NextResponse.json(
      { token: await createDesktopToken(userId), expires_in: desktopTokenLifetimeSeconds },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Sign-in is temporarily unavailable. Press Link again." }, { status: 503 });
  }
}
