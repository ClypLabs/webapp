import { getClipHistory, HISTORY_WINDOWS, type HistoryWindow } from "@/app/lib/clip-stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Clips saved per UTC day. ?days= is 7, 30 (default), 90 or 365.
// [{ date, clip, auto_clip, full_session, total, seconds }], oldest first,
// with every day present - days with nothing saved are zeros, not missing.
export async function GET(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get("days") ?? 30);
  if (!(HISTORY_WINDOWS as readonly number[]).includes(requested)) {
    return Response.json({ error: `days must be one of ${HISTORY_WINDOWS.join(", ")}` }, { status: 400 });
  }
  try {
    const days = await getClipHistory(requested as HistoryWindow);
    return new Response(JSON.stringify({ days: requested, history: days }, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, s-maxage=60",
      },
    });
  } catch {
    return Response.json({ error: "History unavailable" }, { status: 503 });
  }
}
