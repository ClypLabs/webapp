"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import RailIcon from "./RailIcon";
import { EXCERPT_SECONDS, TRACKS, clips } from "./editorClips";

// The editor, drawn the same way as the library graphic: real layout, real
// labels, real footage - and everything that moves drawn in DOM so it is sharp
// at any size.
//
// The preview is a silent six-second excerpt of an actual recording, and the
// playhead, the transport bar and the clock are all driven off that video's
// currentTime rather than a CSS animation guessing at it. When a clip ends the
// panel swaps to the next game: footage, filmstrip, metadata, title and
// waveforms all change together, because they all describe the same file.

const BAR_COUNT = 96;

// RMS is honest but visually timid - most of a game's audio sits low and the
// bars end up as a flat rug. The curve lifts the quiet end without touching the
// peaks, so the shape stays the recording's own.
function barHeight(v: number) {
  return Math.round(Math.pow(v, 0.62) * 100);
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readMotion() {
  return window.matchMedia(REDUCED_MOTION).matches;
}

function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

function Waveform({ values, colour }: { values: number[]; colour: string }) {
  return (
    <div className="flex h-full items-center gap-[2px] px-1">
      {values.slice(0, BAR_COUNT).map((v, i) => (
        <span
          key={i}
          className={`flex-1 rounded-[1px] ${colour}`}
          style={{ height: `${barHeight(v)}%` }}
        />
      ))}
    </div>
  );
}

// One tick per second of the excerpt, sitting directly over the tracks so the
// playhead and the ruler agree about where a given second is.
function TimeRuler() {
  return (
    <div className="flex items-end justify-between pb-1 pl-[100px] text-[9px] text-zinc-600">
      {Array.from({ length: EXCERPT_SECONDS + 1 }, (_, i) => (
        <span key={i}>{formatTime(i)}</span>
      ))}
    </div>
  );
}

export default function EditorGraphic({ className = "" }: { className?: string }) {
  const [index, setIndex] = useState(0);
  const clip = clips[index];

  const videoRef = useRef<HTMLVideoElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);

  // Whether the panel is on screen. Off screen nothing decodes and nothing
  // advances, so a page scrolled past this section costs nothing.
  const [visible, setVisible] = useState(false);

  // Anyone who asked the OS for less motion gets the poster and a still
  // timeline. Subscribed rather than read once, so flipping the setting takes
  // effect without a reload; the server always renders the calm version.
  const still = useSyncExternalStore(subscribeMotion, readMotion, () => false);

  // Clip changes fade rather than cut. `swapping` drives the fade out; the
  // fade back in waits for the next clip to actually be rendering frames,
  // because fading in on a video that has not decoded yet just shows black.
  const [swapping, setSwapping] = useState(false);
  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    if (swapTimer.current) return;
    setSwapping(true);
    swapTimer.current = setTimeout(() => {
      swapTimer.current = null;
      setIndex((i) => (i + 1) % clips.length);
    }, 260);
  }, []);

  useEffect(() => () => {
    if (swapTimer.current) clearTimeout(swapTimer.current);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || still) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [still]);

  // Point the element at the current clip and get it going. play() can reject
  // - the file may not be buffered yet - so canplay is the second chance
  // rather than the only one.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || still) return;

    const source = `/media/editor/${clips[index].slug}/video.mp4`;
    if (!video.src.endsWith(source)) {
      video.src = source;
      video.load();
    }

    if (!visible) {
      video.pause();
      return;
    }

    const start = () => void video.play().catch(() => {});
    start();
    video.addEventListener("canplay", start);
    return () => video.removeEventListener("canplay", start);
  }, [visible, index, still]);

  // The moving parts are written straight to the DOM. Putting currentTime in
  // state would re-render the whole panel sixty times a second to move one
  // line by a pixel.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || still || !visible) return;

    let frame = 0;
    let lastLabel = "";
    // Stall watchdog. A clip that stops decoding would otherwise hold the
    // rotation forever, since `ended` never fires for it.
    let lastTime = -1;
    let lastMoved = performance.now();

    const tick = () => {
      const duration = video.duration || EXCERPT_SECONDS;
      const progress = Math.min(1, video.currentTime / duration);
      const percent = `${progress * 100}%`;

      if (playheadRef.current) playheadRef.current.style.left = percent;

      const label = formatTime(video.currentTime);
      if (clockRef.current && label !== lastLabel) {
        clockRef.current.textContent = label;
        lastLabel = label;
      }

      const now = performance.now();
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        lastMoved = now;
      } else if (now - lastMoved > 4000) {
        advance();
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible, index, still, advance]);

  // Everything that belongs to the open clip fades together - the footage, the
  // metadata, the title and the timeline all describe the same file.
  const fade = `transition-opacity duration-300 ${swapping ? "opacity-0" : "opacity-100"}`;

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#0d1218] ring-1 ring-white/10 ${className}`}
      role="img"
      aria-label={`The ClypDat editor, playing ${clip.title} with its audio tracks laid out on the timeline`}
    >
      {/* Title bar */}
      <div className="flex items-stretch border-b border-white/[0.06]">
        <div className="flex w-12 shrink-0 items-center justify-center">
          <Image src="/icon.png" alt="" width={20} height={20} unoptimized />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-zinc-500">
            <RailIcon name="back" />
            <RailIcon name="forward" />
            <RailIcon name="refresh" />
          </span>
          <span className="flex items-center gap-1.5 rounded-md border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-[12px] font-semibold text-rose-300">
            <span className="animate-pulse-soft h-1.5 w-1.5 rounded-full bg-rose-400" />
            Replay On
          </span>
          <span className="rounded-md border border-white/10 px-2.5 py-1 text-[12px] text-zinc-300">
            Clip
          </span>
          <span className="text-[12px] text-zinc-500">Alt+V</span>
          {/* The metadata strip the app shows for the open clip. */}
          <span className={`truncate text-[11px] text-zinc-600 ${fade}`}>
            Created: {clip.created} &middot; {clip.format} &middot; {clip.size} &middot; Captured
            with: ClypDat
          </span>
          <span className="ml-auto flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-white/15" />
            ))}
          </span>
        </div>
      </div>

      <div className="flex">
        {/* Icon rail, same construction as the library window - only the lit
            tile differs, because this is the editor rather than the grid. */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-white/[0.06] bg-black/20 py-3">
          <span className="text-zinc-500">
            <RailIcon name="grid" />
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40">
            <RailIcon name="pencil" />
          </span>
          {(["bolt", "clapper", "download"] as const).map((name) => (
            <span key={name} className="text-zinc-500">
              <RailIcon name={name} />
            </span>
          ))}

          <span className="h-px w-5 bg-white/10" />

          {/* The games this panel actually cycles through, lit as each one
              comes up. Same icon cache the library rail draws from. */}
          {clips.map((entry) => (
            <Image
              key={entry.slug}
              src={`/media/games/${entry.icon}.png`}
              alt=""
              width={28}
              height={28}
              unoptimized
              className={`h-7 w-7 rounded-lg object-cover transition-all duration-300 ${
                entry.slug === clip.slug
                  ? "opacity-100 ring-1 ring-sky-400/50"
                  : "opacity-40"
              }`}
            />
          ))}

          <span className="mt-auto text-zinc-600">
            <RailIcon name="gear" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-stretch">
            {/* Preview */}
            <div className="flex min-w-0 flex-1 flex-col p-3">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
                {/* One element for the whole rotation. Remounting it per clip
                    raced the load against play() and left the panel stuck on
                    whichever clip lost. The source is swapped in an effect
                    instead, and only the current clip is ever fetched. */}
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  preload="none"
                  poster={`/media/editor/${clip.slug}/poster.webp`}
                  onEnded={advance}
                  onError={advance}
                  onPlaying={() => setSwapping(false)}
                  width={1280}
                  height={720}
                  aria-hidden
                  className={`h-full w-full object-contain ${fade}`}
                />
              </div>

              {/* Transport. Spans the full width of the video with the
                  buttons centred on it - time and volume pinned left, zoom and
                  fullscreen pinned right, exactly as the app lays it out. */}
              <div className="mt-2.5 flex items-center gap-3 px-1">
                <span className="font-mono text-[11px] text-zinc-300">
                  <span ref={clockRef}>0:00</span>{" "}
                  <span className="text-zinc-600">/ {formatTime(EXCERPT_SECONDS)}</span>
                </span>
                <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 shrink-0 fill-zinc-400">
                  <path d="M4 9v6h4l5 4V5L8 9H4Z" />
                </svg>
                {/* Volume, not progress. It sits at 100% and stays there -
                    the playhead is what tracks position. */}
                <span className="relative h-0.5 w-20 rounded-full bg-white/15">
                  <span className="absolute inset-y-0 left-0 w-full rounded-full bg-sky-400" />
                  <span className="absolute top-1/2 right-[-4px] h-2 w-2 -translate-y-1/2 rounded-full bg-zinc-100" />
                </span>
                <span className="font-mono text-[11px] text-zinc-500">100%</span>
                <span className="text-[11px] text-zinc-600">Reset</span>

                <div className="mx-auto flex items-center gap-4 text-zinc-300">
                  {[
                    "M6 6h2v12H6Zm3.5 6 8.5 6V6Z",
                    "M15 6v12L6 12l9-6Z",
                    "M8 5v14l11-7L8 5Z",
                    "M9 6v12l9-6-9-6Z",
                    "M16 6h2v12h-2Zm-1.5 6L6 6v12Z",
                  ].map((d, i) => (
                    <svg
                      key={i}
                      viewBox="0 0 24 24"
                      aria-hidden
                      className={`fill-current ${i === 2 ? "h-4 w-4 text-zinc-50" : "h-3 w-3 text-zinc-400"}`}
                    >
                      <path d={d} />
                    </svg>
                  ))}
                </div>

                <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 shrink-0 fill-zinc-400">
                  <path d="M4 4h6v2H6v4H4V4Zm10 0h6v6h-2V6h-4V4ZM4 14h2v4h4v2H4v-6Zm14 0h2v6h-6v-2h4v-4Z" />
                </svg>
              </div>
            </div>

            {/* Clip details */}
            <div className="w-[240px] shrink-0 border-l border-white/[0.06] p-3">
              <p className="text-[11px] font-semibold tracking-wide text-zinc-300">
                CLIP DETAILS
              </p>
              <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <p className="text-[9px] uppercase tracking-widest text-zinc-600">
                  Title
                </p>
                <p
                  className={`mt-1.5 truncate rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-zinc-200 ${fade}`}
                >
                  {clip.title}
                </p>
                <p className="mt-3 text-[9px] uppercase tracking-widest text-zinc-600">
                  Description
                </p>
                <p className="mt-1.5 h-10 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-zinc-600">
                  Add a description
                </p>
              </div>

              <div className="mt-3 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2.5">
                <p className="text-[9px] uppercase tracking-widest text-zinc-600">
                  Export codec
                </p>
                <p className="mt-1.5 flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-zinc-200">
                  H.264 <span className="text-zinc-600">&#9662;</span>
                </p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <span className="rounded-md border border-white/10 px-2 py-1.5 text-center text-[11px] text-zinc-200">
                  Save Trim
                </span>
                <span className="animate-row-glow rounded-md bg-sky-500 px-2 py-1.5 text-center text-[11px] font-semibold text-white">
                  Export
                </span>
              </div>
              <span className="mt-2 block rounded-md border border-white/10 px-2 py-1.5 text-center text-[11px] text-zinc-300">
                Share
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative border-t border-white/[0.06] px-3 pb-3 pt-2">
            <TimeRuler />

            {/* Sized for the busiest clip, so a one-track recording does not
                make the whole page jump when the rotation reaches it. */}
            <div className={`min-h-[162px] space-y-1.5 ${fade}`}>
              {/* Video track: frames cut from this clip at this clip's length. */}
              <div className="flex items-stretch gap-2">
                <div className="flex w-[92px] shrink-0 items-center rounded-md border border-white/[0.06] bg-white/[0.02] px-2 text-[10px] text-zinc-400">
                  Video
                </div>
                <div className="relative h-9 min-w-0 flex-1 overflow-hidden rounded-md">
                  <Image
                    key={clip.slug}
                    src={`/media/editor/${clip.slug}/filmstrip.webp`}
                    alt=""
                    fill
                    sizes="640px"
                    unoptimized
                    className="object-cover"
                  />
                </div>
              </div>

              {clip.waveforms.map((values, i) => {
                const track = TRACKS[i];
                return (
                  <div key={track.label} className="flex items-stretch gap-2">
                    <div className="w-[92px] shrink-0 rounded-md border border-white/[0.06] bg-white/[0.02] px-2 py-1">
                      <p className="truncate text-[9px] text-zinc-400">
                        {track.label}
                      </p>
                      {/* Per-track volume, at the position the app had it. */}
                      <div className="mt-1 flex items-center gap-1">
                        <svg
                          viewBox="0 0 24 24"
                          aria-hidden
                          className="h-2.5 w-2.5 shrink-0 fill-zinc-500"
                        >
                          <path d="M4 9v6h4l5 4V5L8 9H4Z" />
                        </svg>
                        <span className="relative h-0.5 flex-1 rounded-full bg-white/15">
                          <span
                            className="absolute inset-y-0 left-0 rounded-full bg-zinc-300"
                            style={{ width: `${track.volume * 100}%` }}
                          />
                          <span
                            className="absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-zinc-200"
                            style={{ left: `calc(${track.volume * 100}% - 4px)` }}
                          />
                        </span>
                      </div>
                    </div>
                    <div className="h-9 min-w-0 flex-1 overflow-hidden rounded-md bg-white/[0.03]">
                      <Waveform values={values} colour={track.colour} />
                    </div>
                  </div>
                );
              })}

            </div>

            {/* Playhead. Sits over the tracks and follows the video rather than
                a timer, so where it points is where the frame is. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-2 left-[112px] right-3 overflow-hidden"
            >
              <div
                ref={playheadRef}
                className="absolute inset-y-0 left-0 w-px bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.5)]"
              >
                <span className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
