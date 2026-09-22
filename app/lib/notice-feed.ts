import { constants, sign } from "node:crypto";

// The Notice Board feed the desktop app polls: major-feature announcements and,
// when it matters, urgent notices (a security problem, a severe bug) that have
// to reach installed apps without shipping an update.
//
// Pure on purpose - no database, cache or env - so the signing and validation
// the app relies on can be tested on their own (tests/notices.test.mjs).
//
// The payload is signed with the notice key (NOTICE_SIGNING_KEY), which is not
// the release key: whoever gets hold of this deployment can at worst publish a
// notice, never a build. The app pins the public half (NoticeSigning.cs) and
// drops anything that does not verify.
//
// `flags` is reserved for remote kill switches. It is always empty for now; the
// app parses and ignores it, so adding flags later needs no schema bump.

export const NOTICE_SEVERITIES = ["feature", "info", "critical"] as const;
export type NoticeSeverity = (typeof NOTICE_SEVERITIES)[number];

export const TITLE_MAX = 120;
export const BODY_MAX = 4000;
export const LINK_LABEL_MAX = 40;

export type NoticeLink = { label: string; url: string };

export type Notice = {
  id: string;
  severity: NoticeSeverity;
  title: string;
  body: string;
  publishedAt: string;
  expiresAt: string | null;
  minVersion: string | null;
  maxVersion: string | null;
  link: NoticeLink | null;
};

export type NoticeFeedPayload = {
  schema: 1;
  issuedAt: string;
  notices: Notice[];
  flags: Record<string, never>;
};

export type SignedNoticeFeed = { payload: string; signature: string };

export type NoticeInput = Omit<Notice, "id" | "publishedAt">;

const VERSION = /^\d+\.\d+\.\d+$/;

// Where a notice may send people. The app enforces the same list before it
// opens anything, so a hijacked admin account cannot turn a notice into a
// phishing link; this check only stops such a notice being saved at all.
export function isAllowedNoticeLink(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
  const host = url.hostname.toLowerCase();
  if (host === "clypdat.xyz" || host.endsWith(".clypdat.xyz")) return true;
  if (host === "github.com") return url.pathname === "/ClypLabs" || url.pathname.startsWith("/ClypLabs/");
  if (host === "discord.gg") return url.pathname === "/jt3eJf238t";
  return false;
}

function compareVersions(a: string, b: string): number {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] - right[i];
  return 0;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalText(value: unknown): string | null {
  const trimmed = text(value);
  return trimmed ? trimmed : null;
}

/** Checks an admin form submission. Returns the cleaned notice or the first problem found. */
export function validateNoticeInput(raw: unknown, now = Date.now()): { ok: true; value: NoticeInput } | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Missing notice." };
  const input = raw as Record<string, unknown>;

  const severity = text(input.severity) as NoticeSeverity;
  if (!NOTICE_SEVERITIES.includes(severity)) return { ok: false, error: "Pick a severity." };

  const title = text(input.title);
  if (!title) return { ok: false, error: "Title is required." };
  if (title.length > TITLE_MAX) return { ok: false, error: `Title is over ${TITLE_MAX} characters.` };

  const body = text(input.body);
  if (!body) return { ok: false, error: "Body is required." };
  if (body.length > BODY_MAX) return { ok: false, error: `Body is over ${BODY_MAX} characters.` };

  const minVersion = optionalText(input.minVersion);
  const maxVersion = optionalText(input.maxVersion);
  for (const version of [minVersion, maxVersion]) {
    if (version && !VERSION.test(version)) return { ok: false, error: `"${version}" is not a version like 1.5.4.` };
  }
  if (minVersion && maxVersion && compareVersions(minVersion, maxVersion) > 0) {
    return { ok: false, error: "Minimum version is above the maximum." };
  }

  let expiresAt: string | null = null;
  const expiresText = optionalText(input.expiresAt);
  if (expiresText) {
    const expires = new Date(expiresText);
    if (Number.isNaN(expires.getTime())) return { ok: false, error: "Expiry is not a date." };
    if (expires.getTime() <= now) return { ok: false, error: "Expiry is in the past." };
    expiresAt = expires.toISOString();
  }

  let link: NoticeLink | null = null;
  const linkUrl = optionalText(input.linkUrl);
  if (linkUrl) {
    if (!isAllowedNoticeLink(linkUrl)) {
      return { ok: false, error: "Links may only point at clypdat.xyz, github.com/ClypLabs or the ClypDat Discord." };
    }
    const label = text(input.linkLabel) || "Read more";
    if (label.length > LINK_LABEL_MAX) return { ok: false, error: `Link label is over ${LINK_LABEL_MAX} characters.` };
    link = { label, url: linkUrl };
  }

  return { ok: true, value: { severity, title, body, minVersion, maxVersion, expiresAt, link } };
}

/** Notices still live at `now`, newest first. */
export function buildFeedPayload(notices: Notice[], now = Date.now()): NoticeFeedPayload {
  const live = notices
    .filter((notice) => !notice.expiresAt || new Date(notice.expiresAt).getTime() > now)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return { schema: 1, issuedAt: new Date(now).toISOString(), notices: live, flags: {} };
}

/**
 * RSA-PSS over SHA-256 with a 32-byte salt - exactly what .NET's
 * RSASignaturePadding.Pss verifies. Node's default PSS salt is the maximum,
 * which .NET rejects, so the salt length is pinned here.
 */
export function signFeed(payload: NoticeFeedPayload, privateKeyPem: string): SignedNoticeFeed {
  const bytes = Buffer.from(JSON.stringify(payload), "utf8");
  const signature = sign("sha256", bytes, {
    key: privateKeyPem,
    padding: constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32,
  });
  return { payload: bytes.toString("base64"), signature: signature.toString("base64") };
}
