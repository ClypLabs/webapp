"use client";

import { useEffect } from "react";

// Decides whether this machine can actually afford the page's decoration, and
// sets `data-fx="low"` on <html> if it cannot. globals.css does the rest.
//
// The problem this solves is not a slow script. Everything on this page is
// transform-and-opacity work on the compositor, which is the cheap kind - but
// "cheap" is per pixel per frame, and the page asks for several overlapping
// viewport-sized translucent layers at whatever rate the display runs at. A
// discrete GPU does not notice. An integrated one sharing bandwidth with the
// CPU absolutely does, and there is no media query that asks "is this an Iris
// Xe": `prefers-reduced-motion` is a stated preference, not a capability, and
// `update: slow` is about e-ink.
//
// So measure instead. If the browser cannot hold a reasonable frame rate while
// the decoration is running, the decoration is what goes.

const ATTRIBUTE = "fx";
const LOW = "low";

// Frame budget above which we call it. 20ms is 50fps: comfortably past a
// missed frame on a 60Hz panel, and nowhere near reachable on a healthy one.
const SLOW_FRAME_MS = 20;
// Long enough to be a trend rather than one janky frame, short enough that the
// page settles quickly.
const SAMPLE_FRAMES = 90;
// Frames to throw away first, so the measurement is of the steady state rather
// than of layout, decode and font swap all landing at once.
const WARMUP_FRAMES = 20;

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

export default function PerfMode() {
  useEffect(() => {
    const root = document.documentElement;

    const setLow = () => {
      root.dataset[ATTRIBUTE] = LOW;
    };

    // Escape hatch for checking either path without hunting for the hardware:
    // ?fx=low forces it on, ?fx=high forces it off.
    const forced = new URLSearchParams(window.location.search).get("fx");
    if (forced === LOW) {
      setLow();
      return;
    }
    if (forced === "high") return;

    // Anyone who has already asked for less motion has the animations off
    // anyway - there is nothing to measure and nothing to switch off.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Cheap up-front signals. Neither is a reliable read on GPU class on its
    // own - plenty of thin-and-light laptops report eight threads - so these
    // only catch the clear cases, and the frame probe catches the rest.
    const device = navigator as Navigator & { deviceMemory?: number };
    if ((device.hardwareConcurrency ?? 8) <= 4 || (device.deviceMemory ?? 8) <= 4) {
      setLow();
      return;
    }

    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const probe = () => {
      const deltas: number[] = [];
      let seen = 0;
      let last = performance.now();

      const tick = (now: number) => {
        if (cancelled) return;

        const delta = now - last;
        last = now;
        seen += 1;

        if (seen > WARMUP_FRAMES) {
          deltas.push(delta);

          if (deltas.length >= SAMPLE_FRAMES) {
            // Median, not mean: one GC pause or one scroll-triggered image
            // decode should not condemn a machine that is otherwise fine.
            if (median(deltas) > SLOW_FRAME_MS) setLow();
            return;
          }
        }

        frame = requestAnimationFrame(tick);
      };

      frame = requestAnimationFrame(tick);
    };

    // Wait for load, then a beat past it. Measuring during the initial burst of
    // image decodes and font swaps would flag every machine.
    const start = () => {
      timer = setTimeout(probe, 1200);
    };

    if (document.readyState === "complete") {
      start();
    } else {
      window.addEventListener("load", start, { once: true });
    }

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener("load", start);
    };
  }, []);

  return null;
}
