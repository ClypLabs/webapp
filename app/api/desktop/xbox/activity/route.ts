import { NextResponse } from "next/server";
import { getXboxAccount, getXboxActivity } from "@/app/lib/xbox";
import { verifyDesktopToken } from "@/app/lib/desktop-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const value = request.headers.get("authorization");
  const token = value?.startsWith("Bearer ") ? value.slice("Bearer ".length).trim() : "";
  const identity = verifyDesktopToken(token);
  if (!identity) return NextResponse.json({ error: "Desktop sign-in expired" }, { status: 401 });
  try {
    const account = await getXboxAccount(identity.userId);
    const activity = account ? await getXboxActivity(identity.userId) : null;
    return NextResponse.json({ connected: Boolean(account), account, activity });
  } catch {
    return NextResponse.json({ error: "Xbox activity is temporarily unavailable" }, { status: 503 });
  }
}
