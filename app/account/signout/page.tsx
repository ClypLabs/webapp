"use client";

import { useEffect } from "react";
import { authClient } from "@/app/lib/auth-client";

export default function AccountSignOutPage() {
  useEffect(() => {
    void authClient.signOut().finally(() => {
      window.location.replace("/account?desktop=signed-out");
    });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-20">
      <p className="text-sm text-zinc-400">Signing out of ClypDat…</p>
    </main>
  );
}
