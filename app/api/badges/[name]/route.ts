import { getClipStats } from "@/app/lib/clip-stats";
import { getDownloadStats } from "@/app/lib/download-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shields.io endpoint badges, for the GitHub README:
//   ![](https://img.shields.io/endpoint?url=https://api.clypdat.xyz/v1/badges/clips)
// Names: clips, gameplay, downloads. The format is Shields' endpoint schema:
// https://shields.io/badges/endpoint-badge

const compact = (value: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

function hours(seconds: number): string {
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  return `${compact(Math.round((seconds / 3600) * 10) / 10)} hours`;
}

const badges: Record<string, () => Promise<{ label: string; message: string }>> = {
  clips: async () => ({ label: "clips saved", message: compact((await getClipStats()).total) }),
  gameplay: async () => ({ label: "gameplay saved", message: hours((await getClipStats()).seconds.total) }),
  downloads: async () => ({ label: "downloads", message: compact((await getDownloadStats()).total) }),
};

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const badge = badges[name];
  if (!badge) return Response.json({ error: `Unknown badge. Use one of: ${Object.keys(badges).join(", ")}` }, { status: 404 });
  try {
    const { label, message } = await badge();
    // Shields caches for cacheSeconds as well; five minutes keeps a README
    // badge current without every page view reaching this function.
    return Response.json(
      { schemaVersion: 1, label, message, color: "34d399", cacheSeconds: 300 },
      { headers: { "Cache-Control": "public, s-maxage=300" } },
    );
  } catch {
    return Response.json(
      { schemaVersion: 1, label: name, message: "unavailable", color: "lightgrey", isError: true },
      { headers: { "Cache-Control": "public, s-maxage=60" } },
    );
  }
}
