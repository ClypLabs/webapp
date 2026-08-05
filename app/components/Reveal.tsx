"use client";

import { Fragment, useEffect } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";

// Scroll reveal, done with one IntersectionObserver for the entire page rather
// than one per element. A landing page with forty revealed elements otherwise
// creates forty observers, and they all fire during the same scroll.
//
// Elements opt in by rendering with data-reveal="hidden"; the observer flips
// them to "shown" once and stops watching. Reversing on scroll-out is
// deliberately not done - re-animating content someone already read is noise,
// and it makes scrolling back up feel broken.
export function RevealProvider() {
  useEffect(() => {
    const nodes = document.querySelectorAll<HTMLElement>(
      '[data-reveal="hidden"]',
    );

    // Honour the OS setting by simply showing everything. The CSS drops the
    // transition too, so this is an instant state change, not a fast animation.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.setAttribute("data-reveal", "shown"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.setAttribute("data-reveal", "shown");
          observer.unobserve(entry.target);
        }
      },
      // Fire slightly before the element reaches the viewport edge, so the
      // motion has finished by the time it is properly in view. Without the
      // bottom inset, elements animate while already fully readable.
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return null;
}

type RevealProps = {
  children: ReactNode;
  /** Milliseconds to stagger this element behind its neighbours. */
  delay?: number;
  className?: string;
  as?: ElementType;
  style?: CSSProperties;
};

export default function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
  style,
}: RevealProps) {
  return (
    <Tag
      data-reveal="hidden"
      className={className}
      style={{ ...style, transitionDelay: delay ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
}

// Splits a headline so each word rises on its own beat. The whole string stays
// in one element for assistive tech and for text selection - the spans are
// inline, so copying the heading still yields normal spaced words.
export function RevealWords({
  text,
  className = "",
  wordClassName = "",
  delay = 0,
  step = 55,
}: {
  text: string;
  className?: string;
  /** Applied to individual words - used to italicise the accent word. */
  wordClassName?: string;
  delay?: number;
  step?: number;
}) {
  const words = text.split(" ");

  return (
    <span className={className}>
      {words.map((word, index) => (
        <Fragment key={`${word}-${index}`}>
          {/* The clip window each word rises through. Padding below it, pulled
              back by the negative margin, keeps descenders from being sheared
              off by the overflow while the line box stays the same height. */}
          <span className="inline-block overflow-hidden pb-[0.14em] mb-[-0.14em] align-bottom">
            <span
              data-reveal="hidden"
              className={`reveal-word inline-block ${wordClassName}`}
              style={{ transitionDelay: `${delay + index * step}ms` }}
            >
              {word}
            </span>
          </span>
          {/* Outside the clip window, or it collapses and the words run together. */}
          {index < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}
