import { NextResponse } from "next/server";
import { SocialProviderId, getLinkedSocialProviders, unlinkSocialProvider } from "@/app/lib/auth";
import { verifyDesktopToken } from "@/app/lib/desktop-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readProvider(request: Request): SocialProviderId | null {
  const provider = new URL(request.url).searchParams.get("provider");
  return provider === "google" || provider === "discord" ? provider : null;
}

function readIdentity(request: Request) {
  const value = request.headers.get("authorization");
  const token = value?.startsWith("Bearer ") ? value.slice("Bearer ".length).trim() : "";
  return verifyDesktopToken(token);
}

export async function DELETE(request: Request) {
  const identity = readIdentity(request);
  if (!identity) return NextResponse.json({ error: "Desktop sign-in expired" }, { status: 401 });
  const provider = readProvider(request);
  if (!provider) return NextResponse.json({ error: "Unsupported social provider" }, { status: 400 });
  try {
    const result = await unlinkSocialProvider(identity.userId, provider);
    if (result === "last-account") {
      return NextResponse.json({ error: "Connect another sign-in method before removing your only login method." }, { status: 409 });
    }
    const providers = await getLinkedSocialProviders(identity.userId);
    return NextResponse.json({ unlinked: result === "unlinked", providers });
  } catch {
    return NextResponse.json({ error: "Disconnect failed" }, { status: 503 });
  }
}
