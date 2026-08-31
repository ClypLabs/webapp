import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/app/lib/auth";

const handlers = toNextJsHandler(auth);

function missingConfiguration() {
  const missing = [
    !process.env.DATABASE_URL && "DATABASE_URL",
    !process.env.BETTER_AUTH_SECRET && "BETTER_AUTH_SECRET",
  ].filter(Boolean);

  return missing.length > 0
    ? Response.json(
        { error: "Authentication is not configured", missing },
        { status: 503 },
      )
    : null;
}

export async function GET(request: Request) {
  return missingConfiguration() ?? handlers.GET(request);
}

export async function POST(request: Request) {
  return missingConfiguration() ?? handlers.POST(request);
}
