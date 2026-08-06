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

    // Measured fractionally, and snapped. The card this sits in is a hair
    // narrower than the design width at desktop - a 1px border is enough - so
    // the scale came out at 0.9991 rather than 1, which is invisible and is not
    // free: a non-integer scale means every card image and every label in the
    // graphic is re-rasterised off its own pixel grid, and the animating layers
    // inside get resampled on the way out. Under a pixel of difference is not
    // worth any of that; the parent clips it.
    const available = outer.getBoundingClientRect().width;

    // Never scale up - at wide viewports the graphic should sit at its natural
    // size rather than stretching to fill the column.
    const next = available >= designWidth - 1.5 ? 1 : available / designWidth;
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

  // At desktop widths the scale is exactly 1, and `scale(1)` is not free: it
  // still makes this element a containing block with its own render surface,
  // so the animating layers inside it - the scrolling clip grid, the sheen,
  // the playhead - get composited into that surface and then blitted again,
  // every frame, to apply an identity transform. Dropping the property when
  // there is nothing to scale takes that whole pass out on desktop.
  const scaled = scale < 1;

  return (
    <div ref={outerRef} className={className} style={{ height: scaled ? height : undefined }}>
      <div
        ref={innerRef}
        style={{
          width: designWidth,
          transform: scaled ? `scale(${scale})` : undefined,
          transformOrigin: scaled ? "top left" : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
