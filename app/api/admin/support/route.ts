import { currentAdmin } from "@/app/lib/admin";
import { listSupportReports } from "@/app/lib/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    if (!(await currentAdmin(request.headers))) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ reports: await listSupportReports() }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Inbox unavailable. Try again shortly." }, { status: 503 }); }
}
