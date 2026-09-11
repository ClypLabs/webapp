import { createHmac, timingSafeEqual } from "node:crypto";
import { pool } from "@/app/lib/auth";
import { expireUserCache } from "@/app/lib/account-cache";
import { ensureXboxSchema, moveXboxAccount } from "@/app/lib/xbox";

/**
 * Folding a duplicate account back into the one it was meant to be.
 *
 * With Google sign-in gone for a while, someone whose account was made with
 * Google who then signed in with Discord got a brand new account whenever the
 * two emails differed. Their old account then refuses the Discord link, since
 * that Discord already belongs to the new one.
 *
 * A merge takes two sign-ins in the same browser: /account starts it while
 * signed into one account, which leaves a short-lived signed ticket naming that
 * account in a cookie, and the person then signs into the other. Holding both
 * is the proof that both are theirs. Only an account that is nothing but a
 * Discord sign-in - no password, no Google - is ever folded in and deleted, so a
 * merge can move a Discord login and an Xbox link but never lose anything else.
 */

export const MERGE_COOKIE = "clypdat_account_merge";
export const MERGE_TICKET_SECONDS = 10 * 60;

function secret() {
  return process.env.BETTER_AUTH_SECRET ?? "development-only-change-me-before-deploying";
}

// The purpose is part of what is signed, so a desktop token (signed with the
// same secret, in the same shape) can never pass as a merge ticket.
function sign(payload: string) {
  return createHmac("sha256", secret()).update(`account-merge:${payload}`).digest("base64url");
}

export function createMergeTicket(userId: string) {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(Date.now() / 1000) + MERGE_TICKET_SECONDS }), "utf8").toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readMergeTicket(ticket: string | undefined): string | null {
  const [payload, signature] = ticket?.split(".") ?? [];
  if (!payload || !signature) return null;
  const actual = Buffer.from(signature, "base64url");
  const expected = Buffer.from(sign(payload), "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { sub?: string; exp?: number };
    if (!value.sub || !value.exp || value.exp <= Math.floor(Date.now() / 1000)) return null;
    return value.sub;
  } catch {
    return null;
  }
}

export type MergeResult =
  | { kind: "merged"; keptUserId: string; removedUserId: string; movedXbox: boolean }
  | { kind: "same-account" }
  | { kind: "not-mergeable"; message: string };

/**
 * Merges two accounts the caller has proven they hold. Whichever of the two is
 * only a Discord sign-in is folded into the other; if both or neither are, it
 * refuses rather than guess which one the person means to keep.
 */
export async function mergeAccounts(firstUserId: string, secondUserId: string): Promise<MergeResult> {
  if (firstUserId === secondUserId) return { kind: "same-account" };
  // Before connecting: the pool has one connection, and the transaction below
  // holds it until it ends.
  await ensureXboxSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Locked for the transaction so two merges, or a merge and a link, cannot
    // interleave and leave a user with no way to sign in.
    const users = await client.query<{ id: string; name: string; image: string | null }>(
      'SELECT id, name, image FROM "user" WHERE id = ANY($1) FOR UPDATE',
      [[firstUserId, secondUserId]],
    );
    if (users.rowCount !== 2) {
      await client.query("ROLLBACK");
      return { kind: "not-mergeable", message: "One of the two accounts no longer exists. Sign in again and retry." };
    }
    const accounts = await client.query<{ userId: string; providerId: string }>(
      'SELECT "userId", "providerId" FROM "account" WHERE "userId" = ANY($1)',
      [[firstUserId, secondUserId]],
    );
    const providersOf = (userId: string) => accounts.rows.filter((row) => row.userId === userId).map((row) => row.providerId);
    const onlyDiscord = (userId: string) => {
      const providers = providersOf(userId);
      return providers.length === 1 && providers[0] === "discord";
    };
    const firstOnlyDiscord = onlyDiscord(firstUserId);
    const secondOnlyDiscord = onlyDiscord(secondUserId);
    if (firstOnlyDiscord === secondOnlyDiscord) {
      await client.query("ROLLBACK");
      return {
        kind: "not-mergeable",
        message: firstOnlyDiscord
          ? "Both accounts only use Discord, so there is nothing to merge. Email hi@clypdat.xyz if you need them combined."
          : "Both accounts have their own sign-in, so they can't be merged automatically. Email hi@clypdat.xyz and we'll sort it out.",
      };
    }
    const removed = firstOnlyDiscord ? firstUserId : secondUserId;
    const kept = removed === firstUserId ? secondUserId : firstUserId;
    if (providersOf(kept).includes("discord")) {
      await client.query("ROLLBACK");
      return { kind: "not-mergeable", message: "This account already has a Discord connected. Disconnect it first to bring in the other one." };
    }

    await client.query('UPDATE "account" SET "userId" = $2, "updatedAt" = NOW() WHERE "userId" = $1 AND "providerId" = $3', [removed, kept, "discord"]);
    const movedXbox = await moveXboxAccount(client, removed, kept);
    // The same as linking Discord does (updateUserInfoOnLink in auth.ts): the
    // kept account takes the Discord name and picture. Email never changes.
    const removedUser = users.rows.find((row) => row.id === removed)!;
    await client.query('UPDATE "user" SET name = $2, image = $3, "updatedAt" = NOW() WHERE id = $1', [kept, removedUser.name, removedUser.image]);
    await client.query('DELETE FROM "session" WHERE "userId" = $1', [removed]);
    await client.query('DELETE FROM "user" WHERE id = $1', [removed]);
    await client.query("COMMIT");

    // Direct SQL, so none of Better Auth's hooks ran: drop both users' cached
    // account data. The removed user's desktop token stops working with it.
    await Promise.all([expireUserCache(kept), expireUserCache(removed)]);
    return { kind: "merged", keptUserId: kept, removedUserId: removed, movedXbox };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
