import { NextResponse } from "next/server";
import { auth, unlinkSocialProvider } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Disconnecting a provider from /account. Better Auth's own unlinkAccount
// demands a session under session.freshAge (five minutes, set for account
// deletion), so anyone signed in longer than that was refused every time.
// This is the same removal the desktop app uses (app/api/desktop/social),
// authenticated by the session cookie instead of a desktop token.
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) return NextResponse.json({ error: "Sign in again to change your connections." }, { status: 401 });
    const body = (await request.json().catch(() => null)) as { provider?: unknown } | null;
    if (body?.provider !== "discord") return NextResponse.json({ error: "Unsupported social provider." }, { status: 400 });
    const result = await unlinkSocialProvider(session.user.id, "discord");
    if (result === "last-account") {
      return NextResponse.json(
        { error: "Discord is the only way left to sign in to this account, so it stays connected." },
        { status: 409 },
      );
    }
    return NextResponse.json({ unlinked: result === "unlinked" });
  } catch {
    return NextResponse.json({ error: "Discord could not be disconnected. Try again." }, { status: 503 });
  }
}
