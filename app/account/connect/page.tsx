import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth";
import { connectSearchParams, pairingCode, readConnectRequest } from "@/app/lib/desktop-connect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Link ClypDat on this PC",
  robots: { index: false },
};

// The confirmation step of linking the desktop app (app/lib/desktop-connect.ts).
// A link to here is all another site can make someone open, so nothing happens
// until the person presses Link - and the pairing code lets them check the
// request matches the app in front of them.
export default async function ConnectPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) if (typeof value === "string") query.set(key, value);
  const connect = readConnectRequest(query);

  if (!connect) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-20">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl shadow-black/30">
          <h1 className="text-xl font-semibold">This link request is not valid</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">Press Link ClypDat account in the desktop app again.</p>
          <Link href="/account" className="mt-6 inline-block text-sm text-emerald-300 hover:text-emerald-200">Go to your account</Link>
        </section>
      </main>
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect(`/account?${connectSearchParams(connect).toString()}`);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl shadow-black/30">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Link the desktop app</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Link ClypDat on this PC to your account?</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-300">
          Signed in as <strong className="text-zinc-100">{session.user.name}</strong>
          {session.user.email ? <> ({session.user.email})</> : null}.
        </p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Pairing code</p>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-[0.2em] text-zinc-100">{pairingCode(connect.state)}</p>
          <p className="mt-3 text-sm leading-6 text-zinc-400">ClypDat shows the same code while it waits. Only continue if you just pressed Link in the app and the codes match.</p>
        </div>
        <form method="post" action="/api/desktop/connect" className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="redirect_uri" value={connect.redirectUri} />
          <input type="hidden" name="state" value={connect.state} />
          {connect.codeChallenge && (
            <>
              <input type="hidden" name="code_challenge" value={connect.codeChallenge} />
              <input type="hidden" name="code_challenge_method" value="S256" />
            </>
          )}
          <button type="submit" name="decision" value="link" className="w-full rounded-full bg-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200">
            Link this PC
          </button>
          <button type="submit" name="decision" value="cancel" className="w-full rounded-full border border-white/15 px-4 py-3 text-sm font-semibold transition hover:border-white/30 hover:bg-white/[0.06]">
            Cancel
          </button>
        </form>
        <p className="mt-5 text-xs leading-5 text-zinc-500">Didn&apos;t press Link in ClypDat? Press Cancel. A linked PC can see your connected Xbox, Discord and Spotify status, and you can sign every PC out from your account page.</p>
      </section>
    </main>
  );
}
