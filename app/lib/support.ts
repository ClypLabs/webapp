import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { pool } from "@/app/lib/auth";
import { purposeKey } from "@/app/lib/secret";
import type { SupportInput } from "@/app/lib/support-input";

const INBOX_LOCK = 826342;
const INBOX_CAPACITY = 100 * 1024 * 1024;
let schemaReady: Promise<void> | null = null;

export type SupportReport = {
  id: string; message: string; version: string; build: string; bytes: number;
  createdAt: string; expiresAt: string; resolved: boolean; name: string; email: string;
  accountLinked: boolean;
};

export function ensureSupportSchema(): Promise<void> {
  schemaReady ??= pool.query(`
    CREATE TABLE IF NOT EXISTS clypdat_support_reports (
      id UUID PRIMARY KEY, user_id TEXT REFERENCES "user"(id) ON DELETE CASCADE,
      message TEXT NOT NULL, version TEXT NOT NULL, build TEXT NOT NULL,
      bundle BYTEA NOT NULL, bytes INTEGER NOT NULL CHECK (bytes > 0 AND bytes <= 3145728),
      resolved BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days'
    );
    ALTER TABLE clypdat_support_reports ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE clypdat_support_reports ADD COLUMN IF NOT EXISTS contact_email TEXT;
    CREATE INDEX IF NOT EXISTS clypdat_support_expiry ON clypdat_support_reports (expires_at);
  `).then(() => undefined).catch(error => { schemaReady = null; throw error; });
  return schemaReady;
}

export function sealSupportBundle(id: string, bundle: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", purposeKey("support-seal"), iv);
  cipher.setAAD(Buffer.from(id));
  const encrypted = Buffer.concat([cipher.update(bundle), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
}

export function openSupportBundle(id: string, sealed: Buffer): Buffer {
  const decipher = createDecipheriv("aes-256-gcm", purposeKey("support-seal"), sealed.subarray(0, 12));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(sealed.subarray(12, 28));
  return Buffer.concat([decipher.update(sealed.subarray(28)), decipher.final()]);
}

export async function saveSupportReport(userId: string | null, input: SupportInput): Promise<"saved" | "duplicate" | "conflict" | "full"> {
  if (!userId && !input.email) throw new Error("Guest reports require a contact email");
  await ensureSupportSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialises the capacity check with inserts across all function instances.
    await client.query("SELECT pg_advisory_xact_lock($1)", [INBOX_LOCK]);
    await client.query("DELETE FROM clypdat_support_reports WHERE expires_at <= NOW()");
    const prior = await client.query<{ user_id: string | null; contact_email: string | null }>("SELECT user_id, contact_email FROM clypdat_support_reports WHERE id = $1", [input.id]);
    if (prior.rows[0]) {
      await client.query("COMMIT");
      return prior.rows[0].user_id === userId && (userId !== null || prior.rows[0].contact_email === input.email) ? "duplicate" : "conflict";
    }
    const used = await client.query<{ bytes: string; reports: string }>("SELECT COALESCE(SUM(bytes), 0) AS bytes, COUNT(*) AS reports FROM clypdat_support_reports");
    if (Number(used.rows[0].bytes) + input.bundle.length > INBOX_CAPACITY || Number(used.rows[0].reports) >= 200) {
      await client.query("COMMIT");
      return "full";
    }
    await client.query(`INSERT INTO clypdat_support_reports (id, user_id, message, version, build, bundle, bytes, contact_email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [input.id, userId, input.message, input.version, input.build, sealSupportBundle(input.id, input.bundle), input.bundle.length, userId ? null : input.email]);
    await client.query("COMMIT");
    return "saved";
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function listSupportReports(): Promise<SupportReport[]> {
  await ensureSupportSchema();
  await pool.query("DELETE FROM clypdat_support_reports WHERE expires_at <= NOW()");
  const result = await pool.query(`SELECT r.id, r.message, r.version, r.build, r.bytes, r.resolved,
    r.created_at AS "createdAt", r.expires_at AS "expiresAt", COALESCE(u.name, 'Guest') AS name,
    COALESCE(u.email, r.contact_email, '') AS email, (r.user_id IS NOT NULL) AS "accountLinked"
    FROM clypdat_support_reports r LEFT JOIN "user" u ON u.id = r.user_id
    WHERE r.expires_at > NOW() ORDER BY r.created_at DESC LIMIT 200`);
  return result.rows.map(row => ({ ...row, createdAt: new Date(row.createdAt).toISOString(), expiresAt: new Date(row.expiresAt).toISOString() }));
}

export async function downloadSupportBundle(id: string): Promise<Buffer | null> {
  await ensureSupportSchema();
  const result = await pool.query<{ bundle: Buffer }>("SELECT bundle FROM clypdat_support_reports WHERE id = $1 AND expires_at > NOW()", [id]);
  return result.rows[0] ? openSupportBundle(id, result.rows[0].bundle) : null;
}

export async function updateSupportReport(id: string, resolved: boolean): Promise<boolean> {
  await ensureSupportSchema();
  const result = await pool.query("UPDATE clypdat_support_reports SET resolved = $2 WHERE id = $1 AND expires_at > NOW()", [id, resolved]);
  return result.rowCount === 1;
}

export async function deleteSupportReport(id: string): Promise<void> {
  await ensureSupportSchema();
  await pool.query("DELETE FROM clypdat_support_reports WHERE id = $1", [id]);
}
