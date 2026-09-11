import { NextResponse } from "next/server";
import {
  addClipStats,
  CLIP_STAT_KINDS,
  getClipStats,
  MAX_PER_REQUEST,
  MAX_SECONDS_PER_SAVE,
  type ClipStatAdd,
  type ClipStatKind,
} from "@/app/lib/clip-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Best-effort flood guard. It lives in one function instance's memory, so it
// resets on cold starts and is not shared between instances - enough to stop
// one machine hammering the endpoint in a loop, not a real rate limiter. The
// IP is only held here for the length of the window and is never stored.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;
const recent = new Map<string, { count: number; resetAt: number }>();

function allow(ip: string): boolean {
  const now = Date.now();
  if (recent.size > 5000) {
    for (const [key, entry] of recent) if (entry.resetAt <= now) recent.delete(key);
  }
  const entry = recent.get(ip);
  if (!entry || entry.resetAt <= now) {
    recent.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  entry.count += 1;
  return entry.count <= MAX_REQUESTS_PER_WINDOW;
}

// Body: { "clip": 1, "clip_seconds": 60 } or any mix of clip / auto_clip /
// full_session. Each count is a whole number from 0 to MAX_PER_REQUEST; each
// `<kind>_seconds` is the gameplay those saves hold, at most count x
// MAX_SECONDS_PER_SAVE for that kind. Seconds are optional, since app builds
// from before length tracking send counts alone. Unknown keys are ignored.
export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allow(ip)) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Expected a JSON object" }, { status: 400 });
  }

  const fields = body as Record<string, unknown>;
  const isWhole = (value: unknown, max: number) =>
    Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;

  const adds: Partial<Record<ClipStatKind, ClipStatAdd>> = {};
  let sum = 0;
  for (const kind of CLIP_STAT_KINDS) {
    const count = fields[kind] ?? 0;
    const seconds = fields[`${kind}_seconds`] ?? 0;
    if (!isWhole(count, MAX_PER_REQUEST)) {
      return NextResponse.json(
        { error: `${kind} must be a whole number from 0 to ${MAX_PER_REQUEST}` },
        { status: 400 },
      );
    }
    const maxSeconds = (count as number) * MAX_SECONDS_PER_SAVE[kind];
    if (!isWhole(seconds, maxSeconds)) {
      return NextResponse.json(
        { error: `${kind}_seconds must be a whole number from 0 to ${maxSeconds}` },
        { status: 400 },
      );
    }
    if ((count as number) > 0) adds[kind] = { count: count as number, seconds: seconds as number };
    sum += count as number;
  }
  if (sum === 0) return NextResponse.json({ error: "Nothing to count" }, { status: 400 });

  try {
    await addClipStats(adds);
    return new NextResponse(null, { status: 204 });
  } catch {
    // The app keeps the count and retries, so a failure here loses nothing.
    return NextResponse.json({ error: "Counter unavailable" }, { status: 503 });
  }
}

// { clip, auto_clip, full_session, total, seconds: { clip, auto_clip, full_session, total } }
export async function GET() {
  try {
    // Indented, because this is also the URL people open in a browser tab.
    return new NextResponse(JSON.stringify(await getClipStats(), null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
      },
    });
  } catch {
    return NextResponse.json({ error: "Counter unavailable" }, { status: 503 });
  }
}
