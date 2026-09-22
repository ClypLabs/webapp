import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { existsSync } from "node:fs";
import test from "node:test";
import { securityFixture, TEST_SECRET } from "./helpers/security-fixture.mjs";

const origin = "https://clypdat.test";
const callback = "http://127.0.0.1:31234/callback/";
const verifier = "fixture-verifier-with-at-least-forty-three-characters";
const challenge = createHash("sha256").update(verifier).digest("base64url");
function connectParams(extra = {}) {
  return new URLSearchParams({
    redirect_uri: callback, state: "fixture-state-1234567890", code_challenge: challenge,
    code_challenge_method: "S256", ...extra,
  });
}
function consentRequest(params = connectParams(), headers = { origin, "sec-fetch-site": "same-origin" }) {
  params.set("decision", "link");
  return new Request(`${origin}/api/desktop/connect`, { method: "POST", headers, body: params });
}
function exchangeRequest(code, codeVerifier = verifier, headers = {}) {
  return new Request(`${origin}/api/desktop/token`, {
    method: "POST", headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ code, code_verifier: codeVerifier }),
  });
}
function legacyToken(now) {
  const payload = Buffer.from(JSON.stringify({ sub: "user-1", exp: Math.floor(now / 1000) + 3600 })).toString("base64url");
  return `${payload}.${createHmac("sha256", TEST_SECRET).update(payload).digest("base64url")}`;
}

test("desktop connect GET redirects to consent without minting or consulting auth", async () => {
  const { load, state } = securityFixture();
  const route = load("@/app/api/desktop/connect/route");
  for (const modern of [true, false]) {
    const params = connectParams();
    if (!modern) { params.delete("code_challenge"); params.delete("code_challenge_method"); }
    const response = await route.GET(new Request(`${origin}/api/desktop/connect?${params}`));
    assert.equal(response.status, 303);
    const location = new URL(response.headers.get("location"));
    assert.equal(location.pathname, "/account/connect");
    assert.equal(location.searchParams.get("state"), params.get("state"));
    assert.equal(location.searchParams.has("token"), false);
    assert.equal(location.searchParams.has("code"), false);
  }
  assert.equal(state.sessionReads, 0);
  assert.equal(state.queries.length, 0);
  assert.equal(existsSync(new URL("../app/api/desktop/connect/claim/route.ts", import.meta.url)), false);
});

test("consent POST requires both matching Origin and Sec-Fetch-Site", async () => {
  const { load, state } = securityFixture();
  const { POST } = load("@/app/api/desktop/connect/route");
  for (const headers of [{}, { origin }, { "sec-fetch-site": "same-origin" },
    { origin, "sec-fetch-site": "cross-site" }, { origin: "https://attacker.test", "sec-fetch-site": "same-origin" }]) {
    assert.equal((await POST(consentRequest(connectParams(), headers))).status, 403);
  }
  assert.equal(state.sessionReads, 0);
  assert.equal(state.queries.length, 0);
});

test("cancel and unauthenticated consent never mint a credential", async () => {
  const { load, state } = securityFixture();
  const { POST } = load("@/app/api/desktop/connect/route");
  const request = consentRequest();
  const form = await request.formData();
  form.set("decision", "cancel");
  const canceled = await POST(new Request(request.url, { method: "POST", headers: { origin, "sec-fetch-site": "same-origin" }, body: form }));
  assert.equal(new URL(canceled.headers.get("location")).searchParams.get("error"), "access_denied");
  state.session = null;
  const response = await POST(consentRequest());
  assert.equal(new URL(response.headers.get("location")).pathname, "/account");
  assert.equal(state.queries.length, 0);
});

