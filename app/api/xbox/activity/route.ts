import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getXboxActivity } from "@/app/lib/xbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    const activity = await getXboxActivity(session.user.id);
    return NextResponse.json({ connected: Boolean(activity), activity });
  } catch {
    return NextResponse.json({ error: "Xbox activity is temporarily unavailable" }, { status: 503 });
  }
}
