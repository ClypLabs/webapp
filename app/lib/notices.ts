import { randomUUID } from "node:crypto";
import { getCache } from "@vercel/functions";
import { pool } from "@/app/lib/auth";
import type { PoolClient } from "pg";
import {
  buildFeedPayload,
  signFeed,
  type KillSwitch,
  type KillSwitchInput,
  type Notice,
  type NoticeInput,
  type NoticeSeverity,
  type SignedNoticeFeed,
} from "@/app/lib/notice-feed";

export type StoredNotice = Notice & { archived: boolean; createdBy: string; updatedAt: string };
export type StoredSwitch = KillSwitch & { cleared: boolean; createdBy: string; updatedAt: string };

const cache = () => getCache({ namespace: "clypdat-notices" });
const FEED_KEY = "feed-v1";
const FEED_TTL_SECONDS = 60;
const PUBLICATION_LOCK = 826341;
let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  schemaReady ??= pool.query(`
    CREATE TABLE IF NOT EXISTS clypdat_notices (
      id UUID PRIMARY KEY, severity TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
      link_label TEXT, link_url TEXT, min_version TEXT, max_version TEXT,
      published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), expires_at TIMESTAMPTZ,
      archived BOOLEAN NOT NULL DEFAULT FALSE, created_by TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS clypdat_notice_switches (
      id UUID PRIMARY KEY, control TEXT NOT NULL, target TEXT, reason TEXT NOT NULL,
      min_version TEXT, max_version TEXT, published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL, cleared BOOLEAN NOT NULL DEFAULT FALSE,
      created_by TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS clypdat_notice_feed_state (
      id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id), revision BIGINT NOT NULL DEFAULT 0
    );
    INSERT INTO clypdat_notice_feed_state (id, revision) VALUES (TRUE, 0) ON CONFLICT (id) DO NOTHING;
  `).then(() => undefined).catch((error) => {
    schemaReady = null;
    throw error;
  });
  return schemaReady;
}

type NoticeRow = {
  id: string; severity: NoticeSeverity; title: string; body: string;
  link_label: string | null; link_url: string | null; min_version: string | null; max_version: string | null;
  published_at: Date; expires_at: Date | null; archived: boolean; created_by: string; updated_at: Date;
};
type SwitchRow = {
  id: string; control: KillSwitch["control"]; target: string | null; reason: string;
  min_version: string | null; max_version: string | null; published_at: Date; expires_at: Date;
  cleared: boolean; created_by: string; updated_at: Date;
};

function fromNoticeRow(row: NoticeRow): StoredNotice {
  return {
    id: row.id, severity: row.severity, title: row.title, body: row.body,
    link: row.link_url ? { label: row.link_label ?? "Read more", url: row.link_url } : null,
    minVersion: row.min_version, maxVersion: row.max_version,
    publishedAt: new Date(row.published_at).toISOString(), expiresAt: row.expires_at ? new Date(row.expires_at).toISOString() : null,
    archived: row.archived, createdBy: row.created_by, updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function fromSwitchRow(row: SwitchRow): StoredSwitch {
  return {
    id: row.id, control: row.control, target: row.target, reason: row.reason,
    minVersion: row.min_version, maxVersion: row.max_version,
    publishedAt: new Date(row.published_at).toISOString(), expiresAt: new Date(row.expires_at).toISOString(),
    cleared: row.cleared, createdBy: row.created_by, updatedAt: new Date(row.updated_at).toISOString(),
  };
}

async function withPublication<T>(action: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [PUBLICATION_LOCK]);
    const result = await action(client);
    await client.query("COMMIT");
    // Never publish a transaction's uncommitted snapshot. The next feed read
    // rebuilds from committed rows and repopulates the short-lived cache.
    try { await cache().delete(FEED_KEY); } catch { /* expiry remains the fallback */ }
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* preserve original failure */ }
    throw error;
  } finally {
    client.release();
  }
}

function signingKey(): string | null {
  const raw = process.env.NOTICE_SIGNING_KEY;
  return raw ? raw.replace(/\\n/g, "\n") : null;
}

async function publishFeed(client: PoolClient, increment: boolean): Promise<SignedNoticeFeed | null> {
  const key = signingKey();
  if (!key) return null;
  const state = increment
    ? await client.query<{ revision: string }>("UPDATE clypdat_notice_feed_state SET revision = revision + 1 WHERE id = TRUE RETURNING revision")
    : await client.query<{ revision: string }>("SELECT revision FROM clypdat_notice_feed_state WHERE id = TRUE");
  const revision = Number(state.rows[0]?.revision ?? 0);
  const notices = (await client.query<NoticeRow>("SELECT * FROM clypdat_notices WHERE archived = FALSE ORDER BY published_at DESC LIMIT 50")).rows.map(fromNoticeRow)
    .map(({ id, severity, title, body, publishedAt, expiresAt, minVersion, maxVersion, link }) => ({ id, severity, title, body, publishedAt, expiresAt, minVersion, maxVersion, link }));
  const switches = (await client.query<SwitchRow>("SELECT * FROM clypdat_notice_switches WHERE cleared = FALSE ORDER BY published_at DESC LIMIT 50")).rows.map(fromSwitchRow)
    .map(({ id, control, target, reason, minVersion, maxVersion, publishedAt, expiresAt }) => ({ id, control, target, reason, minVersion, maxVersion, publishedAt, expiresAt }));
  const feed = signFeed(buildFeedPayload(notices, switches, revision), key);
  return feed;
}

