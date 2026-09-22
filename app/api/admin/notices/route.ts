import { NextResponse } from "next/server";
import { auditAdmin, canPublish, currentAdmin, staleSignIn } from "@/app/lib/admin";
import { isSameOriginPost } from "@/app/lib/desktop-connect";
import { validateNoticeInput } from "@/app/lib/notice-feed";
import { createNotice, listNotices } from "@/app/lib/notices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Anyone who is not an admin gets the same 404 an unknown path would, so the
// route does not advertise that there is something here to get into.
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function GET(request: Request) {
  if (!(await currentAdmin(request.headers))) return notFound();
  try {
    return NextResponse.json({ notices: await listNotices() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Notices are unavailable" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = await currentAdmin(request.headers);
  if (!admin) return notFound();
  if (!canPublish(admin)) return staleSignIn();
  const checked = validateNoticeInput(await request.json().catch(() => null));
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
  try {
    const notice = await createNotice(checked.value, admin.id);
    auditAdmin(admin, "create", notice.id, `severity=${notice.severity}`);
    return NextResponse.json({ notice }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "The notice could not be saved" }, { status: 503 });
  }
}
