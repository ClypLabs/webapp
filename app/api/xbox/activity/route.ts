import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { readCached, writeCached } from "@/app/lib/account-cache";
import { getXboxActivity, type XboxActivity } from "@/app/lib/xbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The /account page asks once a minute while it is visible and in use. The
// page's own idle pause is a courtesy, not a limit - anything can call this
// directly - so the limit is here: however often it is called, each user gets
// at most one real Xbox lookup per ACTIVITY_REUSE_SECONDS, and the rest are
// answered from the runtime cache. The session check behind it comes from
// Better Auth's cookie cache (auth.ts), not the database.
const ACTIVITY_REUSE_SECONDS = 50;

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const userId = session.user.id;
  try {
    const recent = await readCached<{ activity: XboxActivity | null }>(userId, "web-xbox-activity");
    if (recent) return NextResponse.json({ connected: Boolean(recent.activity), activity: recent.activity });
    const activity = await getXboxActivity(userId);
    await writeCached(userId, "web-xbox-activity", { activity }, ACTIVITY_REUSE_SECONDS);
    return NextResponse.json({ connected: Boolean(activity), activity });
  } catch {
    return NextResponse.json({ error: "Xbox activity is temporarily unavailable" }, { status: 503 });
  }
}
