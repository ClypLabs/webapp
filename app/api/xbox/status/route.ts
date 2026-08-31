import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getXboxAccount } from "@/app/lib/xbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ connected: false }, { status: 401 });
  try {
    const account = await getXboxAccount(session.user.id);
    return NextResponse.json({ connected: Boolean(account), account });
  } catch {
    return NextResponse.json({ error: "Xbox status is unavailable" }, { status: 503 });
  }
}
