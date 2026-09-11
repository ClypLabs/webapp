import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { MERGE_COOKIE, MERGE_TICKET_SECONDS, createMergeTicket, mergeAccounts, readMergeTicket } from "@/app/lib/account-merge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/account/merge",
};

/**
 * The two halves of a merge (see account-merge.ts). "start" remembers the
 * account signed in now; after the person signs into the other one, "finish"
 * folds the Discord-only account of the pair into the other.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Sign in again to merge your accounts." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { step?: unknown } | null;

  if (body?.step === "start") {
    const response = NextResponse.json({ started: true });
    response.cookies.set(MERGE_COOKIE, createMergeTicket(session.user.id), { ...cookieOptions, maxAge: MERGE_TICKET_SECONDS });
    return response;
  }

  if (body?.step === "finish") {
    const firstUserId = readMergeTicket(request.cookies.get(MERGE_COOKIE)?.value);
    if (!firstUserId) {
      return NextResponse.json({ error: "The merge took longer than 10 minutes, so it was cancelled. Start it again." }, { status: 410 });
    }
    try {
      const result = await mergeAccounts(firstUserId, session.user.id);
      const response = result.kind === "merged"
        ? NextResponse.json({ merged: true, movedXbox: result.movedXbox, signInAgain: result.removedUserId === session.user.id })
        : result.kind === "same-account"
          ? NextResponse.json({ error: "You signed back into the same account. Sign in with the other one to merge them." }, { status: 409 })
          : NextResponse.json({ error: result.message }, { status: 409 });
      // One attempt per ticket; the same account twice keeps it so the person
      // can go round again with the right sign-in.
      if (result.kind !== "same-account") response.cookies.set(MERGE_COOKIE, "", { ...cookieOptions, maxAge: 0 });
      return response;
    } catch {
      return NextResponse.json({ error: "The accounts could not be merged. Nothing was changed; try again." }, { status: 503 });
    }
  }

  return NextResponse.json({ error: "Unknown merge step." }, { status: 400 });
}
