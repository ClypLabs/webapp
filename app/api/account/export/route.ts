import { NextResponse } from "next/server";
import { auth, pool } from "@/app/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GDPR Article 15 (access) and Article 20 (portability): everything the account
 * service holds about the signed-in user, as one machine-readable JSON file.
 *
 * Deliberately excluded, because they are credentials rather than personal
 * data about the subject, and handing them back over HTTP would turn an
 * export into a token-exfiltration route: session tokens, provider access and
 * refresh tokens, the password hash, and the encrypted Xbox refresh token.
 * Article 15(4) is the basis - the right to a copy must not adversely affect
 * the rights of others, and these secrets authenticate against Google,
 * Discord and Microsoft as well as against us.
 */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const userId = session.user.id;

  try {
    const [user, accounts, sessions, xbox] = await Promise.all([
      pool.query(
        'SELECT id, name, email, "emailVerified", image, "createdAt", "updatedAt" FROM "user" WHERE id = $1',
        [userId],
      ),
      pool.query(
        'SELECT id, "providerId", "accountId", "createdAt", "updatedAt", "accessTokenExpiresAt", scope FROM "account" WHERE "userId" = $1 ORDER BY "createdAt"',
        [userId],
      ),
      pool.query(
        'SELECT id, "createdAt", "updatedAt", "expiresAt", "ipAddress", "userAgent" FROM "session" WHERE "userId" = $1 ORDER BY "createdAt"',
        [userId],
      ),
      pool.query(
        "SELECT gamertag, xuid, console_name, token_expires_at, created_at, updated_at FROM clypdat_xbox_account WHERE user_id = $1",
        [userId],
      ).catch(() => ({ rows: [] as unknown[] })),
    ]);

    const payload = {
      export: {
        generatedAt: new Date().toISOString(),
        controller: "ClypLabs",
        contact: "hi@clypdat.xyz",
        subject: userId,
        basis: "GDPR Article 15 (right of access) and Article 20 (data portability)",
        note: "Credentials are omitted: session tokens, provider access and refresh tokens, the password hash, and the encrypted Xbox refresh token. Recordings made with ClypDat are stored only on your own device and are never sent to this service.",
      },
      account: user.rows[0] ?? null,
      signInMethods: accounts.rows,
      sessions: sessions.rows,
      xboxConnection: xbox.rows[0] ?? null,
    };

    // Content-Disposition rather than a plain JSON response: the account page
    // links straight at this route, and without it the browser renders the
    // export in a tab instead of saving the file the user asked for.
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="clypdat-account-export-${new Date().toISOString().slice(0, 10)}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Your data export could not be generated. Try again shortly." }, { status: 503 });
  }
}
