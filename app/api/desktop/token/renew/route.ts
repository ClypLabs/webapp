import { NextResponse } from "next/server";
import {
  createDesktopToken,
  desktopTokenLifetimeSeconds,
  readBearer,
  revokeAllDesktopTokens,
  revokeDesktopToken,
  verifyActiveDesktopToken,
} from "@/app/lib/desktop-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Swaps a desktop token that is still good for a fresh 30-day one. The app
 * asks in its last week, so staying signed in no longer ends silently a month
 * after linking. The old token is signed out as the new one is issued; a
 * sign-out from the site (revoked, or every PC signed out) still stops the
 * app, because the old token has to pass the same check as any other request.
 */
export async function POST(request: Request) {
  // The app never sends Origin; a page trying to use a leaked token would.
  if (request.headers.has("origin")) return NextResponse.json({ error: "Browser requests are not accepted" }, { status: 403 });
  try {
    const identity = await verifyActiveDesktopToken(readBearer(request));
    if (!identity) return NextResponse.json({ error: "Desktop sign-in expired" }, { status: 401 });
    let token: string;
    if (identity.tokenId) {
      token = await createDesktopToken(identity.userId);
      await revokeDesktopToken(identity);
    } else {
      // A token from before token ids can only be signed out with the rest of
      // the account's, which bumps the version - so do that first, or the new
      // token would carry the old version and be refused.
      await revokeAllDesktopTokens(identity.userId);
      token = await createDesktopToken(identity.userId);
    }
    return NextResponse.json(
      { token, expires_in: desktopTokenLifetimeSeconds },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Sign-in renewal is temporarily unavailable" }, { status: 503 });
  }
}
