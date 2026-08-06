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

    // Observing an element twice re-delivers an entry for it, which meant every
    // rescan walked the whole page and then wrote inline styles to forty
    // elements that had not changed. Only genuinely new nodes are handed over.
    const known = new WeakSet<Element>();

    // The animated elements are all marked by an `animate-` utility class.
    // This is a substring match against every class attribute on the page, so
    // it is not something to run more often than it has to.
    const scan = () => {
      document
        .querySelectorAll<HTMLElement>('[class*="animate-"]')
        .forEach((element) => {
          if (known.has(element)) return;
          known.add(element);
          observer.observe(element);
        });
    };

    scan();

    // The editor graphic swaps its contents as clips rotate, and the feature
    // panels mount their diagrams on selection - both introduce animated
    // elements after this first pass.
    //
    // Coalesced, because this watches the entire document: a single React
    // commit fires the callback several times, and without the delay each one
    // paid for a full-page query. The delay only postpones the point at which a
    // newly mounted animation starts being pause-managed, which nothing depends
    // on being immediate.
    let queued: ReturnType<typeof setTimeout> | null = null;
    const mutations = new MutationObserver(() => {
      if (queued) return;
      queued = setTimeout(() => {
        queued = null;
        scan();
      }, 300);
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (queued) clearTimeout(queued);
      observer.disconnect();
      mutations.disconnect();
    };
  }, []);

  return null;
}
