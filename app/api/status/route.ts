import { getCache } from "@vercel/functions";
import { pool } from "@/app/lib/auth";
import { GITHUB_RELEASE_BASE, MIRROR_BASE, MIRROR_LATEST_KEY, isGitHubReachable } from "@/app/lib/mirror";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whether the pieces behind ClypDat are reachable:
//   website  - this answering at all
//   database - accounts, Xbox linking, the clip counter (Neon)
//   github   - releases and the updater's first source
//   mirror   - the release mirror downloads and updates fall back to (R2)
//
// Checked at most every ten minutes and cached. The database check is a real
// query, and Neon bills for being awake: an uncached status endpoint polled by
// anything would keep the database up around the clock for nothing.

type State = "operational" | "down" | "not configured";
type Status = {
  status: "operational" | "degraded";
  checked_at: string;
  services: { website: State; database: State; github: State; mirror: State };
};

const CHECK_TTL_SECONDS = 10 * 60;
const TIMEOUT_MS = 4_000;
const statusCache = () => getCache({ namespace: "clypdat-status" });

async function checkDatabase(): Promise<State> {
  try {
    console.info("[db] status check");
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS)),
    ]);
    return "operational";
  } catch {
    return "down";
  }
}

async function checkMirror(): Promise<State> {
  if (!MIRROR_BASE) return "not configured";
  try {
    const response = await fetch(`${MIRROR_BASE}/${MIRROR_LATEST_KEY}`, {
      method: "HEAD",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    return response.ok ? "operational" : "down";
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
    status = (await statusCache().get("status")) as Status | undefined;
  } catch {
    // Check live instead.
  }
  if (!status) {
    status = await check();
    try {
      await statusCache().set("status", status, { ttl: CHECK_TTL_SECONDS, name: "status" });
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
