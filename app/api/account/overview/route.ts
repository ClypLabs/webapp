import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getXboxAccount } from "@/app/lib/xbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Everything the account page needs to draw itself, in one round trip.
 *
 * The page used to wait for the client-side session to resolve, then fetch the
 * Xbox status and the account list off the back of it - three sequential hops
 * before anything but "Loading account…" was on screen. This reads the session
 * cookie server-side, so the page can ask for it the moment it mounts, in
 * parallel with the session request rather than behind it.
 *
 * Xbox *activity* is deliberately not here: it refreshes a Microsoft token and
 * calls the presence API, which is far slower than either of these queries and
 * would put that latency back in front of the first paint.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ user: null, xbox: { connected: false }, accounts: [] });

  try {
    const [account, accounts] = await Promise.all([
      getXboxAccount(session.user.id),
      auth.api.listUserAccounts({ headers: request.headers }),
    ]);
    return NextResponse.json({
      user: { id: session.user.id, name: session.user.name, email: session.user.email },
      xbox: { connected: Boolean(account), account },
      accounts: accounts.map(({ id, providerId }) => ({ id, providerId })),
    });
  } catch {
    return NextResponse.json({ error: "Account details are unavailable" }, { status: 503 });
  }
}
