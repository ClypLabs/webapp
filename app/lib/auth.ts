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