export async function listNotices(): Promise<StoredNotice[]> {
  await ensureSchema();
  const result = await pool.query<NoticeRow>("SELECT * FROM clypdat_notices ORDER BY published_at DESC LIMIT 200");
  return result.rows.map(fromNoticeRow);
}

export async function createNotice(input: NoticeInput, userId: string): Promise<StoredNotice> {
  return withPublication(async (client) => {
    const result = await client.query<NoticeRow>(`INSERT INTO clypdat_notices
      (id, severity, title, body, link_label, link_url, min_version, max_version, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [randomUUID(), input.severity, input.title, input.body, input.link?.label ?? null, input.link?.url ?? null, input.minVersion, input.maxVersion, input.expiresAt, userId]);
    await publishFeed(client, true);
    return fromNoticeRow(result.rows[0]);
  });
}

export async function updateNotice(id: string, input: NoticeInput): Promise<StoredNotice | null> {
  return withPublication(async (client) => {
    const result = await client.query<NoticeRow>(`UPDATE clypdat_notices SET severity = $2, title = $3, body = $4,
      link_label = $5, link_url = $6, min_version = $7, max_version = $8, expires_at = $9, updated_at = NOW()
      WHERE id = $1 RETURNING *`,
      [id, input.severity, input.title, input.body, input.link?.label ?? null, input.link?.url ?? null, input.minVersion, input.maxVersion, input.expiresAt]);
    if (!result.rows[0]) return null;
    await publishFeed(client, true);
    return fromNoticeRow(result.rows[0]);
  });
}

export async function setNoticeArchived(id: string, archived: boolean): Promise<StoredNotice | null> {
  return withPublication(async (client) => {
    const result = await client.query<NoticeRow>("UPDATE clypdat_notices SET archived = $2, updated_at = NOW() WHERE id = $1 RETURNING *", [id, archived]);
    if (!result.rows[0]) return null;
    await publishFeed(client, true);
    return fromNoticeRow(result.rows[0]);
  });
}

export async function listSwitches(): Promise<StoredSwitch[]> {
  await ensureSchema();
  const result = await pool.query<SwitchRow>("SELECT * FROM clypdat_notice_switches ORDER BY published_at DESC LIMIT 200");
  return result.rows.map(fromSwitchRow);
}

export async function createSwitch(input: KillSwitchInput, userId: string): Promise<StoredSwitch> {
  return withPublication(async (client) => {
    const result = await client.query<SwitchRow>(`INSERT INTO clypdat_notice_switches
      (id, control, target, reason, min_version, max_version, expires_at, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [randomUUID(), input.control, input.target, input.reason, input.minVersion, input.maxVersion, input.expiresAt, userId]);
    await publishFeed(client, true);
    return fromSwitchRow(result.rows[0]);
  });
}

export async function updateSwitch(id: string, input: KillSwitchInput): Promise<StoredSwitch | null> {
  return withPublication(async (client) => {
    const result = await client.query<SwitchRow>(`UPDATE clypdat_notice_switches SET control = $2, target = $3, reason = $4,
      min_version = $5, max_version = $6, expires_at = $7, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, input.control, input.target, input.reason, input.minVersion, input.maxVersion, input.expiresAt]);
    if (!result.rows[0]) return null;
    await publishFeed(client, true);
    return fromSwitchRow(result.rows[0]);
  });
}

export async function clearSwitch(id: string): Promise<StoredSwitch | null> {
  return withPublication(async (client) => {
    const result = await client.query<SwitchRow>("UPDATE clypdat_notice_switches SET cleared = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *", [id]);
    if (!result.rows[0]) return null;
    await publishFeed(client, true);
    return fromSwitchRow(result.rows[0]);
  });
}

async function rebuildFeed(): Promise<SignedNoticeFeed | null> {
  const feed = await withPublication((client) => publishFeed(client, false));
  if (feed) {
    try { await cache().set(FEED_KEY, feed, { ttl: FEED_TTL_SECONDS, name: "notice-feed" }); } catch { /* database remains authoritative */ }
  }
  return feed;
}

export async function getSignedFeed(): Promise<SignedNoticeFeed | null> {
  if (!signingKey()) return null;
  try {
    const cached = (await cache().get(FEED_KEY)) as SignedNoticeFeed | null | undefined;
    if (cached?.payload && cached.signature) return cached;
  } catch { /* rebuild from database */ }
  return rebuildFeed();
}
