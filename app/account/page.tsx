"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { authClient } from "@/app/lib/auth-client";

type Mode = "sign-in" | "sign-up";

type XboxStatus = {
  connected: boolean;
  account?: {
    gamertag: string | null;
    consoleName: string | null;
    updatedAt: string;
  } | null;
};

type XboxActivity = {
  title: string | null;
  consoleName: string | null;
};

export default function AccountPage() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [xbox, setXbox] = useState<XboxStatus | null>(null);
  const [xboxActivity, setXboxActivity] = useState<XboxActivity | null>(null);
  const [xboxBusy, setXboxBusy] = useState(false);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id;
  const xboxConnected = xbox?.connected ?? false;

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("xbox");
    const desktop = url.searchParams.get("desktop");
    if (result || desktop) {
      url.searchParams.delete("xbox");
      url.searchParams.delete("desktop");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    const message = desktop === "login-required"
      ? "Sign in here, then press Link ClypDat account again in the desktop app."
      : result === "connected"
      ? "Xbox connected successfully."
      : result === "cancelled"
        ? "Xbox linking was cancelled."
        : result === "not-configured"
          ? "Xbox linking is not configured yet."
          : result === "failed" || result === "invalid-state"
            ? "Xbox linking could not be completed."
            : null;
    if (!message) return;
    const timer = window.setTimeout(() => setError(message), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    async function loadXbox() {
      const response = await fetch("/api/xbox/status", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const status = (await response.json()) as XboxStatus;
      if (!cancelled) setXbox(status);
    }
    void loadXbox();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!xboxConnected) return;
    let cancelled = false;
    async function loadActivity() {
      const response = await fetch("/api/xbox/activity", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const result = (await response.json()) as { activity?: XboxActivity | null };
      if (!cancelled) setXboxActivity(result.activity ?? null);
    }
    void loadActivity();
    const timer = window.setInterval(loadActivity, 30_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [xboxConnected]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusy(true);

    const result =
      mode === "sign-up"
        ? await authClient.signUp.email({ name, email, password, callbackURL: "/account" })
        : await authClient.signIn.email({ email, password, callbackURL: "/account" });

    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "We could not complete that request.");
      return;
    }
    router.push("/account");
  }

  async function socialSignIn(provider: "google" | "discord") {
    setError(null);
    const result = await authClient.signIn.social({ provider, callbackURL: "/account" });
    if (result.error) setError(result.error.message ?? `${provider} sign-in is not configured yet.`);
  }

  async function disconnectXbox() {
    setXboxBusy(true);
    await fetch("/api/xbox/disconnect", { method: "POST" });
    setXbox({ connected: false });
    setXboxActivity(null);
    setXboxBusy(false);
  }

  if (isPending) {
    return <main className="flex min-h-screen items-center justify-center text-zinc-400">Loading account…</main>;
  }

  if (session?.user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-20">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
          <Link href="/" className="text-sm text-emerald-300 hover:text-emerald-200">← Back to ClypDat</Link>
          <p className="mt-10 text-sm uppercase tracking-[0.22em] text-emerald-300">ClypDat account</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Welcome, {session.user.name}</h1>
          <p className="mt-3 text-zinc-400">Your account is ready. Xbox and other connected accounts will live here.</p>
          {error && <p role="status" className="mt-5 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100">{error}</p>}
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Xbox account</p>
                <h2 className="mt-2 text-lg font-semibold">{xbox?.connected ? (xbox.account?.gamertag ?? "Xbox connected") : "Connect Xbox"}</h2>
                <p className="mt-2 text-sm text-zinc-400">
                  {xbox?.connected
                    ? xboxActivity?.title
                      ? `Playing ${xboxActivity.title}${xboxActivity.consoleName ? ` on ${xboxActivity.consoleName}` : ""}`
                      : "No active Xbox game detected."
                    : "Use Xbox activity for cloud-connected clips and presence."}
                </p>
              </div>
              <span className={`mt-1 h-2.5 w-2.5 rounded-full ${xbox?.connected ? "bg-emerald-300" : "bg-zinc-600"}`} aria-label={xbox?.connected ? "Connected" : "Not connected"} />
            </div>
            {xbox?.connected ? (
              <button type="button" disabled={xboxBusy} onClick={disconnectXbox} className="mt-5 w-full rounded-full border border-white/15 px-4 py-3 text-sm font-semibold transition hover:border-red-300/60 hover:bg-red-300/10 disabled:opacity-60">
                {xboxBusy ? "Disconnecting…" : "Disconnect Xbox"}
              </button>
            ) : (
              <a href="/api/xbox/connect" className="mt-5 block w-full rounded-full bg-emerald-300 px-4 py-3 text-center text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200">
                Link Xbox
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={() => authClient.signOut().then(() => router.push("/account"))}
            className="mt-8 w-full rounded-full border border-white/15 px-4 py-3 text-sm font-semibold transition hover:border-white/30 hover:bg-white/[0.06]"
          >
            Sign out
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-2xl shadow-black/30">
        <Link href="/" className="text-sm text-emerald-300 hover:text-emerald-200">← Back to ClypDat</Link>
        <p className="mt-10 text-sm uppercase tracking-[0.22em] text-emerald-300">ClypDat account</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{mode === "sign-in" ? "Sign in" : "Create your account"}</h1>
        <p className="mt-3 text-zinc-400">Optional for recording. Required only for cloud-connected features such as Xbox linking.</p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          {(["google", "discord"] as const).map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => socialSignIn(provider)}
              className="rounded-full border border-white/15 px-4 py-3 text-sm font-semibold capitalize transition hover:border-emerald-300/60 hover:bg-emerald-300/10"
            >
              {provider}
            </button>
          ))}
        </div>

        <div className="my-7 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-zinc-600">
          <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "sign-up" && (
            <label className="block text-sm text-zinc-300">
              Name
              <input required value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-foreground outline-none transition focus:border-emerald-300/70" />
            </label>
          )}
          <label className="block text-sm text-zinc-300">
            Email
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-foreground outline-none transition focus:border-emerald-300/70" />
          </label>
          <label className="block text-sm text-zinc-300">
            Password
            <input required minLength={8} type="password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-foreground outline-none transition focus:border-emerald-300/70" />
          </label>
          {error && <p role="alert" className="rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-200">{error}</p>}
          <button disabled={busy} type="submit" className="w-full rounded-full bg-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60">
            {busy ? "Working…" : mode === "sign-in" ? "Sign in with email" : "Create account"}
          </button>
        </form>

        <button type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(null); }} className="mt-6 w-full text-sm text-zinc-400 hover:text-zinc-200">
          {mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </section>
    </main>
  );
}
