"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authClient } from "@/app/lib/auth-client";

type Mode = "sign-in" | "sign-up";

export default function AccountPage() {
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

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
