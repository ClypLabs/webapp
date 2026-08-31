import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { deleteXboxAccount } from "@/app/lib/xbox";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    await deleteXboxAccount(session.user.id);
    return NextResponse.json({ connected: false });
  } catch {
    return NextResponse.json({ error: "Xbox disconnect failed" }, { status: 503 });
  }
}
