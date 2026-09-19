"use client";

import { useState } from "react";
import { authClient } from "@/app/lib/auth-client";

// Opened by the desktop app's Sign out. It used to sign out on load, which let
// any site sign a visitor out just by sending them here; now it waits for the
// button.
export default function AccountSignOutPage() {
  const [busy, setBusy] = useState(false);

  function signOut() {
    setBusy(true);
    void authClient.signOut().finally(() => {
      window.location.replace("/account?desktop=signed-out");
    });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <section className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-center shadow-2xl shadow-black/30">
        <h1 className="text-xl font-semibold">Sign out of ClypDat in this browser?</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-400">The desktop app has already signed out.</p>
        <button type="button" autoFocus disabled={busy} onClick={signOut} className="mt-6 w-full rounded-full bg-emerald-300 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-200 disabled:cursor-wait disabled:opacity-60">
          {busy ? "Signing out…" : "Sign out"}
        </button>
        <a href="/account" className="mt-3 inline-block text-sm text-zinc-400 hover:text-zinc-200">Stay signed in</a>
      </section>
    </main>
  );
}
