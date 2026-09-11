import { after } from "next/server";
import { isCountedDownload, looksLikeAPerson, recordDownload } from "@/app/lib/download-stats";
import {
  GITHUB_RELEASE_BASE,
  MIRROR_BASE,
  isGitHubReachable,
  isMirroredAsset,
} from "@/app/lib/mirror";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Stable download URLs on our own domain. They resolve to GitHub while GitHub
// is up, and to the R2 mirror when it is not, so the links in the page (and
// anything anyone has bookmarked or blogged) never need to change.
//
// This always redirects and never proxies the bytes: a 302 costs one tiny
// function invocation, while streaming a 277 MB installer through the function
// would bill every download as Vercel bandwidth.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ asset: string }> },
) {
  const { asset } = await params;

  if (!isMirroredAsset(asset)) {
    return new Response("Unknown asset.", { status: 404 });
  }

  // Counted after the redirect is on its way (see download-stats.ts), and only
  // for a GET from something that looks like a browser: HEAD probes and link
  // unfurlers are not downloads. A failure to count never affects the download.
  if (request.method === "GET" && isCountedDownload(asset) && looksLikeAPerson(request.headers.get("user-agent"))) {
    after(() => recordDownload(asset).catch((error) => console.error("Download count failed", error)));
  }

  const githubUrl = `${GITHUB_RELEASE_BASE}/${asset}`;

  if (!MIRROR_BASE) {
    return Response.redirect(githubUrl, 302);
  }

  const target = (await isGitHubReachable(githubUrl))
    ? githubUrl
    : `${MIRROR_BASE}/${asset}`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: target,
      // The choice between GitHub and mirror is a liveness decision. Caching it
      // at the CDN would pin users to whichever host happened to answer first.
      "Cache-Control": "no-store",
    },
  });
}
