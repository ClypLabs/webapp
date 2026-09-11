import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { expireUserCache, readCached, writeCached } from "@/app/lib/account-cache";

const databaseUrl = process.env.DATABASE_URL;
const authSecret = process.env.BETTER_AUTH_SECRET;

// The fallback keeps `next build` useful before Vercel variables are pulled
export const pool = new Pool({
  connectionString: databaseUrl ?? "postgresql://localhost/clypdat",
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
  ssl: databaseUrl ? { rejectUnauthorized: false } : undefined,
});

// Discord is the social sign-in. Google was dropped in September 2026, but an
// account made with Google has no password and email reset is not set up, so
// without Google its owner is locked out - and signing in with Discord instead
// makes a second, empty account unless the two emails match. Google therefore
// stays for signing in only: it never creates an account, and /account asks a
// Google account to connect Discord (or merge the duplicate, account-merge.ts).
const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          disableSignUp: true,
        },
      }
    : {}),
  ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
    ? {
        discord: {
          clientId: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET,
          // The desktop app shows the Discord name and picture, so each
          // Discord sign-in refreshes them: a changed avatar would otherwise
          // leave a dead CDN link behind. It also replaces a display name set
          // on /account, which says so.
          overrideUserInfoOnSignIn: true,
          // Better Auth defaults Discord to prompt=none, which approves an app
          // the account authorised before without waiting, so the consent
          // screen flashes past with its button already loading.
          prompt: "consent" as const,
        },
      }
    : {}),
};

export const auth = betterAuth({
  database: pool,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  basePath: "/api/auth",
  secret: authSecret ?? "development-only-change-me-before-deploying",
  trustedOrigins: [
    "http://localhost:3000",
    "https://clypdat.xyz",
    "https://www.clypdat.xyz",
    "https://app.clypdat.xyz",
  ],
  emailAndPassword: {
    enabled: true,
    // Turn this on when a transactional email provider is configured. Until
    // then, accounts can be tested without pretending verification was sent.
    requireEmailVerification: false,
  },
  session: {
    // Destructive account changes need a recent sign-in unless the current
    // password is supplied to Better Auth's delete-user endpoint.
    freshAge: 60 * 5,
    // Every signed-in request checks the session, and without this each check
    // was a database query - the /account page's Xbox poll alone kept Neon
    // from ever reaching its five idle minutes. A signed cookie answers for up
    // to five minutes instead. Signing out clears it at once; a session
    // revoked elsewhere can keep working in that browser for up to five
    // minutes.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  user: {
    deleteUser: {
      enabled: true,
    },
  },
  account: {
    accountLinking: {
      // Linking happens only from a signed-in session through linkSocial, and
      // the person still completes Discord's own login, so a Discord account
      // on another email is theirs to add. This is what lets the accounts made
      // with Google (sign-in since removed) move to Discord and keep their Xbox
      // link. Matching by email at sign-in is unaffected and still needs the
      // same address, so nobody can claim an account by its email.
      allowDifferentEmails: true,
      // An email account that links Discord takes its name and picture, the
      // same as signing up with Discord would have. Email is never changed.
      updateUserInfoOnLink: true,
    },
  },
  socialProviders,
  // Every account change the website makes goes through Better Auth, so these
  // are where the desktop poll's cached account data is dropped: a deleted
  // user, or a provider linked or unlinked from /account. See account-cache.ts.
  databaseHooks: {
    user: {
      delete: { after: async (user) => expireUserCache(user.id) },
      // Name and picture changes, so the app's account card follows them.
      update: { after: async (user) => expireUserCache(user.id) },
    },
    account: {
      create: { after: async (account) => expireUserCache(account.userId) },
      delete: { after: async (account) => expireUserCache(account.userId) },
    },
  },
});

// Cached because the desktop poll asks on every request; linking or unlinking
// either provider expires it (databaseHooks above, unlinkSocialProvider below).
export async function getLinkedSocialProviders(userId: string) {
  const cached = await readCached<string[]>(userId, "providers");
  if (cached) return cached;
  console.info("[db] linked providers read");
  const result = await pool.query<{ providerId: string }>(
    'SELECT "providerId" FROM "account" WHERE "userId" = $1 AND "providerId" IN ($2, $3)',
    [userId, "google", "discord"],
  );
  const providers = result.rows.map((row) => row.providerId);
  await writeCached(userId, "providers", providers);
  return providers;
}

export type SocialProviderId = "google" | "discord";

export type UnlinkResult = "unlinked" | "not-linked" | "last-account";

/**
 * Removes a linked social provider, refusing to remove the only way an account
 * can still be signed into. The guard is part of the DELETE rather than a
 * separate SELECT so two unlinks arriving together cannot each see two accounts
 * and leave the user with none. Mirrors Better Auth's own unlinkAccount, which
 * the desktop app cannot call: it authenticates with a desktop token rather
 * than a session cookie.
 */
export async function unlinkSocialProvider(userId: string, provider: SocialProviderId): Promise<UnlinkResult> {
  const linked = await pool.query('SELECT 1 FROM "account" WHERE "userId" = $1 AND "providerId" = $2', [userId, provider]);
  if (!linked.rowCount) return "not-linked";
  // Only methods that can still sign in count: a password or Discord. Google
  // rows left from before its removal would otherwise let someone unlink
  // Discord and be left with no way back in.
  const result = await pool.query(
    `DELETE FROM "account" WHERE "userId" = $1 AND "providerId" = $2
       AND (SELECT COUNT(*) FROM "account" WHERE "userId" = $1 AND "providerId" IN ('credential', 'discord') AND "providerId" <> $2) > 0`,
    [userId, provider],
  );
  if (!result.rowCount) return "last-account";
  // A direct DELETE, so Better Auth's account hook never sees it.
  await expireUserCache(userId);
  return "unlinked";
}
