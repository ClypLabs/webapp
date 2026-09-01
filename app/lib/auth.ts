import { betterAuth } from "better-auth";
import { Pool } from "pg";

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

const socialProviders = {
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
    : {}),
  ...(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET
    ? {
        discord: {
          clientId: process.env.DISCORD_CLIENT_ID,
          clientSecret: process.env.DISCORD_CLIENT_SECRET,
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
  account: {
    accountLinking: {
      // Password sign-in establishes account ownership before linkSocial.
      // Better Auth then rejects provider accounts with another email address.
      allowDifferentEmails: false,
    },
  },
  socialProviders,
});

export async function getLinkedSocialProviders(userId: string) {
  const result = await pool.query<{ providerId: string }>(
    'SELECT "providerId" FROM "account" WHERE "userId" = $1 AND "providerId" IN ($2, $3)',
    [userId, "google", "discord"],
  );
  return result.rows.map((row) => row.providerId);
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
  const result = await pool.query(
    'DELETE FROM "account" WHERE "userId" = $1 AND "providerId" = $2 AND (SELECT COUNT(*) FROM "account" WHERE "userId" = $1) > 1',
    [userId, provider],
  );
  return result.rowCount ? "unlinked" : "last-account";
}
