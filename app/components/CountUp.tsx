"use client";

import { useEffect, useRef, useState } from "react";

const format = (value: number) => value.toLocaleString("en-US");

// Counts up to `value` the first time it scrolls into view. The server render
// already carries the final number, so without JS, with reduced motion, or
// before hydration the real figure is what shows - the animation only ever
// starts from zero once the script is running and about to play it.
export default function CountUp({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node || value <= 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1600;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          // Ease-out cubic: fast at first, settling onto the real number.
          setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        setShown(0);
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {/* Width reserved for the final figure, so digits arriving do not shift
          the line. tabular-nums keeps each digit the same width as it ticks. */}
      <span className="tabular-nums">{format(shown)}</span>
    </span>
  );
}
