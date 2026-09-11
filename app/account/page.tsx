"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/app/lib/auth-client";

type Mode = "sign-in" | "sign-up";

// The page stops asking the server for anything after this long without a
// click, key press, scroll or touch, and shows a "Paused" card until someone
// clicks Continue. The session is left alone: pausing never signs anyone out.
const IDLE_AFTER_MS = 10 * 60 * 1000;
// And after this long regardless of activity. Nothing on this page needs
// watching for half an hour, and it bounds what a mouse jiggler or an
// auto-clicker left running can cost: one Continue per half hour, by hand.
const MAX_ACTIVE_MS = 30 * 60 * 1000;
const XBOX_POLL_MS = 60 * 1000;

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

type Account = {
  id: string;
  providerId: string;
};

type OverviewUser = {
  id: string;
  name: string;
  email: string;
};

type Overview = {
  user: OverviewUser | null;
  xbox: XboxStatus;
  accounts: Account[];
};

// Discord is the social sign-in. Google was dropped in September 2026 and now
// only signs into accounts made with it, so their owners can connect Discord
// or merge the duplicate a Discord sign-in made (app/lib/account-merge.ts).
type SocialProvider = "discord";

function getSocialProvider(value: string | null): SocialProvider | null {
  return value === "discord" ? value : null;
}

// Only Discord's CDN: an account first made with Google can still hold a
// Google photo until its next Discord sign-in replaces it.
function discordImage(image: string | null | undefined) {
  if (!image) return null;
  try {
    return new URL(image).hostname === "cdn.discordapp.com" ? image : null;
  } catch {
    return null;
  }
}

