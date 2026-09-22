import { NextResponse } from "next/server";
import { getSignedFeed } from "@/app/lib/notices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The Notice Board feed every desktop app polls (NoticeBoardService.cs). Public
// and signed: the app verifies it against a pinned key, so this route never has
// to be trusted, only reachable.
//
// Cached at the CDN for fifteen seconds, so a notice reaches active apps quickly
// of being published while thousands of polls cost one function call a minute.
export async function GET() {
  try {
    const feed = await getSignedFeed();
    if (!feed) return NextResponse.json({ error: "Notices are not configured" }, { status: 503 });
    return NextResponse.json(feed, {
      headers: { "Cache-Control": "public, max-age=0, s-maxage=15, stale-while-revalidate=15" },
    });
  } catch {
    return NextResponse.json({ error: "Notices are unavailable" }, { status: 503 });
  }
}
