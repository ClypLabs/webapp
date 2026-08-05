"use client";

import { useEffect } from "react";

// Pauses every decorative animation that is not on screen.
//
// `content-visibility: auto` skips rendering an off-screen section, but it does
// not stop that section's animations - they keep ticking, and anything with a
// promoted layer keeps being composited. The measurable cost of that here was
// nineteen animations running while the viewport showed one section: the hero's
// clip grid scrolling a 1071x1874 layer forever, the feature diagrams flowing
// at a part of the page nobody was looking at, and the sheen sweeping a
// screenshot that was several thousand pixels above the fold.
//
// Paused animations resume exactly where they left off, so nothing restarts or
// jumps when it scrolls back into view.
export default function PauseOffscreen() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const element = entry.target as HTMLElement;
          element.style.animationPlayState = entry.isIntersecting ? "" : "paused";
        }
      },
      // A margin, so anything scrolling into view is already moving by the time
      // it is visible rather than visibly starting up.
      { rootMargin: "200px" },
    );

    // The animated elements are all marked by an `animate-` utility class.
    const scan = () => {
      document
        .querySelectorAll<HTMLElement>('[class*="animate-"]')
        .forEach((element) => observer.observe(element));
    };

    scan();

    // The editor graphic swaps its contents as clips rotate, and the feature
    // panels mount their diagrams on selection - both introduce animated
    // elements after this first pass.
    const mutations = new MutationObserver(scan);
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return null;
}
