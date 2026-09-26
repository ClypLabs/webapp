import assert from "node:assert/strict";
import { constants, generateKeyPairSync, verify } from "node:crypto";
import test from "node:test";
import { securityFixture } from "./helpers/security-fixture.mjs";

const origin = "https://clypdat.test";
const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" });

const notice = (overrides = {}) => ({
  id: "00000000-0000-4000-8000-000000000001", severity: "feature", title: "T", body: "B",
  publishedAt: "2027-01-01T00:00:00.000Z", expiresAt: null, minVersion: null, maxVersion: null, link: null,
  ...overrides,
});

test("feed is RSA-PSS SHA-256 with a 32-byte salt, the padding .NET verifies", () => {
  const { load } = securityFixture();
  const { buildFeedPayload, signFeed } = load("@/app/lib/notice-feed");
  const feed = signFeed(buildFeedPayload([notice()], Date.parse("2027-01-02T00:00:00Z")), privatePem);
  const bytes = Buffer.from(feed.payload, "base64");
  const signature = Buffer.from(feed.signature, "base64");
  assert.ok(verify("sha256", bytes, { key: publicKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }, signature));
  const tampered = Buffer.from(bytes);
  tampered[tampered.length - 2] ^= 1;
  assert.equal(verify("sha256", tampered, { key: publicKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 }, signature), false);
  const payload = JSON.parse(bytes.toString("utf8"));
  assert.equal(payload.schema, 1);
  assert.equal(payload.issuedAt, "2027-01-02T00:00:00.000Z");
  assert.deepEqual(payload.flags, {});
});

test("feed drops expired notices and orders newest first", () => {
  const { load } = securityFixture();
  const { buildFeedPayload } = load("@/app/lib/notice-feed");
  const now = Date.parse("2027-06-01T00:00:00Z");
  const payload = buildFeedPayload([
    notice({ id: "old", publishedAt: "2027-01-01T00:00:00.000Z" }),
    notice({ id: "expired", publishedAt: "2027-05-01T00:00:00.000Z", expiresAt: "2027-05-31T00:00:00.000Z" }),
    notice({ id: "new", publishedAt: "2027-05-15T00:00:00.000Z", expiresAt: "2027-07-01T00:00:00.000Z" }),
  ], now);
  assert.deepEqual(payload.notices.map((n) => n.id), ["new", "old"]);
});

test("notice links are limited to ClypDat's own places", () => {
  const { load } = securityFixture();
  const { isAllowedNoticeLink } = load("@/app/lib/notice-feed");
  for (const url of ["https://www.clypdat.xyz/blog", "https://clypdat.xyz", "https://github.com/ClypLabs/ClypDat/releases", "https://discord.gg/jt3eJf238t"]) {
    assert.equal(isAllowedNoticeLink(url), true, url);
  }
  for (const url of ["http://www.clypdat.xyz", "https://clypdat.xyz.evil.test", "https://evilclypdat.xyz", "https://github.com/ClypLabsX",
    "https://github.com/someone/ClypLabs", "https://discord.gg/other", "https://user@www.clypdat.xyz", "https://www.clypdat.xyz:8443", "javascript:alert(1)"]) {
    assert.equal(isAllowedNoticeLink(url), false, url);
  }
});

test("notice input validation rejects bad severities, versions, links and past expiry", () => {
  const { load } = securityFixture();
  const { validateNoticeInput } = load("@/app/lib/notice-feed");
  const now = Date.parse("2027-01-01T00:00:00Z");
  const good = { severity: "critical", title: " Update now ", body: "Body", minVersion: "1.5.0", maxVersion: "1.5.4",
    linkUrl: "https://www.clypdat.xyz/security", linkLabel: "", expiresAt: "2027-02-01T00:00:00Z" };
  const result = validateNoticeInput(good, now);
  assert.equal(result.ok, true);
  assert.equal(result.value.title, "Update now");
  assert.equal(JSON.stringify(result.value.link), JSON.stringify({ label: "Read more", url: "https://www.clypdat.xyz/security" }));
  for (const bad of [{ severity: "urgent" }, { title: "" }, { body: "" }, { minVersion: "1.5" }, { minVersion: "1.6.0" },
    { linkUrl: "https://example.test" }, { expiresAt: "2026-12-31T00:00:00Z" }, { expiresAt: "soon" }, { title: "x".repeat(121) }]) {
    assert.equal(validateNoticeInput({ ...good, ...bad }, now).ok, false, JSON.stringify(bad));
  }
});

test("admin notice routes answer 404 to non-admins and 403 to cross-site writes", async () => {
  const { load, state, env } = securityFixture();
  const { GET, POST } = load("@/app/api/admin/notices/route");
  const post = (headers) => new Request(`${origin}/api/admin/notices`, {
    method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({}),
  });
  // No allow-list configured: nobody is an admin, and the session is not even read.
  assert.equal((await GET(new Request(`${origin}/api/admin/notices`))).status, 404);
  assert.equal(state.sessionReads, 0);
  env.ADMIN_USER_IDS = "someone-else";
  assert.equal((await GET(new Request(`${origin}/api/admin/notices`))).status, 404);
  assert.equal((await POST(post({ origin, "sec-fetch-site": "same-origin" }))).status, 404);
  env.ADMIN_USER_IDS = "someone-else, user-1";
  assert.equal((await POST(post({ origin: "https://attacker.test", "sec-fetch-site": "cross-site" }))).status, 403);
  // An admin whose sign-in is older than 12 hours can look but not publish.
  state.session = { user: { id: "user-1" }, session: { createdAt: new Date(state.now - 13 * 60 * 60 * 1000).toISOString() } };
  assert.equal((await GET(new Request(`${origin}/api/admin/notices`))).status !== 404, true);
  const stale = await POST(post({ origin, "sec-fetch-site": "same-origin" }));
  assert.equal(stale.status, 401);
  // /admin shows its sign-in-again panel on this code rather than the message.
  assert.equal((await stale.json()).code, "reauth");
  state.session = { user: { id: "user-1" }, session: { createdAt: new Date(state.now - 60 * 60 * 1000).toISOString() } };
  assert.equal((await POST(post({ origin, "sec-fetch-site": "same-origin" }))).status, 400);
  assert.equal(state.queries.filter((q) => !q.sql.startsWith("CREATE TABLE") && !q.sql.startsWith("SELECT * FROM clypdat_notices")).length, 0);
});

test("public feed is 503 without a key and served from the cache without touching the database", async () => {
  const { load, state, env } = securityFixture();
  const { GET } = load("@/app/api/notices/route");
  assert.equal((await GET()).status, 503);
  env.NOTICE_SIGNING_KEY = privatePem.replace(/\n/g, "\\n");
  state.runtimeCache.set("clypdat-notices:feed-v1", { payload: "cGF5bG9hZA==", signature: "c2ln" });
  const response = await GET();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /s-maxage=60/);
  assert.deepEqual(await response.json(), { payload: "cGF5bG9hZA==", signature: "c2ln" });
  assert.equal(state.queries.length, 0);
});
