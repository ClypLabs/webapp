"use client";

import { useEffect, useRef, useState } from "react";

const format = (value: number) => value.toLocaleString("en-US");
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// Counts up to `value` the first time it scrolls into view, then eases from
// the old figure to the new one whenever `value` changes after that. The
// server render already carries the real number, so without JS, with reduced
// motion, or before hydration that is what shows - the first count only
// starts from zero once the script is running and about to play it.
export default function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const started = useRef(false);
  const frame = useRef(0);

  const animate = (from: number, to: number, duration: number) => {
    cancelAnimationFrame(frame.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const next = Math.round(from + (to - from) * easeOut(t));
      shownRef.current = next;
      setShown(next);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  };

  // First appearance: count up from zero once it is on screen.
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      started.current = true;
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        started.current = true;
        animate(0, shownRef.current, 1600);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, []);

  // Later changes (a live update): ease from what is showing to the new value.
  useEffect(() => {
    if (value === shownRef.current) return;
    if (!started.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      shownRef.current = value;
      setShown(value);
      return;
    }
    animate(shownRef.current, value, 900);
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {/* tabular-nums keeps each digit the same width as it ticks, so the
          line does not shimmy while the number changes. */}
      <span className="tabular-nums">{format(shown)}</span>
    </span>
  );
}