// m:ss, for the Refresh from Discord cooldown.
function formatCountdown(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function socialProviderName(provider: SocialProvider) {
  return `${provider[0].toUpperCase()}${provider.slice(1)}`;
}

function SocialProviderIcon({ color = "#5865F2" }: { provider?: SocialProvider; color?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none">
      <path fill={color} fillRule="evenodd" clipRule="evenodd" d="M20.3 4.5A19 19 0 0 0 15.7 3l-.6 1.2a17 17 0 0 0-6.2 0L8.3 3a19 19 0 0 0-4.6 1.5C.8 8.8 0 13 .4 17.1A18.7 18.7 0 0 0 6 20l1.4-1.9a11.6 11.6 0 0 1-2.2-1.1l.5-.4c4.2 2 8.4 2 12.6 0l.5.4a11.4 11.4 0 0 1-2.2 1.1L18 20a18.8 18.8 0 0 0 5.6-2.9c.5-4.8-.8-9-3.3-12.6ZM8.1 14.7c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Zm7.8 0c-1.1 0-2-1-2-2.2s.9-2.2 2-2.2 2 1 2 2.2-.9 2.2-2 2.2Z" />
    </svg>
  );
}

// Xbox's own silhouette. The circle-with-an-X drawn here before was an
// approximation of it and read as a generic icon rather than the console's mark.
// Lightened from the #107C10 in Xbox's guidelines, which is near-black against
// this page; the desktop app draws the same mark at the same green.
function XboxIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0"><path fill="#4DC44D" d="M4.102 21.033C6.211 22.881 8.977 24 12 24c3.026 0 5.789-1.119 7.902-2.967 1.877-1.912-4.316-8.709-7.902-11.417-3.582 2.708-9.779 9.505-7.898 11.417zm11.16-14.406c2.5 2.961 7.484 10.313 6.076 12.912C23.002 17.48 24 14.861 24 12.004c0-3.34-1.365-6.362-3.57-8.536 0 0-.027-.022-.082-.042-.063-.022-.152-.045-.281-.045-.592 0-1.985.434-4.805 3.246zM3.654 3.426c-.057.02-.082.041-.086.042C1.365 5.642 0 8.664 0 12.004c0 2.854.998 5.473 2.661 7.533-1.401-2.605 3.579-9.951 6.08-12.91-2.82-2.813-4.216-3.245-4.806-3.245-.131 0-.223.021-.281.046v-.002zM12 3.551S9.055 1.828 6.755 1.746c-.903-.033-1.454.295-1.521.339C7.379.646 9.659 0 11.984 0H12c2.334 0 4.605.646 6.766 2.085-.068-.046-.615-.372-1.52-.339C14.946 1.828 12 3.545 12 3.545v.006z" /></svg>;
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
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [accountsBusy, setAccountsBusy] = useState(false);
  const [confirming, setConfirming] = useState<"discord" | "xbox" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [overviewUser, setOverviewUser] = useState<OverviewUser | null>(null);
  const [overviewPending, setOverviewPending] = useState(true);
  const overviewLoaded = useRef(false);
  const overviewInFlight = useRef(false);
  const overviewFor = useRef<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameBusy, setRenameBusy] = useState(false);
  const [renamed, setRenamed] = useState(false);
  const [idle, setIdle] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const lastActivity = useRef(0);
  const activeSince = useRef(0);
  // Set by "Refresh from Discord" so the page shows the new name and picture
  // straight away, without waiting for the session to be read again.
  const [discordProfile, setDiscordProfile] = useState<{ name: string | null; image: string | null } | null>(null);
  const [discordRefreshBusy, setDiscordRefreshBusy] = useState(false);
  const [discordRefreshNote, setDiscordRefreshNote] = useState<string | null>(null);
  // When Refresh from Discord works again. The server keeps the real cooldown
  // (20 minutes, shared with the app's button); this only draws it.
  const [discordRefreshReadyAt, setDiscordRefreshReadyAt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const linkingAttempt = useRef<SocialProvider | null>(null);
  // Set when Discord refused to link because it already has its own account.
  const [mergeOffer, setMergeOffer] = useState(false);
  const [mergeBusy, setMergeBusy] = useState(false);
  const mergeFinishing = useRef(false);
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id;
  const xboxConnected = xbox?.connected ?? false;
  const linkedSocials = (["discord"] as const).filter((provider) => accounts?.some((account) => account.providerId === provider));
  const availableSocials = (["discord"] as const).filter((provider) => !linkedSocials.includes(provider));
  const googleLinked = accounts?.some((account) => account.providerId === "google") ?? false;
  // Nothing but Discord: the kind of account a Discord sign-in makes when the
  // person's Google-made account has a different email.
  const onlyDiscord = accounts?.length === 1 && accounts[0].providerId === "discord";

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
    const deleted = url.searchParams.get("deleted");
    const reauth = url.searchParams.get("reauth");
    const merged = url.searchParams.get("merged");
    const googleSignIn = url.searchParams.get("google_signin");
    const linkProvider = getSocialProvider(url.searchParams.get("link_provider"));
    const invalidLinkProvider = url.searchParams.has("link_provider") && !linkProvider;
    const discordTaken = oauthError === "account_already_linked_to_different_user" && linkProvider === "discord";
    if (result || desktop || oauthError || invalidLinkProvider || deleted || reauth || merged || googleSignIn) {
      url.searchParams.delete("merged");
      url.searchParams.delete("google_signin");
      url.searchParams.delete("xbox");
      url.searchParams.delete("desktop");
      url.searchParams.delete("error");
      url.searchParams.delete("error_description");
      url.searchParams.delete("deleted");
      url.searchParams.delete("reauth");
      if (oauthError !== "account_not_linked") url.searchParams.delete("link_provider");
      window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
    }
    const message = merged === "1"
      ? "Accounts merged. Your Discord sign-in, and any Xbox link it had, now belong to this account."
      : googleSignIn && oauthError === "signup_disabled"
      ? "No ClypDat account was made with that Google account. Google only signs into accounts made with it before - use Continue with Discord instead."
      : googleSignIn && oauthError === "access_denied"
      ? "Google sign-in was cancelled."
      : googleSignIn && oauthError
      ? "Google sign-in could not be completed."
      : discordTaken
      ? null
      : deleted === "1"
      ? "Your ClypDat account and stored connections were deleted."
      : reauth === "1"
      ? "Sign in again before deleting your account."
      : desktop === "signed-out"
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
    if (!message && !discordTaken && !(oauthError === "account_not_linked" && linkProvider)) return;
    const timer = window.setTimeout(() => {
      if (discordTaken) setMergeOffer(true);
      if (oauthError === "account_not_linked" && linkProvider) setMode("sign-in");
      if (message) setError(message);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!session?.user || linking) return;
    const current = new URL(window.location.href);
    if (getSocialProvider(current.searchParams.get("link_provider"))) return;
    // A merge finishes first; it reloads the page, which then hands off.
    if (current.searchParams.has("merge")) return;
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

  // The second half of a merge: back from signing into the other account.
  useEffect(() => {
    if (!session?.user || mergeFinishing.current) return;
    if (new URL(window.location.href).searchParams.get("merge") !== "finish") return;
    mergeFinishing.current = true;
    void (async () => {
      setMergeBusy(true);
      try {
        const response = await fetch("/api/account/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: "finish" }),
        });
        const result = (await response.json().catch(() => null)) as { error?: string; signInAgain?: boolean } | null;
        if (!response.ok) {
          const url = new URL(window.location.href);
          url.searchParams.delete("merge");
          window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
          setError(result?.error ?? "The accounts could not be merged. Nothing was changed; try again.");
          setMergeBusy(false);
          return;
        }
        const done = new URL(accountCallbackUrl());
        done.searchParams.set("merged", "1");
        // Signed into the account that was folded away, so that session is
        // gone. Discord now signs into the kept account.
        if (result?.signInAgain) {
          await authClient.signIn.social({ provider: "discord", callbackURL: done.toString(), errorCallbackURL: accountCallbackUrl() });
          return;
        }
        window.location.replace(done);
      } catch {
        setError("The accounts could not be merged. Nothing was changed; try again.");
        setMergeBusy(false);
      }
    })();
  }, [accountCallbackUrl, session?.user]);

  // The Refresh cooldown survives reloads, so ask where it stands.
  const discordLinked = linkedSocials.includes("discord");
  useEffect(() => {
    if (!discordLinked) return;
    let cancelled = false;
    void fetch("/api/account/discord-refresh", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: { retryAfter?: number } | null) => {
        if (!cancelled && result?.retryAfter) setDiscordRefreshReadyAt(Date.now() + result.retryAfter * 1000);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [discordLinked]);

  const discordRefreshCooling = discordRefreshReadyAt > clock;
  useEffect(() => {
    if (discordRefreshReadyAt <= Date.now()) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [discordRefreshReadyAt]);

  // One request for the signed-in user, their linked providers and their Xbox
  // status. It reads the session cookie server-side, so it can start the moment
  // the page mounts instead of queueing behind the client session request -
  // which is what used to hold the whole page on "Loading account…".
  const loadOverview = useCallback(async (expectUser: string | null) => {
    overviewInFlight.current = true;
    try {
      const response = await fetch("/api/account/overview", { cache: "no-store" });
      if (!response.ok) throw new Error("overview unavailable");
      const data = (await response.json()) as Overview;
      overviewFor.current = data.user?.id ?? expectUser;
      setOverviewUser(data.user);
      setXbox(data.xbox);
      setAccounts(data.accounts);
    } catch {
      // The session hook still renders the page; only the fast path is lost.
      // Recording the attempt keeps the effect below from retrying forever.
      overviewFor.current = expectUser;
      setAccounts((current) => current ?? []);
    } finally {
      overviewLoaded.current = true;
      overviewInFlight.current = false;
      setOverviewPending(false);
    }
  }, []);

  // Runs once on mount, and again only if the session later resolves to a
  // different user than the overview was fetched for - which is what signing in
  // with email and password does, since it stays on this page. Social sign-in
  // and sign-out both navigate, so they arrive with a fresh mount.
  useEffect(() => {
    const currentUser = userId ?? null;
    if (overviewInFlight.current) return;
    if (overviewLoaded.current && currentUser === overviewFor.current) return;
    void loadOverview(currentUser);
  }, [loadOverview, userId]);

  // Idle and hidden tracking. A tab left open in the background used to poll
  // Xbox activity every 30 seconds all day, and each poll kept the database
  // awake; now nothing is fetched while the tab is hidden or the page idle.
  useEffect(() => {
    lastActivity.current = Date.now();
    activeSince.current = Date.now();
    // Deliberate input only. Pointer movement is left out on purpose: a
    // jittery mouse, or a jiggler app, would otherwise keep the page awake for
    // ever. Events a script dispatches (isTrusted false) do not count either.
    const touch = (event: Event) => { if (event.isTrusted) lastActivity.current = Date.now(); };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const name of events) window.addEventListener(name, touch, { passive: true });
    const onVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    const check = window.setInterval(() => {
      const now = Date.now();
      if (now - lastActivity.current >= IDLE_AFTER_MS || now - activeSince.current >= MAX_ACTIVE_MS) setIdle(true);
    }, 30_000);
    return () => {
      for (const name of events) window.removeEventListener(name, touch);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(check);
    };
  }, []);

  useEffect(() => {
    if (!xboxConnected || idle || !pageVisible) return;
    let cancelled = false;
    async function loadActivity() {
      const response = await fetch("/api/xbox/activity", { cache: "no-store" });
      if (!response.ok || cancelled) return;
      const result = (await response.json()) as { activity?: XboxActivity | null };
      if (!cancelled) setXboxActivity(result.activity ?? null);
    }
    void loadActivity();
    const timer = window.setInterval(loadActivity, XBOX_POLL_MS);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [xboxConnected, idle, pageVisible]);

  function resumeFromIdle() {
    lastActivity.current = Date.now();
    activeSince.current = Date.now();
    setIdle(false);
    // Whatever changed while paused - a link made in the app, say - shows now.
    void loadOverview(userId ?? null);
  }

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

  // Signs into an account made with Google before it was dropped. Never makes
  // a new account (disableSignUp in auth.ts).
  async function googleSignIn() {
    setError(null);
    const failed = new URL(accountCallbackUrl());
    failed.searchParams.set("google_signin", "1");
    const result = await authClient.signIn.social({ provider: "google", callbackURL: accountCallbackUrl(), errorCallbackURL: failed.toString() });
    if (result.error) setError(result.error.message ?? "Google sign-in is not available right now.");
  }

  /**
   * Starts a merge from the account signed in now, then signs into the other
   * one; the merge finishes when the page comes back (the effect above).
   * `provider` is how the other account signs in.
   */
  async function startMerge(provider: "discord" | "google") {
    setError(null);
    setMergeBusy(true);
    try {
      const response = await fetch("/api/account/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "start" }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(result?.error);
      }
      const back = new URL(accountCallbackUrl());
      back.searchParams.set("merge", "finish");
      const failed = new URL(accountCallbackUrl());
      if (provider === "google") failed.searchParams.set("google_signin", "1");
      const result = await authClient.signIn.social({ provider, callbackURL: back.toString(), errorCallbackURL: failed.toString() });
      if (result.error) throw new Error(result.error.message);
    } catch (error) {
      setError((error instanceof Error && error.message) || "The merge could not be started. Try again.");
      setMergeBusy(false);
    }
  }

  async function refreshFromDiscord() {
    setError(null);
    setDiscordRefreshNote(null);
    setDiscordRefreshBusy(true);
    try {
      const response = await fetch("/api/account/discord-refresh", { method: "POST" });
      const result = (await response.json().catch(() => null)) as { error?: string; result?: string; name?: string | null; image?: string | null; retryAfter?: number } | null;
      if (result?.retryAfter) {
        setDiscordRefreshReadyAt(Date.now() + result.retryAfter * 1000);
        setClock(Date.now());
      }
      if (response.status === 429) return;
      if (!response.ok) {
        setError(result?.error ?? "Discord did not answer. Try again in a moment.");
        return;
      }
      setDiscordProfile({ name: result?.name ?? null, image: result?.image ?? null });
      setDiscordRefreshNote(result?.result === "changed" ? "Updated from Discord. ClypDat picks it up on its next refresh." : "Already matches Discord.");
    } catch {
      setError("Discord did not answer. Try again in a moment.");
    } finally {
      setDiscordRefreshBusy(false);
    }
  }

  async function disconnectXbox() {
    setXboxBusy(true);
    try {
      const response = await fetch("/api/xbox/disconnect", { method: "POST" });
      if (!response.ok) throw new Error();
      setXbox({ connected: false });
      setXboxActivity(null);
      setConfirming(null);
    } catch {
      setError("Xbox could not be disconnected. Try again.");
    }
    setXboxBusy(false);
  }

  function connectSocial(provider: SocialProvider) {
    setError(null);
    const url = new URL(window.location.href);
    url.searchParams.set("link_provider", provider);
    window.location.assign(url);
  }

  async function disconnectSocial(provider: SocialProvider) {
    const account = accounts?.find((item) => item.providerId === provider);
    if (!account) return;
    setError(null);
    setAccountsBusy(true);
    try {
      // Not authClient.unlinkAccount: Better Auth refuses it for any session
      // older than five minutes. See app/api/account/unlink/route.ts, which
      // also refuses to remove the last method that can still sign in.
      const response = await fetch("/api/account/unlink", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(result?.error ?? `${socialProviderName(provider)} could not be disconnected. Your account was not changed.`);
        return;
      }
      setAccounts((current) => current?.filter((item) => item.id !== account.id) ?? null);
      setConfirming(null);
    } catch {
      setError(`${socialProviderName(provider)} could not be disconnected. Your account was not changed.`);
    } finally {
      setAccountsBusy(false);
    }
  }

  /**
   * GDPR Article 16, rectification. Only the display name is editable here:
   * changing the email address moves the account's identity and Better Auth
   * gates that behind a verification message, which needs a transactional
   * email provider this deployment does not have yet. Until it does, the
   * policy routes email corrections through hi@clypdat.xyz.
   */
  async function saveDisplayName() {
    const next = displayName.trim();
    if (!next || next === user?.name) return;
    setError(null);
    setRenameBusy(true);
    try {
      const result = await authClient.updateUser({ name: next });
      if (result.error) throw new Error(result.error.message);
      setOverviewUser((current) => (current ? { ...current, name: next } : current));
      setRenamed(true);
      setRenameOpen(false);
    } catch {
      setError("Your display name could not be updated. Your account was not changed.");
    } finally {
      setRenameBusy(false);
    }
  }

  async function deleteAccount() {
    if (deleteConfirmation !== "DELETE") return;
    setError(null);
    setDeleteBusy(true);
    try {
      const result = await authClient.deleteUser({ password: deletePassword || undefined });
      if (result.error) {
        const message = result.error.message ?? "Account deletion could not be completed.";
        const hasPassword = accounts?.some((account) => account.providerId === "credential");
        if (!hasPassword && /session/i.test(message)) {
          await authClient.signOut();
          router.replace("/account?reauth=1");
          return;
        }
        setError(message);
        return;
      }
      overviewFor.current = null;
      setOverviewUser(null);
      setAccounts([]);
      setXbox({ connected: false });
      // Better Auth has cleared the server cookie. A full ordinary-account
      // navigation also drops the client session cache and any desktop-link
      // parameters, so deletion never resumes a desktop handoff.
      window.location.replace("/account?deleted=1");
    } catch {
      setError("Account deletion could not be completed. Your account was not changed.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const user = session?.user ?? overviewUser;

  if (!user && (isPending || overviewPending)) {
    return <main className="flex min-h-screen items-center justify-center text-zinc-400">Loading account…</main>;
  }

  if (user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-20">
        {idle && (
          <div role="dialog" aria-modal="true" aria-labelledby="idle-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0f1318] p-7 text-center shadow-2xl shadow-black/40">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Paused</p>
              <h2 id="idle-title" className="mt-3 text-xl font-semibold">Still there?</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">This page stops checking for updates after 10 minutes without activity, or after 30 minutes open. You are still signed in.</p>
              <button type="button" autoFocus onClick={resumeFromIdle} className="mt-6 w-full rounded-full bg-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200">
                Continue
              </button>
            </div>
          </div>
        )}
        <section className="w-full max-w-4xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-8">
          <Link href="/" className="text-sm text-emerald-300 hover:text-emerald-200">← Back to ClypDat</Link>
          <p className="mt-10 text-sm uppercase tracking-[0.22em] text-emerald-300">ClypDat account</p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {linkedSocials.includes("discord") && discordImage(discordProfile?.image ?? session?.user?.image) && (
              // eslint-disable-next-line @next/next/no-img-element -- a Discord CDN avatar; next/image would need the host allow-listed for no gain
              <img src={discordImage(discordProfile?.image ?? session?.user?.image)!} alt="" width={56} height={56} className="h-14 w-14 rounded-full border border-white/10" />
            )}
            <h1 className="text-3xl font-semibold tracking-tight">Welcome, {discordProfile?.name ?? user.name}!</h1>
            {linkedSocials.includes("discord") && (
              <button
                type="button"
                disabled={discordRefreshBusy || discordRefreshCooling}
                onClick={refreshFromDiscord}
                title={discordRefreshCooling ? "Refresh from Discord works once every 20 minutes. ClypDat also checks every 30 minutes on its own." : "Pull your current Discord name and picture now. ClypDat also checks every 30 minutes."}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-[#5865F2]/70 hover:bg-[#5865F2]/10 disabled:cursor-wait disabled:opacity-60"
              >
                {discordRefreshBusy ? "Refreshing…" : discordRefreshCooling ? `Refresh in ${formatCountdown(discordRefreshReadyAt - clock)}` : "Refresh from Discord"}
              </button>
            )}
          </div>
          {discordRefreshNote && <p className="mt-2 text-sm text-zinc-400">{discordRefreshNote}</p>}
          <p className="mt-3 text-zinc-400">{linking ? `Linking ${getSocialProvider(new URL(window.location.href).searchParams.get("link_provider"))}…` : "Manage every way you sign in and connect optional gaming services."}</p>
          {error && <p role="alert" className="mt-5 rounded-xl border border-red-300/20 bg-red-300/10 px-4 py-3 text-sm text-red-100">{error}</p>}
          {mergeOffer && (
            <div className="mt-5 rounded-xl border border-[#5865F2]/40 bg-[#5865F2]/10 px-4 py-4 text-sm text-zinc-200">
              <p className="font-semibold">That Discord already has its own ClypDat account.</p>
              <p className="mt-1 text-zinc-300">Usually one made by signing in with Discord while Google sign-in was unavailable. Merge it into this account: its Discord sign-in moves here, its Xbox link too if this account has none, and the empty duplicate is deleted. You&apos;ll confirm with Discord once more.</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button type="button" disabled={mergeBusy} onClick={() => startMerge("discord")} className="rounded-full bg-[#5865F2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#4752c4] disabled:cursor-wait disabled:opacity-60">{mergeBusy ? "Merging…" : "Merge accounts"}</button>
                <button type="button" disabled={mergeBusy} onClick={() => setMergeOffer(false)} className="px-2 py-2 text-sm text-zinc-300">Not now</button>
              </div>
            </div>
          )}
          {!mergeOffer && mergeBusy && <p className="mt-5 text-sm text-zinc-400">Merging your accounts…</p>}
          {googleLinked && !linkedSocials.includes("discord") && !mergeOffer && (
            <p className="mt-5 rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">Google sign-in is being retired. Connect Discord below so you can keep signing in to this account.</p>
          )}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="flex items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Add an account</p><h2 className="mt-2 text-lg font-semibold">More ways to sign in</h2></div>{accountsBusy && <span className="text-xs text-zinc-500">Updating…</span>}</div>
              <div className="mt-5 space-y-3">
                {availableSocials.map((provider) => <button key={provider} type="button" onClick={() => connectSocial(provider)} className="flex w-full items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-left transition hover:border-emerald-300/60 hover:bg-emerald-300/10"><span className="flex items-center gap-3"><SocialProviderIcon provider={provider} /><span><span className="block font-semibold">{socialProviderName(provider)}</span><span className="text-sm text-zinc-400">Sign in with Discord and show your Discord name and picture in ClypDat</span></span></span><span className="text-emerald-300">Connect</span></button>)}
                {!xboxConnected && <a href="/api/xbox/connect" className="flex w-full items-center justify-between rounded-xl border border-white/10 px-4 py-3 transition hover:border-emerald-300/60 hover:bg-emerald-300/10"><span className="flex items-center gap-3"><XboxIcon /><span><span className="block font-semibold">Xbox</span><span className="text-sm text-zinc-400">Optional activity and presence</span></span></span><span className="text-emerald-300">Connect</span></a>}
                {!availableSocials.length && xboxConnected && <p className="text-sm text-zinc-400">All available accounts are connected.</p>}
                {onlyDiscord && <button type="button" disabled={mergeBusy} onClick={() => startMerge("google")} className="w-full text-left text-sm text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline disabled:cursor-wait">Made a ClypDat account with Google before? Sign in with Google to merge it into this one.</button>}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Connected accounts</p><h2 className="mt-2 text-lg font-semibold">Your account connections</h2>
              <div className="mt-5 space-y-3">
                {linkedSocials.map((provider) => <div key={provider} className="rounded-xl border border-white/10 px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-3"><SocialProviderIcon provider={provider} /><span className="font-semibold">{socialProviderName(provider)}</span></span><span className="rounded-full bg-emerald-300/15 px-2 py-1 text-xs font-medium text-emerald-200">Connected</span></div>{confirming === provider ? <div className="mt-3 flex items-center gap-2"><button type="button" disabled={accountsBusy} onClick={() => disconnectSocial(provider)} className="rounded-full bg-red-300 px-3 py-1.5 text-xs font-semibold text-red-950">Confirm disconnect</button><button type="button" onClick={() => setConfirming(null)} className="px-2 py-1.5 text-xs text-zinc-300">Cancel</button></div> : <button type="button" disabled={accountsBusy} onClick={() => setConfirming(provider)} className="mt-3 text-sm text-zinc-300 underline-offset-4 hover:text-red-200 hover:underline">Disconnect</button>}</div>)}
                {xboxConnected && <div className="rounded-xl border border-white/10 px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="flex items-center gap-3"><XboxIcon /><span><span className="block font-semibold">{xbox?.account?.gamertag ?? "Xbox"}</span><span className="text-sm text-zinc-400">{xboxActivity?.title ? `Playing ${xboxActivity.title}${xboxActivity.consoleName ? ` on ${xboxActivity.consoleName}` : ""}` : "No active Xbox game detected."}</span></span></span><span className="rounded-full bg-emerald-300/15 px-2 py-1 text-xs font-medium text-emerald-200">Connected</span></div>{confirming === "xbox" ? <div className="mt-3 flex items-center gap-2"><button type="button" disabled={xboxBusy} onClick={disconnectXbox} className="rounded-full bg-red-300 px-3 py-1.5 text-xs font-semibold text-red-950">Confirm disconnect</button><button type="button" onClick={() => setConfirming(null)} className="px-2 py-1.5 text-xs text-zinc-300">Cancel</button></div> : <button type="button" disabled={xboxBusy} onClick={() => setConfirming("xbox")} className="mt-3 text-sm text-zinc-300 underline-offset-4 hover:text-red-200 hover:underline">Disconnect</button>}</div>}
                {googleLinked && <div className="rounded-xl border border-white/10 px-4 py-3"><div className="flex items-center justify-between gap-3"><span><span className="block font-semibold">Google</span><span className="text-sm text-zinc-400">Sign-in only, while Google is retired</span></span><span className="rounded-full bg-white/10 px-2 py-1 text-xs font-medium text-zinc-300">Connected</span></div></div>}
                {!linkedSocials.length && !googleLinked && !xboxConnected && <p className="text-sm text-zinc-400">No extra accounts connected yet.</p>}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => authClient.signOut().then(() => {
              overviewFor.current = null;
              setOverviewUser(null);
              setAccounts([]);
              setXbox({ connected: false });
              router.push("/account");
            })}
            className="mt-8 w-full rounded-full border border-white/15 px-4 py-3 text-sm font-semibold transition hover:border-white/30 hover:bg-white/[0.06]"
          >
            Sign out
          </button>
          <section className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Your data</p>
            <h2 className="mt-2 text-lg font-semibold">Access, correct, and take your data</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">Download everything this account service holds about you, or correct your display name. Recordings made with ClypDat stay on your own device and are never part of this export.</p>
            <div className="mt-5 space-y-4">
              <a href="/api/account/export" className="inline-flex items-center rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold transition hover:border-emerald-300/60 hover:bg-emerald-300/10">Download my data (JSON)</a>
              {!renameOpen ? (
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => { setDisplayName(user.name ?? ""); setRenameOpen(true); setRenamed(false); setError(null); }} className="text-sm text-emerald-300 underline-offset-4 hover:underline">Change display name</button>
                  {renamed && <span className="text-sm text-zinc-400">Display name updated.</span>}
                  {linkedSocials.includes("discord") && <span className="text-sm text-zinc-500">Your next Discord sign-in replaces it with your Discord name.</span>}
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm text-zinc-300">Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-foreground outline-none transition focus:border-emerald-300/70" /></label>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" disabled={renameBusy || !displayName.trim()} onClick={saveDisplayName} className="rounded-full bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-50">{renameBusy ? "Saving…" : "Save"}</button>
                    <button type="button" disabled={renameBusy} onClick={() => { setRenameOpen(false); setDisplayName(""); }} className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/[0.06]">Cancel</button>
                  </div>
                </div>
              )}
              <p className="text-sm text-zinc-400">To correct your email address, or to ask about any other data-protection right, email <a className="text-emerald-300 underline" href="mailto:hi@clypdat.xyz">hi@clypdat.xyz</a>. See the <Link className="text-emerald-300 underline" href="/privacy">Privacy Policy</Link>.</p>
            </div>
          </section>
          <section className="mt-6 rounded-2xl border border-red-300/25 bg-red-300/[0.06] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-red-200">Delete account</p>
            <h2 className="mt-2 text-lg font-semibold">Permanently delete your ClypDat account</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">This removes your ClypDat account and stored connections. Local recordings and your Discord and Microsoft accounts remain intact.</p>
            {!deleteOpen ? <button type="button" onClick={() => { setDeleteOpen(true); setError(null); }} className="mt-4 text-sm text-red-200 underline-offset-4 hover:underline">Delete account</button> : <div className="mt-5 space-y-4">
              <p className="text-sm text-zinc-300">Type <strong>DELETE</strong> to enable permanent deletion.</p>
              {accounts?.some((account) => account.providerId === "credential") && <label className="block text-sm text-zinc-300">Current password <span className="text-zinc-500">(needed only if this session is over five minutes old)</span><input value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} type="password" autoComplete="current-password" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-foreground outline-none transition focus:border-red-200/70" /></label>}
              <label className="block text-sm text-zinc-300">Confirmation<input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-foreground outline-none transition focus:border-red-200/70" /></label>
              <div className="flex flex-wrap gap-3"><button type="button" disabled={deleteConfirmation !== "DELETE" || deleteBusy} onClick={deleteAccount} className="rounded-full bg-red-300 px-4 py-2.5 text-sm font-semibold text-red-950 transition hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-50">{deleteBusy ? "Deleting…" : "Permanently delete account"}</button><button type="button" disabled={deleteBusy} onClick={() => { setDeleteOpen(false); setDeleteConfirmation(""); setDeletePassword(""); }} className="rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/[0.06]">Cancel</button></div>
            </div>}
          </section>
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

        <button
          type="button"
          onClick={() => socialSignIn("discord")}
          className="mt-8 inline-flex w-full items-center justify-center gap-2.5 rounded-full bg-[#5865F2] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#4752c4]"
        >
          <SocialProviderIcon color="#ffffff" />
          <span>Continue with Discord</span>
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-zinc-500">
          Your Discord name and profile picture show in the ClypDat app. Only Discord accounts have them; email accounts show a plain account card.
        </p>
        <button type="button" onClick={googleSignIn} className="mt-4 w-full text-center text-sm text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline">
          Made your account with Google? Sign in with Google
        </button>

        <div className="my-7 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-zinc-600">
          <span className="h-px flex-1 bg-white/10" /> or use email <span className="h-px flex-1 bg-white/10" />
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
          <button disabled={busy} type="submit" className="w-full rounded-full border border-white/15 px-4 py-3 text-sm font-semibold transition hover:border-white/30 hover:bg-white/[0.06] disabled:cursor-wait disabled:opacity-60">
            {busy ? "Working…" : mode === "sign-in" ? "Sign in with email" : "Create account"}
          </button>
        </form>

        <button type="button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setError(null); }} className="mt-6 w-full text-sm text-zinc-400 hover:text-zinc-200">
          {mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
        <p className="mt-6 text-center text-sm text-zinc-500"><Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-zinc-300">Terms of Service <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></Link><span aria-hidden="true"> · </span><Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-zinc-300">Privacy Policy <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></Link></p>
      </section>
    </main>
  );
}
