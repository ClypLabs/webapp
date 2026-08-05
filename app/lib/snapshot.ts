import { MIRROR_BASE } from "@/app/lib/mirror";

// Points the caller at a release snapshot the sync script wrote to R2. The
// payloads are byte-for-byte the shape of the GitHub releases API, so the app's
// updater can use these URLs without changing how it parses anything.
//
// This redirects rather than proxying, for the same two reasons as
// /download/[asset]:
//
//  - Cloudflare answers requests from Vercel's datacenter IPs with 403 (bot
//    protection on the zone), so a server-side fetch here fails while the very
//    same URL works from any normal client. Redirecting hands the fetch to the
//    caller, which is not what Cloudflare is filtering.
//  - It keeps the bytes off Vercel's bandwidth bill.
//
// Conditional requests still work: the client re-sends If-None-Match to R2 and
// gets its 304 directly, which matters because the updater polls on a timer for
// the whole life of the app and almost always finds nothing new.
//
// Deliberately never calls GitHub. Proxying it would fail in the one situation
// this endpoint exists for.
export function serveSnapshot(_request: Request, key: string) {
  if (!MIRROR_BASE) {
    return Response.json(
      { error: "Mirror is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: `${MIRROR_BASE}/${key}`,
      "Cache-Control": "no-store",
    },
  });
}
