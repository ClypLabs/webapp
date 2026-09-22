import { NextResponse } from "next/server";
import { auditAdmin, canPublish, currentAdmin, staleSignIn } from "@/app/lib/admin";
import { isSameOriginPost } from "@/app/lib/desktop-connect";
import { validateNoticeInput, validateSwitchInput } from "@/app/lib/notice-feed";
import { clearSwitch, setNoticeArchived, updateNotice, updateSwitch } from "@/app/lib/notices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

// PATCH { archived: boolean } takes a notice down or puts it back; any other
// body is a full edit.
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/notices/[id]">) {
  if (!isSameOriginPost(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const admin = await currentAdmin(request.headers);
  if (!admin) return notFound();
  if (!canPublish(admin)) return staleSignIn();
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notFound();

  const body = await request.json().catch(() => null);
  try {
    if (body && typeof body === "object" && Object.keys(body).length === 1 && typeof body.archived === "boolean") {
      const notice = await setNoticeArchived(id, body.archived);
      if (!notice) return notFound();
      auditAdmin(admin, body.archived ? "take-down" : "restore", id);
      return NextResponse.json({ notice });
    }
    if (body && typeof body === "object" && (body as Record<string, unknown>).clearSwitch === true) {
      const item = await clearSwitch(id);
      if (!item) return notFound();
      auditAdmin(admin, "clear-switch", id, `control=${item.control}`);
      return NextResponse.json({ switch: item });
    }
    const checked = body && typeof body === "object" && (body as Record<string, unknown>).control
      ? validateSwitchInput(body)
      : validateNoticeInput(body);
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
    if ("control" in checked.value) {
      const item = await updateSwitch(id, checked.value);
      if (!item) return notFound();
      auditAdmin(admin, "edit-switch", id, `control=${item.control}`);
      return NextResponse.json({ switch: item });
    }
    const notice = await updateNotice(id, checked.value);
    if (!notice) return notFound();
    auditAdmin(admin, "edit", id, `severity=${notice.severity}`);
    return NextResponse.json({ notice });
  } catch {
    return NextResponse.json({ error: "The notice could not be saved" }, { status: 503 });
  }
}
