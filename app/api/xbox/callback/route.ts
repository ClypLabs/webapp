import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { connectXbox, readXboxAuthorization, saveXboxAccount, XBOX_OAUTH_COOKIE } from "@/app/lib/xbox";

export const runtime = "nodejs";

function redirect(request: NextRequest, result: string) {
  const url = new URL("/account", request.url);
  url.searchParams.set("xbox", result);
  const response = NextResponse.redirect(url);
  response.cookies.delete(XBOX_OAUTH_COOKIE);
  return response;
}

export async function GET(request: NextRequest) {
  const state = readXboxAuthorization(request.cookies.get(XBOX_OAUTH_COOKIE)?.value);
  if (!state) return redirect(request, "invalid-state");
  if (request.nextUrl.searchParams.get("state") !== state.state) return redirect(request, "invalid-state");
  if (request.nextUrl.searchParams.get("error")) return redirect(request, "cancelled");

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) return redirect(request, "login-required");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return redirect(request, "failed");

  try {
    const credentials = await connectXbox(code, state.verifier);
    await saveXboxAccount(session.user.id, credentials);
    return redirect(request, "connected");
  } catch {
    return redirect(request, "failed");
  }
}
