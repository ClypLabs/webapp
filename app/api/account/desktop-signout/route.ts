import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { revokeAllDesktopTokens } from "@/app/lib/desktop-token";
import { isSameOriginPost } from "@/app/lib/desktop-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// "Sign out ClypDat on all PCs" on /account: every desktop token issued for
// this account stops working at its next request.
export async function POST(request: Request) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Cross-site request refused" }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in again to sign out your PCs." }, { status: 401 });
  try {
    await revokeAllDesktopTokens(session.user.id);
    return NextResponse.json({ signedOut: true });
  } catch {
    return NextResponse.json({ error: "Your PCs could not be signed out. Try again." }, { status: 503 });
  }
}
