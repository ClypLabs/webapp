import assert from "node:assert/strict";
import test from "node:test";
import * as crypto from "node:crypto";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const id = "11111111-2222-4333-8444-555555555555";
const origin = "https://clypdat.test";
const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(30)]);

function fixture() {
  const state = { admin: false, signedIn: true, allowance: true, calls: [], reports: new Map(), capacity: 0 };
  const query = async (sql, args = []) => {
    sql = sql.replace(/\s+/g, " ").trim();
    state.calls.push({ sql, args });
    if (sql.startsWith("CREATE TABLE") || ["BEGIN", "COMMIT", "ROLLBACK"].includes(sql) || sql.startsWith("SELECT pg_advisory")) return { rows: [] };
    if (sql.startsWith("DELETE FROM clypdat_support_reports WHERE expires_at")) {
      for (const [key, report] of state.reports) if (report.expired) state.reports.delete(key);
      return { rows: [] };
    }
    if (sql.startsWith("SELECT user_id")) return { rows: state.reports.has(args[0]) ? [state.reports.get(args[0])] : [] };
    if (sql.startsWith("SELECT COALESCE(SUM(bytes)")) return { rows: [{ bytes: state.capacity, reports: state.reports.size }] };
    if (sql.startsWith("INSERT INTO clypdat_support_reports")) {
      const [reportId, user_id, message, version, build, bundle, bytes] = args;
      state.reports.set(reportId, { id: reportId, user_id, message, version, build, bundle, bytes, resolved: false,
        createdAt: new Date("2026-09-23T12:00:00Z"), expiresAt: new Date("2026-10-23T12:00:00Z") });
      return { rows: [], rowCount: 1 };
    }
    if (sql.startsWith("SELECT r.id")) return { rows: [...state.reports.values()].filter(r => !r.expired).map(({ bundle, ...metadata }) => metadata) };
    if (sql.startsWith("SELECT bundle")) {
      assert.match(sql, /expires_at > NOW\(\)/);
      const report = state.reports.get(args[0]);
      return { rows: report && !report.expired ? [{ bundle: report.bundle }] : [] };
    }
    if (sql.startsWith("UPDATE clypdat_support_reports")) {
      const report = state.reports.get(args[0]);
      if (report) report.resolved = args[1];
      return { rowCount: report ? 1 : 0 };
    }
    if (sql.startsWith("DELETE FROM clypdat_support_reports WHERE id")) return { rowCount: state.reports.delete(args[0]) ? 1 : 0 };
    throw new Error(`Unexpected SQL: ${sql}`);
  };
  const stubs = {
    "node:crypto": crypto,
    "@/app/lib/auth": { pool: { query, connect: async () => ({ query, release() {} }) } },
    "@/app/lib/admin": { currentAdmin: async () => state.admin ? { id: "admin" } : null },
    "@/app/lib/desktop-token": { verifyActiveDesktopToken: async token => token === "valid" && state.signedIn ? { userId: "user" } : null },
    "@/app/lib/desktop-connect": { isSameOriginPost: request => request.headers.get("origin") === origin && request.headers.get("sec-fetch-site") === "same-origin" },
    "@/app/lib/ip-allowance": { clientAddress: () => "fixture-ip", takeDailyAllowance: async () => state.allowance },
  };
  const modules = new Map();
  function load(name) {
    if (stubs[name]) return stubs[name];
    if (modules.has(name)) return modules.get(name);
    assert.ok(name.startsWith("@/app/"), `Unexpected import: ${name}`);
    const source = readFileSync(new URL(`../${name.slice(2)}.ts`, import.meta.url), "utf8");
    const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const module = { exports: {} };
    const context = vm.createContext({
      module, exports: module.exports, require: load, Buffer, Request, Response, Headers, Blob, FormData,
      Error, Uint8Array, console, process: { env: { NODE_ENV: "test", BETTER_AUTH_SECRET: "support-fixture-secret-never-used-in-production" } },
    });
    new vm.Script(outputText, { filename: name }).runInContext(context);
    modules.set(name, module.exports);
    return module.exports;
  }
  return { load, state };
}

