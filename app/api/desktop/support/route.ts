import { verifyActiveDesktopToken } from "@/app/lib/desktop-token";
import { clientAddress, takeDailyAllowance } from "@/app/lib/ip-allowance";
import { readSupportInput, SupportInputError } from "@/app/lib/support-input";
import { saveSupportReport } from "@/app/lib/support";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const reply = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (request.headers.has("origin")) return reply({ error: "Use Send diagnostics in the ClypDat app" }, 403);
  try {
    const header = request.headers.get("authorization") ?? "";
    const identity = await verifyActiveDesktopToken(header.startsWith("Bearer ") ? header.slice(7).trim() : "");
    if (!identity) return reply({ error: "Link your ClypDat account before sending diagnostics" }, 401);
    if (!(await takeDailyAllowance("support-user", identity.userId, 1, 10)) ||
        !(await takeDailyAllowance("support-ip", clientAddress(request), 1, 30)))
      return reply({ error: "Too many reports today. Please try tomorrow or export a local bundle." }, 429);
    const input = await readSupportInput(request);
    const result = await saveSupportReport(identity.userId, input);
    if (result === "conflict") return reply({ error: "Start a new diagnostic report and try again" }, 409);
    if (result === "full") return reply({ error: "The diagnostic inbox is full. Please export a local bundle instead." }, 503);
    return reply({ id: input.id }, result === "saved" ? 201 : 200);
  } catch (error) {
    if (error instanceof SupportInputError) return reply({ error: error.message }, error.status);
    return reply({ error: "Diagnostics could not be received. Please try again later." }, 503);
  }
}
