import { auth } from "@/app/lib/auth";

// Who may use /admin. There is no role in the auth schema; the allow-list is the
// Better Auth user ids in ADMIN_USER_IDS (comma-separated), so granting or
// revoking admin is an env change, and nobody can grant themselves anything
// through the site.
//
// What an admin can do reaches every installed app, so the checks here are
// stricter than the rest of the site:
// - the session is read from the database every time, skipping the five-minute
//   signed cookie cache, so signing out or revoking sessions ends admin access
//   at once instead of up to five minutes later;
// - publishing needs a sign-in from the last ADMIN_WRITE_MAX_AGE_MS, so a
//   session left signed in on some machine for weeks cannot publish.

export const ADMIN_WRITE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export function adminUserIds(): Set<string> {
  return new Set(
    (process.env.ADMIN_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export type AdminSession = { id: string; signedInAt: number };

/** The signed-in admin, or null for anyone else (signed out included). */
export async function currentAdmin(headers: Headers): Promise<AdminSession | null> {
  const allowed = adminUserIds();
  if (allowed.size === 0) return null;
  const session = await auth.api.getSession({ headers, query: { disableCookieCache: true } });
  const id = session?.user?.id;
  if (!id || !allowed.has(id)) return null;
  const created = session.session?.createdAt ? new Date(session.session.createdAt).getTime() : Number.NaN;
  return { id, signedInAt: Number.isNaN(created) ? 0 : created };
}

export async function currentAdminId(headers: Headers): Promise<string | null> {
  return (await currentAdmin(headers))?.id ?? null;
}

export function canPublish(admin: AdminSession, now = Date.now()): boolean {
  return now - admin.signedInAt <= ADMIN_WRITE_MAX_AGE_MS;
}

export function staleSignIn(): Response {
  return Response.json(
    { error: "Sign in again to publish - admin changes need a sign-in from the last 12 hours." },
    { status: 401 },
  );
}

/** One line per change in the function logs: who, what, which notice. */
export function auditAdmin(admin: AdminSession, action: string, noticeId: string, detail = ""): void {
  console.info(`[admin] at=${new Date().toISOString()} ${action} notice=${noticeId} by=${admin.id}${detail ? ` ${detail}` : ""}`);
}
