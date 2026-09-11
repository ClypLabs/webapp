import { getCache } from "@vercel/functions";
import { pool } from "@/app/lib/auth";

// Downloads started from clypdat.xyz's /download/<asset> links. Only those:
// the in-app updater and WinGet fetch from GitHub directly (the updater comes
// here only while GitHub is down), so this counts people downloading from the
// website rather than every install. Stored per file, nothing per download -
// no IP, no user agent, no time beyond the running total.

// The files a person downloads. The release manifest and its signature also
// pass through /download, but only the updater asks for those.
export const COUNTED_DOWNLOADS = ["ClypDat-Setup.exe", "ClypDat-Portable.exe", "ClypDat-win-x64.zip", "ClypDat.msi"] as const;
export type CountedDownload = (typeof COUNTED_DOWNLOADS)[number];

export function isCountedDownload(asset: string): asset is CountedDownload {
  return (COUNTED_DOWNLOADS as readonly string[]).includes(asset);
}

// Link unfurlers and crawlers request download URLs too (a Discord message
// with the link in it fetches it). They are not downloads.
const NOT_A_PERSON = /bot|crawl|spider|slurp|preview|unfurl|facebookexternalhit|embed|headless/i;

export function looksLikeAPerson(userAgent: string | null): boolean {
  return !!userAgent && !NOT_A_PERSON.test(userAgent);
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  schemaReady ??= pool
    .query(`
      CREATE TABLE IF NOT EXISTS clypdat_download_stats (
        asset TEXT PRIMARY KEY,
        count BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    .then(() => undefined)
    .catch((error) => {
      schemaReady = null;
      throw error;
    });
  return schemaReady;
}

export type DownloadStats = { total: number; files: Record<CountedDownload, number> };

const statsCache = () => getCache({ namespace: "clypdat-stats" });
const DOWNLOADS_KEY = "downloads";

async function cacheDownloads(stats: DownloadStats): Promise<void> {
  try {
    await statsCache().set(DOWNLOADS_KEY, stats, { ttl: 60 * 60, tags: ["download-stats"], name: "download-stats" });
  } catch {
    // Uncached: the next read goes to the database.
  }
}

/** Adds one download. Called after the redirect has gone out, so a slow or
 * sleeping database never delays the download itself. */
export async function recordDownload(asset: CountedDownload): Promise<void> {
  console.info("[db] download count write");
  await ensureSchema();
  await pool.query(
    `INSERT INTO clypdat_download_stats (asset, count) VALUES ($1, 1)
     ON CONFLICT (asset) DO UPDATE SET count = clypdat_download_stats.count + 1, updated_at = NOW()`,
    [asset],
  );
  // Same write-through as the clip totals: the database is awake now, so the
  // page views that follow never have to wake it.
  await cacheDownloads(await readDownloads());
}

export async function getDownloadStats(): Promise<DownloadStats> {
  try {
    const cached = await statsCache().get(DOWNLOADS_KEY);
    if (cached) return cached as DownloadStats;
  } catch {
    // Fall through to the database.
  }
  const stats = await readDownloads();
  await cacheDownloads(stats);
  return stats;
}

async function readDownloads(): Promise<DownloadStats> {
  console.info("[db] download stats read");
  await ensureSchema();
  const result = await pool.query<{ asset: string; count: string }>("SELECT asset, count FROM clypdat_download_stats");
  const files = Object.fromEntries(COUNTED_DOWNLOADS.map((asset) => [asset, 0])) as Record<CountedDownload, number>;
  for (const row of result.rows) {
    if (isCountedDownload(row.asset)) files[row.asset] = Number(row.count);
  }
  return { total: Object.values(files).reduce((sum, count) => sum + count, 0), files };
}
