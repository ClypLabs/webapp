import { getDownloadStats } from "@/app/lib/download-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Downloads started from clypdat.xyz: { total, files: { "ClypDat-Setup.exe": n, ... } }.
// Not a count of installs - WinGet and the in-app updater download from GitHub.
export async function GET() {
  try {
    return new Response(JSON.stringify(await getDownloadStats(), null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=10",
      },
    });
  } catch {
    return Response.json({ error: "Download stats unavailable" }, { status: 503 });
  }
}
