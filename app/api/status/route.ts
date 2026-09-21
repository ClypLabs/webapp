import { getCache } from "@vercel/functions";
import { pool } from "@/app/lib/auth";
import { databaseSeenReachable, noteDatabaseReachable } from "@/app/lib/database-heartbeat";
import { GITHUB_RELEASE_BASE, MIRROR_BASE, MIRROR_LATEST_KEY, isGitHubReachable } from "@/app/lib/mirror";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whether the pieces behind ClypDat are reachable:
//   website  - this answering at all
//   database - accounts, Xbox linking, the clip counter (Neon)
//   github   - releases and the updater's first source
//   mirror   - the release mirror downloads and updates fall back to (R2)
//
// Checked at most every ten minutes and cached. The database is the exception
// (see checkDatabase): a real query wakes Neon, which bills for being awake, so
// it is answered from recent real traffic where it can be.

type State = "operational" | "down" | "not configured";
type Status = {
  status: "operational" | "degraded";
  checked_at: string;
  services: { website: State; database: State; github: State; mirror: State };
};

const CHECK_TTL_SECONDS = 10 * 60;
const TIMEOUT_MS = 4_000;
const statusCache = () => getCache({ namespace: "clypdat-status" });
// Bump when the checks change, so a deploy does not keep serving a verdict
// the old checks cached.
const STATUS_KEY = "status-v4";
const DATABASE_VERDICT_KEY = "database-verdict";
// A probe that found the database up is trusted for half an hour; one that found
// it down is rechecked within the minute, so recovery shows up quickly.
const DATABASE_UP_TTL_SECONDS = 30 * 60;
const DATABASE_DOWN_TTL_SECONDS = 60;

// Recent successful traffic answers this without touching the database. Only
// when nothing has reached it lately is it queried, and that verdict is kept for
// half an hour so a page loading the status cannot wake it every ten minutes.
async function checkDatabase(): Promise<State> {
  if (await databaseSeenReachable()) return "operational";
  try {
    const cached = (await statusCache().get(DATABASE_VERDICT_KEY)) as State | undefined;
    if (cached) return cached;
  } catch {
    // Probe instead.
  }
  let state: State = "operational";
  try {
    console.info("[db] status check");
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)),
    ]);
    await noteDatabaseReachable();
  } catch {
    state = "down";
  }
  try {
    await statusCache().set(DATABASE_VERDICT_KEY, state, {
      ttl: state === "operational" ? DATABASE_UP_TTL_SECONDS : DATABASE_DOWN_TTL_SECONDS,
      name: "database-verdict",
    });
  } catch {
    // Probed again next time.
  }
  return state;
}

async function checkMirror(): Promise<State> {
  if (!MIRROR_BASE) return "not configured";
  try {
    const response = await fetch(`${MIRROR_BASE}/${MIRROR_LATEST_KEY}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (response.ok) return "operational";
    // Cloudflare's bot protection answers requests from Vercel's datacenter
    // IPs with a 403, while the same file serves people's own connections
    // (which is who downloads it - the site only ever redirects there) with a
    // 200. A 403 from Cloudflare itself means its edge is up in front of the
    // bucket; only this server-side check is being filtered.
    if (response.status === 403 && response.headers.get("server")?.toLowerCase() === "cloudflare") return "operational";
    return "down";
  } catch {
    return "down";
  }
}

async function check(): Promise<Status> {
  const [database, github, mirror] = await Promise.all([
    checkDatabase(),
    isGitHubReachable(`${GITHUB_RELEASE_BASE}/ClypDat-Setup.exe`).then((ok): State => (ok ? "operational" : "down")),
    checkMirror(),
  ]);
  const services = { website: "operational" as State, database, github, mirror };
  const degraded = Object.values(services).includes("down");
  return { status: degraded ? "degraded" : "operational", checked_at: new Date().toISOString(), services };
}

export async function GET() {
  let status: Status | undefined;
  try {
    status = (await statusCache().get(STATUS_KEY)) as Status | undefined;
  } catch {
    // Check live instead.
  }
  if (!status) {
    status = await check();
    try {
      await statusCache().set(STATUS_KEY, status, { ttl: CHECK_TTL_SECONDS, name: "status" });
    } catch {
      // Uncached: the next request checks again.
    }
  }
  return new Response(JSON.stringify(status, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": `public, s-maxage=${CHECK_TTL_SECONDS}`,
    },
  });
}
