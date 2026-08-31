import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { createXboxAuthorization, XBOX_OAUTH_COOKIE } from "@/app/lib/xbox";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const accountUrl = new URL("/account", request.url);
  if (!session?.user) {
    accountUrl.searchParams.set("xbox", "login-required");
    return NextResponse.redirect(accountUrl);
  }

  try {
    const authorization = createXboxAuthorization();
    const response = NextResponse.redirect(authorization.url);
    response.cookies.set({
      name: XBOX_OAUTH_COOKIE,
      value: authorization.cookieValue,
      httpOnly: true,
      secure: new URL(request.url).protocol === "https:",
      sameSite: "lax",
      path: "/api/xbox",
      maxAge: 600,
    });
    return response;
  } catch {
    accountUrl.searchParams.set("xbox", "not-configured");
    return NextResponse.redirect(accountUrl);
  }
}
