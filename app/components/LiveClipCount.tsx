"use client";

import { useEffect, useState } from "react";
import CountUp from "./CountUp";

// How often an open page asks for the latest total. The endpoint is cached at
// the CDN for 10s (see api/stats/clips), so however many people are watching,
// the database sees at most a read every few seconds per region.
const POLL_MS = 20_000;

// The counter's number and label, from the server-rendered total, kept
// current while the page is open. Polling stops while the tab is hidden and
// catches up the moment it is shown again.
export default function LiveClipCount({ initial }: { initial: number }) {
  const [total, setTotal] = useState(initial);

  useEffect(() => {
    let timer = 0;
    let cancelled = false;

    const refresh = async () => {
      try {
        const response = await fetch("/api/stats/clips");
        if (!response.ok) return;
        const data = (await response.json()) as { total?: unknown };
        // Never step backwards: a stale cache edge can briefly answer with an
        // older figure than the one already on screen.
        if (!cancelled && typeof data.total === "number") {
          setTotal((current) => Math.max(current, data.total as number));
        }
      } catch {
        // Offline or the counter is down; the next tick tries again.
      }
    };

    const schedule = () => {
      window.clearInterval(timer);
      if (document.visibilityState === "visible") timer = window.setInterval(refresh, POLL_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void refresh();
      schedule();
    };

    // Straight away as well, not only after the first interval: the page HTML
    // is cached (see page.tsx), so the number it arrived with can be behind,
    // and a refresh showed that stale figure for a full poll interval.
    void refresh();
    schedule();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <>
      <p className="relative mt-6 font-display text-6xl font-semibold leading-none tracking-[-0.03em] sm:text-8xl">
        <CountUp
          value={total}
          className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent"
        />
      </p>
      <p className="relative mt-4 text-lg font-medium text-zinc-300 sm:text-xl">
        {total === 1 ? "clip" : "clips"} saved with{" "}
        <span className="text-accent font-semibold">ClypDat</span>
      </p>
    </>
  );
}
