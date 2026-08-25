import { MIRROR_LATEST_KEY } from "@/app/lib/mirror";
import { serveSnapshot } from "@/app/lib/snapshot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mirror of GET /repos/ClypLabs/ClypDat/releases/latest
export async function GET(request: Request) {
  return serveSnapshot(request, MIRROR_LATEST_KEY);
}
