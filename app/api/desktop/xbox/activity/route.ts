import { NextResponse } from "next/server";
import { deleteXboxAccount, getXboxAccount, getXboxActivity } from "@/app/lib/xbox";
import { verifyDesktopToken } from "@/app/lib/desktop-token";
import { getLinkedSocialProviders } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const value = request.headers.get("authorization");
  const token = value?.startsWith("Bearer ") ? value.slice("Bearer ".length).trim() : "";
  const identity = verifyDesktopToken(token);
  if (!identity) return NextResponse.json({ error: "Desktop sign-in expired" }, { status: 401 });
  try {
    const account = await getXboxAccount(identity.userId);
    const providers = await getLinkedSocialProviders(identity.userId);
    if (!account) return NextResponse.json({ connected: false, account: null, activity: null, providers });
    const activity = await getXboxActivity(identity.userId);
    return NextResponse.json({ connected: true, account, activity, providers });
  } catch {
    return NextResponse.json({ error: "Xbox activity is temporarily unavailable" }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const value = request.headers.get("authorization");
  const token = value?.startsWith("Bearer ") ? value.slice("Bearer ".length).trim() : "";
  const identity = verifyDesktopToken(token);
  if (!identity) return NextResponse.json({ error: "Desktop sign-in expired" }, { status: 401 });
  try {
    await deleteXboxAccount(identity.userId);
    return NextResponse.json({ connected: false });
  } catch {
    return NextResponse.json({ error: "Xbox disconnect failed" }, { status: 503 });
  }
}
