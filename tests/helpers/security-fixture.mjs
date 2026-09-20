import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as crypto from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const TEST_SECRET = "security-fixture-secret-never-used-by-the-app";

// Run the real route/token modules with an explicit import allowlist. No .env,
// auth server, live database, runtime cache, or outbound network is reachable.
export function securityFixture({ realIpAllowance = false, realAuth = false } = {}) {
  const state = {
    now: 1_800_000_000_000,
    users: new Map([["user-1", { name: "Fixture", image: null }]]),
    auth: new Map(),
    codes: new Map(),
    cache: new Map(),
    cacheTtl: new Map(),
    invalidationWorks: false,
    queries: [],
    session: { user: { id: "user-1" } },
    sessionReads: 0,
    statsWrites: [],
    allowance: true,
    failDatabase: false,
    allowances: new Map(),
    runtimeCache: new Map(),
    cacheUnavailable: false,
    downloads: new Map(),
    afterJobs: [],
    authOptions: null,
    poolOptions: null,
  };
  const env = {
    NODE_ENV: "test",
    BETTER_AUTH_SECRET: TEST_SECRET,
    XBOX_CLIENT_ID: "fixture-client",
    BETTER_AUTH_URL: "https://clypdat.test",
  };
  const authState = (id) => {
    if (!state.auth.has(id)) state.auth.set(id, { version: 0, revoked: [] });
    return state.auth.get(id);
  };
  const pool = {
    async query(statement, args = []) {
      if (state.failDatabase) throw new Error("Fixture database unavailable");
      const sql = statement.replace(/\s+/g, " ").trim();
      state.queries.push({ sql, args });
      if (sql.startsWith("CREATE TABLE IF NOT EXISTS")) return { rows: [] };
      if (sql.startsWith("INSERT INTO clypdat_stats_allowance")) {
        assert.match(sql, /ON CONFLICT \(bucket\) DO UPDATE SET used = clypdat_stats_allowance.used \+ EXCLUDED.used WHERE clypdat_stats_allowance.used <= \$3 - EXCLUDED.used RETURNING used$/);
        const [key, amount, limit] = args;
        const used = state.allowances.get(key) ?? 0;
        if (used > limit - amount) return { rows: [] };
        state.allowances.set(key, used + amount);
        return { rows: [{ used: used + amount }] };
      }
      if (sql.startsWith("INSERT INTO clypdat_download_stats")) {
        state.downloads.set(args[0], (state.downloads.get(args[0]) ?? 0) + 1);
        return { rows: [] };
      }
      if (sql === "SELECT asset, count FROM clypdat_download_stats") {
        return { rows: Array.from(state.downloads, ([asset, count]) => ({ asset, count: String(count) })) };
      }
      if (sql === "DELETE FROM clypdat_desktop_connect WHERE expires_at <= NOW()") {
        for (const [key, code] of state.codes) {
          if (code.expiresAt <= state.now) state.codes.delete(key);
        }
        return { rows: [] };
      }
      if (sql.startsWith("INSERT INTO clypdat_desktop_connect")) {
        const [hash, userId, challenge, ttl] = args;
        assert.match(hash, /^[a-f0-9]{64}$/);
        assert.equal(ttl, 60);
        assert.ok(state.users.has(userId));
        state.codes.set(hash, { userId, challenge, expiresAt: state.now + ttl * 1000 });
        return { rows: [] };
      }
      if (sql.startsWith("DELETE FROM clypdat_desktop_connect WHERE code_hash = $1")) {
        // Model one PostgreSQL DELETE RETURNING statement, not cache get/delete.
        assert.match(sql, /expires_at > NOW\(\) RETURNING user_id AS "userId", challenge$/);
        const code = state.codes.get(args[0]);
        if (!code || code.expiresAt <= state.now) return { rows: [] };
        state.codes.delete(args[0]);
        return { rows: [{ userId: code.userId, challenge: code.challenge }] };
      }
      if (sql.startsWith("SELECT COALESCE(a.version, 0)")) {
        assert.match(sql, /FROM "user" u LEFT JOIN clypdat_desktop_auth a ON a.user_id = u.id WHERE u.id = \$1$/);
        return { rows: state.users.has(args[0]) ? [structuredClone(authState(args[0]))] : [] };
      }
      if (sql.startsWith("INSERT INTO clypdat_desktop_auth (user_id, version)")) {
        assert.match(sql, /version = clypdat_desktop_auth.version \+ 1/);
        const auth = authState(args[0]);
        auth.version++;
        auth.revoked = [];
        return { rows: [] };
      }
      if (sql.startsWith("INSERT INTO clypdat_desktop_auth (user_id, revoked)")) {
        const [userId, jti, exp, now] = args;
        const auth = authState(userId);
        auth.revoked = auth.revoked.filter((entry) => entry.exp > now);
        auth.revoked.push({ jti, exp });
        return { rows: [] };
      }
      if (sql === 'SELECT name, image FROM "user" WHERE id = $1') {
        return { rows: state.users.has(args[0]) ? [state.users.get(args[0])] : [] };
      }
      throw new Error(`Unexpected fixture SQL: ${sql}`);
    },
  };
  class NextResponse extends Response {
    static json(body, init) { return Response.json(body, init); }
    static redirect(url, status = 307) {
      return new NextResponse(null, { status, headers: { location: String(url) } });
    }
  }
  const stubs = {
    "better-auth": {
      betterAuth: (options) => {
        state.authOptions = options;
        return { api: { getSession: async () => { state.sessionReads++; return state.session; } } };
      },
    },
    "better-auth/api": { createAuthMiddleware: (handler) => handler },
    pg: {
      Pool: class {
        constructor(options) { state.poolOptions = options; return pool; }
      },
    },
    "next/server": { NextResponse, after: (action) => { state.afterJobs.push(action); } },
    "@vercel/functions": {
      getCache: ({ namespace }) => ({
        async get(key) {
          if (state.cacheUnavailable) throw new Error("Fixture cache unavailable");
          return state.runtimeCache.get(`${namespace}:${key}`) ?? null;
        },
        async set(key, value) {
          if (state.cacheUnavailable) throw new Error("Fixture cache unavailable");
          state.runtimeCache.set(`${namespace}:${key}`, value);
        },
      }),
    },
    "@/app/lib/mirror": {
      GITHUB_RELEASE_BASE: "https://downloads.example.test/latest",
      MIRROR_BASE: "",
      isMirroredAsset: (name) => ["ClypDat-Setup.exe", "ClypDat-Portable.exe"].includes(name),
      isGitHubReachable: async () => true,
    },
    "@/app/lib/auth": {
      pool,
      auth: { api: { getSession: async () => { state.sessionReads++; return state.session; } } },
    },
    "@/app/lib/account-cache": {
      readCached: async (id, key) => state.cache.get(`${id}:${key}`) ?? null,
      writeCached: async (id, key, value, ttl) => {
        state.cache.set(`${id}:${key}`, value);
        state.cacheTtl.set(key, ttl);
      },
      // Simulates stale caches even after invalidation is requested, unless a
      // test opts in to invalidation working, as it does in production.
      expireUserCache: async (id) => {
        if (!state.invalidationWorks) return;
        for (const key of [...state.cache.keys()]) if (key.startsWith(`${id}:`)) state.cache.delete(key);
      },
    },
    "@/app/lib/ip-allowance": {
      clientAddress: () => "192.0.2.10",
      takeDailyAllowance: async () => state.allowance,
    },
    "@/app/lib/clip-stats": {
      CLIP_STAT_KINDS: ["clip", "auto_clip", "full_session"],
      MAX_PER_REQUEST: 100,
      MAX_SECONDS_PER_SAVE: { clip: 600, auto_clip: 600, full_session: 86400 },
      addClipStats: async (value) => { state.statsWrites.push(value); },
      getClipStats: async () => ({ clip: 0, auto_clip: 0, full_session: 0, total: 0 }),
    },
  };
  if (realIpAllowance) delete stubs["@/app/lib/ip-allowance"];
  if (realAuth) delete stubs["@/app/lib/auth"];
  const modules = new Map();
  function load(specifier) {
    if (Object.hasOwn(stubs, specifier)) return stubs[specifier];
    if (specifier === "node:crypto") return crypto;
    if (!specifier.startsWith("@/app/")) throw new Error(`Unexpected fixture import: ${specifier}`);
    const path = resolve(root, `${specifier.slice(2)}.ts`);
    if (modules.has(path)) return modules.get(path).exports;
    const fixtureModule = { exports: {} };
    modules.set(path, fixtureModule);
    const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
      fileName: path,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    const context = vm.createContext({
      module: fixtureModule, exports: fixtureModule.exports, require: load,
      process: { env }, Buffer, URL, URLSearchParams, Headers, Request, Response, FormData, Error,
      Date: class extends Date {
        constructor(...args) { super(...(args.length ? args : [state.now])); }
        static now() { return state.now; }
      },
      console: { info() {}, warn() {}, error() {} },
      fetch() { throw new Error("Network is prohibited in security fixtures"); },
    });
    new vm.Script(outputText, { filename: path }).runInContext(context);
    return fixtureModule.exports;
  }
  function reload(specifier) {
    modules.delete(resolve(root, `${specifier.slice(2)}.ts`));
    return load(specifier);
  }
  return { load, reload, state, env };
}
