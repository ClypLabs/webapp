"use client";

import { useEffect, useState } from "react";

const pad = (value: number) => String(value).padStart(2, "0");

// The REC light and the running time beside it in the header: how long this
// page has been open. Both come off one clock, so the light comes on exactly
// as the seconds tick over and goes out at the half-second - a CSS blink on
// its own period drifted out of step with the digits.
//
// Starts at zero, light on, on the server render and ticks once mounted, so
// the first paint and hydration agree.
export default function RecTimer() {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    let timer = 0;

    // Re-armed for the next half-second boundary each time rather than on a
    // fixed interval, so timer lag never accumulates into drift.
    const tick = () => {
      const now = Date.now() - start;
      setElapsed(now);
      timer = window.setTimeout(tick, 500 - (now % 500));
    };
    timer = window.setTimeout(tick, 500);
    return () => window.clearTimeout(timer);
  }, []);

  const seconds = Math.floor(elapsed / 1000);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const lit = elapsed % 1000 < 500;

  return (
    <>
      <span
        aria-hidden
        className={`rec-light inline-block h-2 w-2 shrink-0 rounded-full bg-rec ${lit ? "" : "rec-light-off"}`}
      />
      Rec
      <span aria-hidden className="tabular-nums">
        {pad(h)}:{pad(m)}:{pad(s)}
      </span>
    </>
  );
}
