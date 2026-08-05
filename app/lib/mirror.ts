// Shared config for the release mirror.
//
// GitHub is the source of truth. The mirror exists so downloads and updates
// keep working when GitHub is unreachable - an outage, or the account being
// flagged. Nothing here ever prefers the mirror while GitHub answers.

export const GITHUB_OWNER = "ClypDat";
export const GITHUB_REPO = "ClypDat";

export const GITHUB_RELEASE_BASE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest/download`;

// Public R2 bucket root, e.g. https://mirror.clypdat.xyz or the r2.dev URL.
// Unset (local dev, preview builds without the var) means "no mirror" - every
// route then behaves exactly as it did before the mirror existed.
export const MIRROR_BASE = process.env.MIRROR_BASE_URL?.replace(/\/+$/, "") ?? "";

// Only these names are ever redirected. An open redirect keyed on a path
// segment would let anyone hand out links that look like they come from us.
export const MIRRORED_ASSETS = [
  "ClypDat-Setup.exe",
  "ClypDat-Portable.exe",
  "ClypDat-win-x64.zip",
  "ClypDat.msi",
] as const;

export type MirroredAsset = (typeof MIRRORED_ASSETS)[number];

export function isMirroredAsset(name: string): name is MirroredAsset {
  return (MIRRORED_ASSETS as readonly string[]).includes(name);
}

// Where the sync script writes the GitHub-shaped release snapshots.
export const MIRROR_LATEST_KEY = "api/releases/latest.json";
export const MIRROR_RELEASES_KEY = "api/releases/index.json";

// One probe of GitHub is reused for a minute across requests hitting the same
// warm instance. Without this every download click pays a round trip, and a
// GitHub outage means every click pays the full timeout.
const PROBE_TTL_MS = 60_000;
const PROBE_TIMEOUT_MS = 4_000;

let probe: { reachable: boolean; at: number } | null = null;

export async function isGitHubReachable(url: string): Promise<boolean> {
  const now = Date.now();
  if (probe && now - probe.at < PROBE_TTL_MS) return probe.reachable;

  let reachable = false;
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      cache: "no-store",
    });
    // 404 means the asset genuinely is not published - that is an answer from a
    // healthy GitHub, not an outage, so it must not trigger the mirror.
    reachable = response.ok || response.status === 404;
  } catch {
    reachable = false;
  }

  probe = { reachable, at: now };
  return reachable;
}
