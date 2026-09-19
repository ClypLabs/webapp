import { NextResponse } from "next/server";
import { readBearer, revokeDesktopToken, verifyActiveDesktopToken } from "@/app/lib/desktop-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The desktop app's Sign out: this token stops working here, not only on the PC. */
export async function POST(request: Request) {
  try {
    const identity = await verifyActiveDesktopToken(readBearer(request));
    // Already expired or revoked is the outcome the app wanted.
    if (!identity) return new NextResponse(null, { status: 204 });
    await revokeDesktopToken(identity);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Sign-out could not be recorded" }, { status: 503 });
  }
}
