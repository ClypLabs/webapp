"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// Renders its child at a fixed design width and scales the whole thing down to
// whatever space is actually available.
//
// This exists because the library graphic is a picture of a desktop app. Making
// it responsive - one column on a phone, three on a desktop - meant a phone
// showed a layout the app never has. Scaling instead keeps the real three
// column grid at every size; it just gets smaller.
//
// Done with transform rather than CSS zoom: zoom only landed in Firefox
// recently, and transform is the same GPU-composited path the rest of the page
// already uses. The wrapper's height is set from the measured child so the
// scaled-down element does not leave a gap under it.
export default function ScaleToFit({
  designWidth,
  children,
  className = "",
}: {
  designWidth: number;
  children: ReactNode;
  className?: string;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>(undefined);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    // Never scale up - at wide viewports the graphic should sit at its natural
    // size rather than stretching to fill the column.
    const next = Math.min(1, outer.clientWidth / designWidth);
    setScale(next);
    setHeight(inner.offsetHeight * next);
  }, [designWidth]);

  useEffect(() => {
    measure();

    // Two observers: the outer box changes with the viewport, and the inner one
    // changes when fonts or images finish loading and the card grid resettles.
    const observer = new ResizeObserver(measure);
    if (outerRef.current) observer.observe(outerRef.current);
    if (innerRef.current) observer.observe(innerRef.current);
    return () => observer.disconnect();
  }, [measure]);

  return (
    <div ref={outerRef} className={className} style={{ height }}>
      <div
        ref={innerRef}
        style={{
          width: designWidth,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}
