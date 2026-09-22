import { randomUUID } from "node:crypto";
import { getCache } from "@vercel/functions";
import { pool } from "@/app/lib/auth";
import {
  buildFeedPayload,
  signFeed,
  type Notice,
  type NoticeInput,
  type NoticeSeverity,
  type SignedNoticeFeed,
} from "@/app/lib/notice-feed";

// Notice Board storage. Authored at /admin, read by every running desktop app.
//
// The apps poll the feed, so it must never be what wakes Neon: the signed feed
// lives in the Runtime Cache and is rebuilt only when an admin changes a notice
// (or, rarely, when the cache has dropped it). A poll reads the cache, and the
// CDN answers most polls before they reach this code at all.

export type StoredNotice = Notice & { archived: boolean; createdBy: string; updatedAt: string };

const cache = () => getCache({ namespace: "clypdat-notices" });
// Bump if the payload shape changes, so a deploy does not serve the old one.
const FEED_KEY = "feed-v1";
// Freshness comes from the rebuild on every change; the TTL only bounds how long
// a feed can outlive a change that somehow skipped it.
const FEED_TTL_SECONDS = 7 * 24 * 60 * 60;

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  schemaReady ??= pool
    .query(`
      CREATE TABLE IF NOT EXISTS clypdat_notices (
        id UUID PRIMARY KEY,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        link_label TEXT,
        link_url TEXT,
        min_version TEXT,
        max_version TEXT,
        published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        archived BOOLEAN NOT NULL DEFAULT FALSE,
        created_by TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    .then(() => undefined)
    .catch((error) => {
      schemaReady = null;
      throw error;
    });
  return schemaReady;
}

type Row = {
  id: string;
  severity: NoticeSeverity;
  title: string;
  body: string;
  link_label: string | null;
  link_url: string | null;
  min_version: string | null;
  max_version: string | null;
  published_at: Date;
  expires_at: Date | null;
  archived: boolean;
  created_by: string;
  updated_at: Date;
};

function fromRow(row: Row): StoredNotice {
  return {
    id: row.id,
    severity: row.severity,
    title: row.title,
    body: row.body,
    link: row.link_url ? { label: row.link_label ?? "Read more", url: row.link_url } : null,
    minVersion: row.min_version,
    maxVersion: row.max_version,
    publishedAt: row.published_at.toISOString(),
    expiresAt: row.expires_at ? row.expires_at.toISOString() : null,
    archived: row.archived,
    createdBy: row.created_by,
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Every notice, archived included, newest first. Admin only. */
export async function listNotices(): Promise<StoredNotice[]> {
  await ensureSchema();
  const result = await pool.query<Row>("SELECT * FROM clypdat_notices ORDER BY published_at DESC LIMIT 200");
  return result.rows.map(fromRow);
}

export async function createNotice(input: NoticeInput, userId: string): Promise<StoredNotice> {
  await ensureSchema();
  const result = await pool.query<Row>(
    `INSERT INTO clypdat_notices
       (id, severity, title, body, link_label, link_url, min_version, max_version, expires_at, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [randomUUID(), input.severity, input.title, input.body, input.link?.label ?? null, input.link?.url ?? null,
      input.minVersion, input.maxVersion, input.expiresAt, userId],
  );
  await rebuildFeed();
  return fromRow(result.rows[0]);
}

/** Edits keep the notice's id, so an app that already showed it does not show it again. */
export async function updateNotice(id: string, input: NoticeInput): Promise<StoredNotice | null> {
  await ensureSchema();
  const result = await pool.query<Row>(
    `UPDATE clypdat_notices
        SET severity = $2, title = $3, body = $4, link_label = $5, link_url = $6,
            min_version = $7, max_version = $8, expires_at = $9, updated_at = NOW()
      WHERE id = $1
      RETURNING *`,
    [id, input.severity, input.title, input.body, input.link?.label ?? null, input.link?.url ?? null,
      input.minVersion, input.maxVersion, input.expiresAt],
  );
  if (!result.rows[0]) return null;
  await rebuildFeed();
  return fromRow(result.rows[0]);
}

export async function setNoticeArchived(id: string, archived: boolean): Promise<StoredNotice | null> {
  await ensureSchema();
  const result = await pool.query<Row>(
    "UPDATE clypdat_notices SET archived = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
    [id, archived],
  );
  if (!result.rows[0]) return null;
  await rebuildFeed();
  return fromRow(result.rows[0]);
}

function signingKey(): string | null {
  const raw = process.env.NOTICE_SIGNING_KEY;
  // Accepts the PEM with real newlines or with them escaped as \n, which is how
  // a multi-line value often survives being pasted into an env var.
  return raw ? raw.replace(/\\n/g, "\n") : null;
}

async function rebuildFeed(): Promise<SignedNoticeFeed | null> {
  const key = signingKey();
  if (!key) return null;
  await ensureSchema();
  const result = await pool.query<Row>("SELECT * FROM clypdat_notices WHERE archived = FALSE ORDER BY published_at DESC LIMIT 50");
  // Only what the app reads; who wrote a notice never leaves the server.
  const notices: Notice[] = result.rows.map(fromRow).map((notice) => ({
    id: notice.id, severity: notice.severity, title: notice.title, body: notice.body,
    publishedAt: notice.publishedAt, expiresAt: notice.expiresAt,
    minVersion: notice.minVersion, maxVersion: notice.maxVersion, link: notice.link,
  }));
  const feed = signFeed(buildFeedPayload(notices), key);
  try {
    await cache().set(FEED_KEY, feed, { ttl: FEED_TTL_SECONDS, name: "notice-feed" });
  } catch {
    // The next poll rebuilds it.
  }
  return feed;
}

/** The signed feed, from the cache when it can be. Null when no signing key is configured. */
export async function getSignedFeed(): Promise<SignedNoticeFeed | null> {
  if (!signingKey()) return null;
  try {
    const cached = (await cache().get(FEED_KEY)) as SignedNoticeFeed | null | undefined;
    if (cached?.payload && cached.signature) return cached;
  } catch {
    // Build it instead.
  }
  return rebuildFeed();
}
