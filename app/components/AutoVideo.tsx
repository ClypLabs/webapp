"use client";

import { useEffect, useRef } from "react";

type AutoVideoProps = {
  /** Path without extension, e.g. "/media/library". Expects video.webm, video.mp4, poster.webp. */
  base: string;
  /** Describes the footage for anyone who cannot see it. */
  label: string;
  className?: string;
  /** Intrinsic size, so the box reserves its space before anything loads. */
  width: number;
  height: number;
};

// A looping, silent screen recording that behaves itself: it only decodes while
// on screen, it never downloads a byte until it is about to play, and it does
// not move at all for anyone who asked the OS for less motion.
export default function AutoVideo({
  base,
  label,
  className = "",
  width,
  height,
}: AutoVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    // Reduced motion gets the poster and nothing else. Returning before the
    // observer is attached means the file is never even fetched.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // play() rejects if the browser refuses autoplay. Nothing to recover
          // from - the poster stays up, which is a fine outcome.
          void video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={ref}
      // Not autoplay: the observer starts it. Autoplay would have every video
      // on the page decoding at once, including the ones nobody has scrolled to.
      muted
      loop
      playsInline
      preload="none"
      poster={`${base}/poster.webp`}
      width={width}
      height={height}
      aria-label={label}
      className={className}
    >
      {/* WebM first - roughly a third smaller here. MP4 covers the browsers
          that still will not decode VP9. */}
      <source src={`${base}/video.webm`} type="video/webm" />
      <source src={`${base}/video.mp4`} type="video/mp4" />
    </video>
  );
}
