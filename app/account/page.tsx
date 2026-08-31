"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
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

type SocialProvider = "google" | "discord";

function getSocialProvider(value: string | null): SocialProvider | null {
  return value === "google" || value === "discord" ? value : null;
}

function socialProviderName(provider: SocialProvider) {
  return `${provider[0].toUpperCase()}${provider.slice(1)}`;
}

function SocialProviderIcon({ provider }: { provider: SocialProvider }) {
  if (provider === "google") {
    return (
      <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5 shrink-0">
        <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3A12 12 0 1 1 24 12c3.1 0 5.9 1.2 8 3.2l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.3-.4-3.5Z" />
        <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8A12 12 0 0 1 24 12c3.1 0 5.9 1.2 8 3.2l5.7-5.7A20 20 0 0 0 6.3 14.7Z" />
        <path fill="#4CAF50" d="M24 44c5.1 0 9.8-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.9 28l-6.6 5.1A20 20 0 0 0 24 44Z" />
        <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l.1-.1 6.2 5.2C37 39.1 44 34 44 24c0-1.2-.1-2.3-.4-3.5Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none">
      <path fill="#5865F2" fillRule="evenodd" clipRule="evenodd" d="M20.3 4.5A19 19 0 0 0 15.7 3l-.6 1.2a17 17 0 0 0-6.2 0L8.3 3a19 19 0 0 0-4.6 1.5C.8 8.8 0 13 .4 17.1A18.7 18.7 0 0 0 6 20l1.4-1.9a11.6 11.6 0 0 1-2.2-1.1l.5-.4c4.2 2 8.4 2 12.6 0l.5.4a11.4 11.4 0 0 1-2.2 1.1L18 20a18.8 18.8 0 0 0 5.6-2.9c.5-4.8-.8-9-3.3-12.6ZM8.1 14.7c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Zm7.8 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Z" />
    </svg>
  );
}

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
  const [linking, setLinking] = useState(false);
  const linkingAttempt = useRef<SocialProvider | null>(null);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id;
  const xboxConnected = xbox?.connected ?? false;

  const accountCallbackUrl = useCallback((preserveLinkProvider = false) => {
    const url = new URL("/account", window.location.origin);
    const current = new URL(window.location.href);
    if (current.searchParams.get("desktop_connect") === "1") {
      url.searchParams.set("desktop_connect", "1");
      const redirectUri = current.searchParams.get("redirect_uri");
      const state = current.searchParams.get("state");
      if (redirectUri) url.searchParams.set("redirect_uri", redirectUri);
      if (state) url.searchParams.set("state", state);
    }
    const linkProvider = getSocialProvider(current.searchParams.get("link_provider"));
    if (preserveLinkProvider && linkProvider) url.searchParams.set("link_provider", linkProvider);
    return url.toString();
  }, []);

  const accountLinkErrorUrl = useCallback((provider: SocialProvider) => {
    const url = new URL(accountCallbackUrl());
    url.searchParams.set("link_provider", provider);
    return url.toString();
  }, [accountCallbackUrl]);

  useEffect(() => {
    const url = new URL(window.location.href);
    const result = url.searchParams.get("xbox");
    const desktop = url.searchParams.get("desktop");
    const oauthError = url.searchParams.get("error");
    const linkProvider = getSocialProvider(url.searchParams.get("link_provider"));
    const invalidLinkProvider = url.searchParams.has("link_provider") && !linkProvider;
    if (result || desktop || oauthError || invalidLinkProvider) {
      url.searchParams.delete("xbox");
      url.searchParams.delete("desktop");
      url.searchParams.delete("error");
      url.searchParams.delete("error_description");
      if (oauthError !== "account_not_linked") url.searchParams.delete("link_provider");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    const message = desktop === "signed-out"
      ? "Signed out of ClypDat."
      : desktop === "login-required"
      ? "Sign in here, then press Link ClypDat account again in the desktop app."
      : result === "connected"
      ? "Xbox connected successfully."
      : result === "cancelled"
        ? "Xbox linking was cancelled."
        : result === "not-configured"
          ? "Xbox linking is not configured yet."
          : result === "failed" || result === "invalid-state"
            ? "Xbox linking could not be completed."
            : oauthError === "account_not_linked" && linkProvider
              ? `This ${socialProviderName(linkProvider)} email already has a ClypDat account. Sign in with that account's email and password once to link ${socialProviderName(linkProvider)}.`
              : oauthError === "email_does_not_match"
                ? `That ${linkProvider ? socialProviderName(linkProvider) : "social"} email does not match this ClypDat account.`
                : oauthError === "access_denied"
                  ? `${linkProvider ? `${socialProviderName(linkProvider)} ` : ""}linking was cancelled.`
                  : oauthError
                    ? `${linkProvider ? `${socialProviderName(linkProvider)} ` : ""}linking could not be completed.`
                    : invalidLinkProvider
                      ? "Unsupported social provider."
                      : null;
    if (!message && !(oauthError === "account_not_linked" && linkProvider)) return;
    const timer = window.setTimeout(() => {
      if (oauthError === "account_not_linked" && linkProvider) setMode("sign-in");
      if (message) setError(message);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!session?.user || linking) return;
    const current = new URL(window.location.href);
    if (getSocialProvider(current.searchParams.get("link_provider"))) return;
    if (current.searchParams.get("desktop_connect") !== "1") return;
    const redirectUri = current.searchParams.get("redirect_uri");
    const state = current.searchParams.get("state");
    if (!redirectUri || !state) return;
    const handoff = new URL("/api/desktop/connect", window.location.origin);
    handoff.searchParams.set("redirect_uri", redirectUri);
    handoff.searchParams.set("state", state);
    window.location.assign(handoff);
  }, [linking, session?.user]);

  useEffect(() => {
    if (!session?.user) return;
    const provider = getSocialProvider(new URL(window.location.href).searchParams.get("link_provider"));
    if (!provider || linkingAttempt.current === provider) return;

    linkingAttempt.current = provider;
    setLinking(true);
    void authClient.linkSocial({
      provider,
      callbackURL: accountCallbackUrl(),
      errorCallbackURL: accountLinkErrorUrl(provider),
    }).then((result) => {
      if (!result.error) return;
      const url = new URL(window.location.href);
      url.searchParams.delete("link_provider");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      setError(result.error.message ?? `${provider} linking could not be completed.`);
      setLinking(false);
    }).catch(() => {
      const url = new URL(window.location.href);
      url.searchParams.delete("link_provider");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      setError(`${provider} linking could not be completed.`);
      setLinking(false);
    });
  }, [accountCallbackUrl, accountLinkErrorUrl, session?.user]);

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
        ? await authClient.signUp.email({ name, email, password, callbackURL: accountCallbackUrl(true) })
        : await authClient.signIn.email({ email, password, callbackURL: accountCallbackUrl(true) });

    setBusy(false);
    if (result.error) {
      setError(result.error.message ?? "We could not complete that request.");
      return;
    }
    router.push(accountCallbackUrl(true));
  }

  async function socialSignIn(provider: SocialProvider) {
    setError(null);
    const result = await authClient.signIn.social({
      provider,
      callbackURL: accountCallbackUrl(),
      errorCallbackURL: accountLinkErrorUrl(provider),
    });
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
          <p className="mt-3 text-zinc-400">{linking ? `Linking ${getSocialProvider(new URL(window.location.href).searchParams.get("link_provider"))}…` : "Your account is ready. Xbox and other connected accounts will live here."}</p>
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
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-4 py-3 text-sm font-semibold capitalize transition hover:border-emerald-300/60 hover:bg-emerald-300/10"
            >
              <SocialProviderIcon provider={provider} />
              <span>{provider}</span>
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
