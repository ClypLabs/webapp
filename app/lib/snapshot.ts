import { MIRROR_BASE } from "@/app/lib/mirror";

const FETCH_TIMEOUT_MS = 8_000;

// Serves a release snapshot that the sync script wrote to R2. The payloads are
// byte-for-byte the shape of the GitHub releases API, so the app's updater can
// point at these URLs without changing how it parses anything.
//
// This endpoint is deliberately dumb: it never calls GitHub. Proxying GitHub
// here would fail in exactly the outage the mirror exists for. The updater
// decides when to fall back; this side only has to keep answering.
export async function serveSnapshot(request: Request, key: string) {
  if (!MIRROR_BASE) {
    return Response.json(
      { error: "Mirror is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const incomingETag = request.headers.get("if-none-match");

  let upstream: Response;
  try {
    upstream = await fetch(`${MIRROR_BASE}/${key}`, {
      headers: incomingETag ? { "If-None-Match": incomingETag } : undefined,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    return Response.json(
      { error: "Mirror is unreachable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  // Pass a 304 straight through. The updater polls on a timer for the life of
  // the app and almost always finds nothing new, so the conditional request is
  // the common case, not the rare one.
  if (upstream.status === 304) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: upstream.headers.get("etag") ?? incomingETag ?? "",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }

  if (!upstream.ok) {
    return Response.json(
      { error: "Snapshot is unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = await upstream.text();
  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=0, must-revalidate",
  };

  const etag = upstream.headers.get("etag");
  if (etag) headers.ETag = etag;

  return new Response(body, { status: 200, headers });
}