test("consent, PKCE exchange, and single-token revocation round trip", async () => {
  const { load, state } = securityFixture();
  const consent = await load("@/app/api/desktop/connect/route").POST(consentRequest());
  assert.equal(consent.status, 303);
  const location = new URL(consent.headers.get("location"));
  assert.equal(location.origin, new URL(callback).origin);
  assert.equal(location.searchParams.has("token"), false);
  const code = location.searchParams.get("code");
  assert.match(code, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(state.codes.has(code), false, "only the code hash is stored");
  const tokenRoute = load("@/app/api/desktop/token/route");
  const exchange = await tokenRoute.POST(exchangeRequest(code));
  assert.equal(exchange.status, 200);
  assert.equal(exchange.headers.get("cache-control"), "no-store");
  const { token } = await exchange.json();
  const tokens = load("@/app/lib/desktop-token");
  assert.equal((await tokens.verifyActiveDesktopToken(token)).userId, "user-1");
  assert.equal((await tokenRoute.POST(exchangeRequest(code))).status, 401);
  const revoke = await load("@/app/api/desktop/revoke/route").POST(new Request(`${origin}/api/desktop/revoke`, {
    method: "POST", headers: { authorization: `Bearer ${token}` },
  }));
  assert.equal(revoke.status, 204);
  assert.equal(await tokens.verifyActiveDesktopToken(token), null);
});

test("concurrent exchanges consume a code exactly once", async () => {
  const { load } = securityFixture();
  const code = await load("@/app/lib/desktop-connect").issueConnectCode("user-1", challenge);
  const { POST } = load("@/app/api/desktop/token/route");
  const responses = await Promise.all(Array.from({ length: 8 }, () => POST(exchangeRequest(code))));
  assert.equal(responses.filter((response) => response.status === 200).length, 1);
  assert.equal(responses.filter((response) => response.status === 401).length, 7);
});

test("wrong PKCE verifier fails and consumes the code", async () => {
  const { load } = securityFixture();
  const codes = load("@/app/lib/desktop-connect");
  const code = await codes.issueConnectCode("user-1", challenge);
  assert.equal(await codes.redeemConnectCode(code, "x".repeat(43)), null);
  assert.equal(await codes.redeemConnectCode(code, verifier), null);
});

test("callback URLs and challenges reject attacker-controlled destinations", () => {
  const { load } = securityFixture();
  const { readConnectRequest } = load("@/app/lib/desktop-connect");
  for (const redirect_uri of ["https://attacker.test/callback/", "http://127.0.0.1.attacker.test/callback/",
    "http://u:p@127.0.0.1/callback/", `${callback}?existing=1`, `${callback}#fragment`, "http://127.0.0.1/other/"]) {
    assert.equal(readConnectRequest(connectParams({ redirect_uri })), null);
  }
  assert.equal(readConnectRequest(connectParams({ code_challenge_method: "plain" })), null);
  assert.equal(readConnectRequest(connectParams({ code_challenge: "short" })), null);
});

test("legacy clients only receive a token after explicit consent", async () => {
  const { load } = securityFixture();
  const params = connectParams();
  params.delete("code_challenge");
  params.delete("code_challenge_method");
  const response = await load("@/app/api/desktop/connect/route").POST(consentRequest(params));
  const token = new URL(response.headers.get("location")).searchParams.get("token");
  assert.equal((await load("@/app/lib/desktop-token").verifyActiveDesktopToken(token)).userId, "user-1");
});

test("individual revocation preserves other sessions despite stale cache", async () => {
  const { load, state } = securityFixture();
  const tokens = load("@/app/lib/desktop-token");
  const first = await tokens.createDesktopToken("user-1");
  const second = await tokens.createDesktopToken("user-1");
  await tokens.verifyActiveDesktopToken(first);
  state.cache.set("user-1:desktop-auth", { version: 0, revoked: [] });
  await tokens.revokeDesktopToken(tokens.verifyDesktopToken(first));
  assert.equal(await tokens.verifyActiveDesktopToken(first), null);
  assert.equal((await tokens.verifyActiveDesktopToken(second)).userId, "user-1");
});

test("a lost cache entry falls back to the database and still sees the sign-out", async () => {
  const { load, state } = securityFixture();
  const tokens = load("@/app/lib/desktop-token");
  const token = await tokens.createDesktopToken("user-1");
  await tokens.revokeDesktopToken(tokens.verifyDesktopToken(token));
  state.cache.clear();
  assert.equal(await tokens.verifyActiveDesktopToken(token), null);
});

function renewRequest(token, headers = {}) {
  return new Request(`${origin}/api/desktop/token/renew`, { method: "POST", headers: { authorization: `Bearer ${token}`, ...headers } });
}

test("token renewal swaps a live desktop token for a new one and signs the old one out", async () => {
  const { load } = securityFixture();
  const tokens = load("@/app/lib/desktop-token");
  const old = await tokens.createDesktopToken("user-1");
  const { POST } = load("@/app/api/desktop/token/renew/route");
  const response = await POST(renewRequest(old));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const { token, expires_in } = await response.json();
  assert.equal(expires_in, tokens.desktopTokenLifetimeSeconds);
  assert.notEqual(token, old);
  assert.equal((await tokens.verifyActiveDesktopToken(token)).userId, "user-1");
  assert.equal(await tokens.verifyActiveDesktopToken(old), null, "the renewed token no longer works");
  assert.equal((await POST(renewRequest(old))).status, 401, "a signed-out token cannot renew");
});

test("token renewal refuses browser requests and tokens signed out from the site", async () => {
  const { load, state } = securityFixture();
  const tokens = load("@/app/lib/desktop-token");
  const token = await tokens.createDesktopToken("user-1");
  const { POST } = load("@/app/api/desktop/token/renew/route");
  const before = state.queries.length;
  assert.equal((await POST(renewRequest(token, { origin }))).status, 403);
  assert.equal(state.queries.length, before, "refused before any database access");
  await tokens.revokeAllDesktopTokens("user-1");
  assert.equal((await POST(renewRequest(token))).status, 401);
});

test("a database that fails the probe is reported down", async () => {
  const { load, state } = securityFixture();
  state.failDatabase = true;
  const body = await (await load("@/app/api/status/route").GET()).json();
  assert.equal(body.services.database, "down");
  assert.equal(body.status, "degraded");
});

test("global revocation rejects current and raw-secret legacy tokens", async () => {
  const { load, state } = securityFixture();
  const tokens = load("@/app/lib/desktop-token");
  const current = await tokens.createDesktopToken("user-1");
  const legacy = legacyToken(state.now);
  assert.equal((await tokens.verifyActiveDesktopToken(legacy)).userId, "user-1");
  await tokens.revokeAllDesktopTokens("user-1");
  assert.equal(await tokens.verifyActiveDesktopToken(current), null);
  assert.equal(await tokens.verifyActiveDesktopToken(legacy), null);
  const fresh = await tokens.createDesktopToken("user-1");
  assert.equal((await tokens.verifyActiveDesktopToken(fresh)).version, 1);
});

test("legacy sign-out revokes all legacy sessions and deleted users fail closed", async () => {
  const { load, state } = securityFixture();
  const tokens = load("@/app/lib/desktop-token");
  const legacy = legacyToken(state.now);
  await tokens.revokeDesktopToken(tokens.verifyDesktopToken(legacy));
  assert.equal(await tokens.verifyActiveDesktopToken(legacy), null);
  const current = await tokens.createDesktopToken("user-1");
  await tokens.verifyActiveDesktopToken(current);
  assert.equal(state.cache.get("user-1:exists"), true);
  // Deleting an account expires its cache through the user delete hook.
  state.users.delete("user-1");
  state.invalidationWorks = true;
  await load("@/app/lib/account-cache").expireUserCache("user-1");
  assert.equal(await tokens.verifyActiveDesktopToken(current), null);
  await assert.rejects(() => tokens.createDesktopToken("user-1"));
});

test("token exchange rejects browser and text/plain requests before DB access", async () => {
  const { load, state } = securityFixture();
  const { POST } = load("@/app/api/desktop/token/route");
  assert.equal((await POST(exchangeRequest("x".repeat(43), verifier, { origin }))).status, 403);
  assert.equal((await POST(exchangeRequest("x".repeat(43), verifier, { "content-type": "text/plain" }))).status, 415);
  assert.equal(state.queries.length, 0);
});

test("database failure yields a service error rather than minting a token", async () => {
  const { load, state } = securityFixture();
  state.failDatabase = true;
  const response = await load("@/app/api/desktop/token/route").POST(exchangeRequest("x".repeat(43)));
  assert.equal(response.status, 503);
  assert.equal(Object.hasOwn(await response.json(), "token"), false);
});

test("connection-string TLS overrides weak sslmode settings", () => {
  const { load } = securityFixture();
  const { databaseConnectionString } = load("@/app/lib/database-config");
  for (const mode of ["disable", "require", "prefer", "verify-ca", "no-verify"]) {
    const url = new URL(databaseConnectionString(`postgresql://fixture:password@db.test/app?sslmode=${mode}&application_name=fixture`));
    assert.equal(url.searchParams.get("sslmode"), "verify-full");
    assert.equal(url.searchParams.get("application_name"), "fixture");
    assert.equal(url.hostname, "db.test");
  }
});

test("stats reject browser and text/plain reports without writing counters", async () => {
  const { load, state } = securityFixture();
  const { POST } = load("@/app/api/stats/clips/route");
  const report = (headers) => new Request(`${origin}/api/stats/clips`, {
    method: "POST", headers, body: JSON.stringify({ clip: 1, clip_seconds: 30 }),
  });
  assert.equal((await POST(report({ origin: "https://attacker.test", "content-type": "text/plain" }))).status, 403);
  assert.equal((await POST(report({ "content-type": "text/plain" }))).status, 415);
  assert.equal(state.statsWrites.length, 0);
  assert.equal((await POST(report({ "content-type": "application/json" }))).status, 204);
  assert.equal(state.statsWrites.length, 1);
  state.allowance = false;
  assert.equal((await POST(report({ "content-type": "application/json" }))).status, 429);
  assert.equal(state.statsWrites.length, 1);
});

test("Xbox authorization requires a signed issuedAt and expires after ten minutes", () => {
  const { load, state } = securityFixture();
  const { readXboxAuthorization } = load("@/app/lib/xbox");
  const key = load("@/app/lib/secret").purposeKey("xbox-oauth");
  const cookie = (claims) => {
    const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
    return `${payload}.${createHmac("sha256", key).update(payload).digest("base64url")}`;
  };
  assert.equal(readXboxAuthorization(cookie({ state: "fixture", verifier })), null);
  const valid = cookie({ state: "fixture", verifier, issuedAt: state.now });
  assert.equal(readXboxAuthorization(valid).state, "fixture");
  state.now += 600_001;
  assert.equal(readXboxAuthorization(valid), null);
});

test("production rejects missing secrets and derived purpose keys differ", () => {
  const { load, env } = securityFixture();
  const secret = load("@/app/lib/secret");
  assert.notEqual(secret.purposeKey("desktop-token").toString("hex"), secret.purposeKey("xbox-oauth").toString("hex"));
  env.NODE_ENV = "production";
  delete env.BETTER_AUTH_SECRET;
  assert.throws(() => secret.authSecret(), /BETTER_AUTH_SECRET is not set/);
  assert.throws(() => secret.purposeKey("desktop-token"), /BETTER_AUTH_SECRET is not set/);
});

test("concurrent quota requests across instances cannot exceed the daily cap", async () => {
  const { load, reload, state } = securityFixture({ realIpAllowance: true });
  const first = load("@/app/lib/ip-allowance");
  const second = reload("@/app/lib/ip-allowance");
  const results = await Promise.all(Array.from({ length: 30 }, (_, index) =>
    (index % 2 ? first : second).takeDailyAllowance("clips", "192.0.2.10", 100, 2000)));
  assert.equal(results.filter(Boolean).length, 20);
  assert.equal([...state.allowances.values()][0], 2000);
  assert.equal([...state.runtimeCache.values()].every((value) => value === true), true);
  assert.equal([...state.allowances.keys()][0].includes("192.0.2.10"), false);
});

test("downloads count once per asset/address/day despite concurrent requests and cache outage", async () => {
  const { load, reload, state } = securityFixture({ realIpAllowance: true });
  state.cacheUnavailable = true;
  const { GET } = load("@/app/download/[asset]/route");
  const request = () => new Request(`${origin}/download/ClypDat-Setup.exe`, {
    headers: { "user-agent": "Mozilla/5.0", "x-forwarded-for": "192.0.2.10" },
  });
  const params = { params: Promise.resolve({ asset: "ClypDat-Setup.exe" }) };
  const results = await Promise.all(Array.from({ length: 12 }, () => GET(request(), params)));
  assert.equal(results.every((response) => response.status === 302), true);
  await Promise.all(state.afterJobs.splice(0).map((action) => action()));
  assert.equal(state.downloads.get("ClypDat-Setup.exe"), 1);
  assert.equal(await reload("@/app/lib/ip-allowance").takeDailyAllowance("download-ClypDat-Setup.exe", "192.0.2.10", 1, 1), false);
  state.now += 86_400_000;
  await GET(request(), params);
  await Promise.all(state.afterJobs.splice(0).map((action) => action()));
  assert.equal(state.downloads.get("ClypDat-Setup.exe"), 2);
});

test("actual auth configuration preserves Discord email and production TLS/origins", () => {
  const { load, state, env } = securityFixture({ realAuth: true });
  env.DISCORD_CLIENT_ID = "fixture-discord-client";
  env.DISCORD_CLIENT_SECRET = "fixture-discord-secret";
  env.DATABASE_URL = "postgresql://fixture:password@db.test/app?sslmode=require";
  env.NODE_ENV = "production";
  load("@/app/lib/auth");
  const options = state.authOptions;
  assert.equal(options.socialProviders.discord.clientId, "fixture-discord-client");
  assert.equal(Object.hasOwn(options.socialProviders.discord, "overrideUserInfoOnSignIn"), false);
  assert.equal(options.socialProviders.discord.prompt, "consent");
  assert.equal(options.trustedOrigins.includes("http://localhost:3000"), false);
  assert.equal(state.poolOptions.ssl, true);
  assert.equal(new URL(state.poolOptions.connectionString).searchParams.get("sslmode"), "verify-full");
});

test("actual credential update hook revokes tokens and ignores provider profile updates", async () => {
  const { load, state } = securityFixture({ realAuth: true });
  load("@/app/lib/auth");
  const tokens = load("@/app/lib/desktop-token");
  const token = await tokens.createDesktopToken("user-1");
  const after = state.authOptions.databaseHooks.account.update.after;
  // BetterAuth updateAccount/change-password supplies the updated account row.
  await after({ id: "discord-1", userId: "user-1", providerId: "discord" });
  assert.equal((await tokens.verifyActiveDesktopToken(token)).userId, "user-1");
  await after({ id: "credential-1", userId: "user-1", providerId: "credential", password: "new-fixture-hash" });
  assert.equal(await tokens.verifyActiveDesktopToken(token), null);
});

test("adding a password to an existing OAuth account revokes its desktop sessions", async () => {
  const { load, state } = securityFixture({ realAuth: true });
  load("@/app/lib/auth");
  const tokens = load("@/app/lib/desktop-token");
  const token = await tokens.createDesktopToken("user-1");
  const after = state.authOptions.databaseHooks.account.create.after;
  await after({ id: "new-discord", userId: "user-1", providerId: "discord" });
  assert.equal((await tokens.verifyActiveDesktopToken(token)).userId, "user-1");
  await after({ id: "new-credential", userId: "user-1", providerId: "credential", password: "fixture-hash" });
  assert.equal(await tokens.verifyActiveDesktopToken(token), null);
});

test("actual revoke-sessions success hook revokes every desktop token", async () => {
  const { load, state } = securityFixture({ realAuth: true });
  load("@/app/lib/auth");
  const tokens = load("@/app/lib/desktop-token");
  const token = await tokens.createDesktopToken("user-1");
  await state.authOptions.hooks.after({
    path: "/revoke-sessions", context: { session: state.session, returned: { status: true } },
  });
  assert.equal(await tokens.verifyActiveDesktopToken(token), null);
});

