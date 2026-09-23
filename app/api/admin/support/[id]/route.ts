import { currentAdmin } from "@/app/lib/admin";
import { isSameOriginPost } from "@/app/lib/desktop-connect";
import { REPORT_ID } from "@/app/lib/support-input";
import { deleteSupportReport, downloadSupportBundle, updateSupportReport } from "@/app/lib/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const notFound = () => Response.json({ error: "Not found" }, { status: 404 });

export async function GET(request: Request, ctx: RouteContext<"/api/admin/support/[id]">) {
  try {
    if (!(await currentAdmin(request.headers))) return notFound();
    const { id } = await ctx.params;
    if (!REPORT_ID.test(id)) return notFound();
    const bundle = await downloadSupportBundle(id.toLowerCase());
    if (!bundle) return notFound();
    return new Response(new Uint8Array(bundle), { headers: {
      "Content-Type": "application/octet-stream", "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="clypdat-diagnostics-${id}.zip"`,
      "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox",
    } });
  } catch { return Response.json({ error: "Download unavailable. Try again shortly." }, { status: 503 }); }
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/support/[id]">) {
  if (!isSameOriginPost(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    if (!(await currentAdmin(request.headers))) return notFound();
    const { id } = await ctx.params;
    if (!REPORT_ID.test(id)) return notFound();
    const body = await request.json().catch(() => null);
    if (typeof body?.resolved !== "boolean") return Response.json({ error: "Invalid status" }, { status: 400 });
    if (!(await updateSupportReport(id, body.resolved))) return notFound();
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Report could not be updated" }, { status: 503 }); }
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/support/[id]">) {
  if (!isSameOriginPost(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    if (!(await currentAdmin(request.headers))) return notFound();
    const { id } = await ctx.params;
    if (!REPORT_ID.test(id)) return notFound();
    await deleteSupportReport(id);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Report could not be deleted" }, { status: 503 }); }
}