function upload({ token = "valid", bundle = zip, message = "Recording stopped after the match.", headers = {} } = {}) {
  const form = new FormData();
  form.set("id", id);
  form.set("message", message);
  form.set("version", "1.6.0");
  form.set("build", "1.6.0+abcdef12");
  form.set("bundle", new Blob([bundle]), "diagnostics.zip");
  return new Request(`${origin}/api/desktop/support`, { method: "POST", headers: { authorization: `Bearer ${token}`, ...headers }, body: form });
}
const context = { params: Promise.resolve({ id }) };
const adminRequest = (method = "GET", body) => new Request(`${origin}/api/admin/support/${id}`, {
  method, headers: { origin, "sec-fetch-site": "same-origin", "content-type": "application/json" },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

test("diagnostic uploads require an active desktop account and reject browser origins", async () => {
  const { load, state } = fixture();
  const { POST } = load("@/app/api/desktop/support/route");
  assert.equal((await POST(upload({ token: "invalid" }))).status, 401);
  state.signedIn = false;
  assert.equal((await POST(upload())).status, 401);
  assert.equal((await POST(upload({ headers: { origin } }))).status, 403);
  assert.equal(state.calls.length, 0);
});

test("valid submissions are encrypted, private, and retry without duplicate storage", async () => {
  const { load, state } = fixture();
  const { POST } = load("@/app/api/desktop/support/route");
  const first = await POST(upload());
  assert.equal(first.status, 201);
  assert.equal((await first.json()).id, id);
  assert.equal((await POST(upload())).status, 200);
  assert.equal(state.reports.size, 1);
  assert.notDeepEqual(state.reports.get(id).bundle, zip);
  assert.ok(state.calls.some(({ sql }) => sql === "SELECT pg_advisory_xact_lock($1)"));
  state.reports.get(id).user_id = "someone-else";
  assert.equal((await POST(upload())).status, 409);
});

test("oversized and invalid uploads, exhausted limits and full inboxes cannot create reports", async () => {
  const { load, state } = fixture();
  const { POST } = load("@/app/api/desktop/support/route");
  assert.equal((await POST(upload({ bundle: Buffer.from("not a valid diagnostic zip bundle") }))).status, 400);
  assert.equal((await POST(upload({ message: "short" }))).status, 400);
  assert.equal((await POST(upload({ bundle: Buffer.alloc(3 * 1024 * 1024 + 1) }))).status, 413);
  state.allowance = false;
  assert.equal((await POST(upload())).status, 429);
  state.allowance = true;
  state.capacity = 100 * 1024 * 1024;
  assert.equal((await POST(upload())).status, 503);
  assert.equal(state.reports.size, 0);
});

test("streaming uploads are capped without trusting Content-Length", async () => {
  const { load } = fixture();
  const { readSupportInput, MAX_SUPPORT_REQUEST_BYTES } = load("@/app/lib/support-input");
  let cancelled = false;
  const request = new Request(`${origin}/upload`, {
    method: "POST", duplex: "half", headers: { "content-type": "multipart/form-data; boundary=fixture", "content-length": "1" },
    body: new ReadableStream({
      pull(controller) { controller.enqueue(new Uint8Array(MAX_SUPPORT_REQUEST_BYTES + 1)); },
      cancel() { cancelled = true; },
    }),
  });
  await assert.rejects(readSupportInput(request), error => error.status === 413);
  assert.equal(cancelled, true);
});

test("all inbox operations require admin authentication, including direct ZIP downloads", async () => {
  const { load, state } = fixture();
  const route = load("@/app/api/admin/support/[id]/route");
  assert.equal((await load("@/app/api/admin/support/route").GET(adminRequest())).status, 404);
  assert.equal((await route.GET(adminRequest(), context)).status, 404);
  assert.equal((await route.PATCH(adminRequest("PATCH", { resolved: true }), context)).status, 404);
  assert.equal((await route.DELETE(adminRequest("DELETE"), context)).status, 404);
  assert.equal(state.calls.length, 0);
});

test("admin download uses attachment/no-store and expired reports cannot be downloaded", async () => {
  const { load, state } = fixture();
  await load("@/app/api/desktop/support/route").POST(upload());
  state.admin = true;
  const route = load("@/app/api/admin/support/[id]/route");
  const result = await route.GET(adminRequest(), context);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  assert.equal(result.headers.get("x-content-type-options"), "nosniff");
  assert.match(result.headers.get("content-disposition"), /^attachment;/);
  assert.deepEqual(Buffer.from(await result.arrayBuffer()), zip);
  state.reports.get(id).expired = true;
  assert.equal((await route.GET(adminRequest(), context)).status, 404);
  await load("@/app/api/admin/support/route").GET(adminRequest());
  assert.equal(state.reports.size, 0);
});

test("admin state changes reject cross-site requests and support resolve/delete", async () => {
  const { load, state } = fixture();
  await load("@/app/api/desktop/support/route").POST(upload());
  state.admin = true;
  const route = load("@/app/api/admin/support/[id]/route");
  for (const method of ["PATCH", "DELETE"]) {
    assert.equal((await route[method](new Request(`${origin}/api/admin/support/${id}`, { method }), context)).status, 403);
  }
  assert.equal((await route.PATCH(adminRequest("PATCH", { resolved: true }), context)).status, 200);
  assert.equal(state.reports.get(id).resolved, true);
  assert.equal((await route.DELETE(adminRequest("DELETE"), context)).status, 204);
  assert.equal(state.reports.size, 0);
});

test("sealed bundles reject tampering and cannot be substituted between report IDs", () => {
  const { load } = fixture();
  const { sealSupportBundle, openSupportBundle } = load("@/app/lib/support");
  const sealed = sealSupportBundle(id, zip);
  assert.deepEqual(openSupportBundle(id, sealed), zip);
  assert.throws(() => openSupportBundle(crypto.randomUUID(), sealed));
  sealed[sealed.length - 1] ^= 1;
  assert.throws(() => openSupportBundle(id, sealed));
});
