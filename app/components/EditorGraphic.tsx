"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ACCENT, Glyph, RailFooter, TitleBar, paths } from "./AppChrome";
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

// The app draws each audio lane as a solid bar in the track's colour with the
// waveform cut into it in a darker shade, mirrored about the centre line.
// Voice lanes drop their idle floor: in the app a quiet Discord or mic track
// is a hairline between bursts, not a band.
function Waveform({ values, colour, voice }: { values: number[]; colour: string; voice: boolean }) {
  const n = Math.min(values.length, BAR_COUNT);
  const x = (i: number) => ((i / (n - 1)) * 100).toFixed(2);
  const half = (v: number) =>
    voice ? (Math.max(0, v - 0.15) / 0.85) * 44 + 0.6 : (barHeight(v) / 100) * 44;
  const top = values.slice(0, n).map((v, i) => `${x(i)},${(50 - half(v)).toFixed(2)}`);
  const bottom = values
    .slice(0, n)
    .map((v, i) => `${x(i)},${(50 + half(v)).toFixed(2)}`)
    .reverse();
  return (
    <div className="h-full w-full rounded-md" style={{ background: colour }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden className="h-full w-full">
        <path d={`M0,50 L${top.join(" L")} L100,50 L${bottom.join(" L")} Z`} fill="rgb(0 0 0 / 0.34)" />
      </svg>
    </div>
  );
}

// The label column's width, shared by the ruler, the lanes and the playhead
// so the three agree about where a given second is.
const LABEL_W = 150;

// One label per second of the excerpt, with a minor tick every quarter.
function TimeRuler() {
  return (
    <div className="relative h-7">
      {Array.from({ length: EXCERPT_SECONDS + 1 }, (_, i) => (
        <span
          key={i}
          className={`absolute top-0 text-[10px] text-[#9FB2C6] ${
            i === 0 ? "" : i === EXCERPT_SECONDS ? "-translate-x-full" : "-translate-x-1/2"
          }`}
          style={{ left: `${(i / EXCERPT_SECONDS) * 100}%` }}
        >
          {formatTime(i)}
        </span>
      ))}
      <div
        className="absolute inset-x-0 bottom-0 h-1.5"
        style={{
          background: `repeating-linear-gradient(to right, #3A4C5C 0 1px, transparent 1px calc(100% / ${EXCERPT_SECONDS * 4}))`,
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-2.5"
        style={{
          background: `repeating-linear-gradient(to right, #56697A 0 1px, transparent 1px calc(100% / ${EXCERPT_SECONDS}))`,
        }}
      />
    </div>
  );
}

// The editor's tool rail, in the app's order, Info open.
const tools = [
  { label: "Info", d: paths.info },
  { label: "Effects", d: paths.effects },
  { label: "Overlays", d: paths.overlays },
  { label: "Export", d: paths.export },
  { label: "Share", d: paths.share },
];

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

    let lastLabel = "";

    const draw = () => {
      const duration = video.duration || EXCERPT_SECONDS;
      const progress = Math.min(1, video.currentTime / duration);

      if (playheadRef.current) {
        playheadRef.current.style.transform = `translateX(${progress * 100}%)`;
      }

      const label = formatTime(video.currentTime);
      const clock = clockRef.current;
      if (clock && label !== lastLabel) {
        lastLabel = label;
        // nodeValue rather than textContent. Assigning textContent replaces the
        // child text node, which is a childList mutation, which wakes the
        // document-wide MutationObserver in PauseOffscreen - once a second, for
        // a clock tick. Writing through the existing node changes nothing but
        // the characters.
        if (clock.firstChild) clock.firstChild.nodeValue = label;
        else clock.textContent = label;
      }
    };

    // The playhead can only be somewhere new when the video has a new frame.
    // requestAnimationFrame ties it to the display instead, so a 144Hz monitor
    // ran this - and repositioned a composited layer - roughly five times per
    // decoded frame, to put it back where it already was.
    const host = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (callback: () => void) => number;
      cancelVideoFrameCallback?: (handle: number) => void;
    };
    const perFrame = typeof host.requestVideoFrameCallback === "function";
    let handle = 0;

    const tick = () => {
      draw();
      handle = perFrame
        ? host.requestVideoFrameCallback!(tick)
        : requestAnimationFrame(tick);
    };
    tick();

    // Stall watchdog. A clip that stops decoding would otherwise hold the
    // rotation forever, since `ended` never fires for it - and it cannot live
    // in the draw loop any more, because a stalled video stops producing the
    // frame callbacks that would drive it.
    let lastTime = -1;
    let lastMoved = performance.now();
    const watchdog = setInterval(() => {
      const now = performance.now();
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        lastMoved = now;
      } else if (now - lastMoved > 4000) {
        advance();
      }
    }, 1000);

    return () => {
      clearInterval(watchdog);
      if (perFrame) host.cancelVideoFrameCallback?.(handle);
      else cancelAnimationFrame(handle);
    };
  }, [visible, index, still, advance]);

  // Everything that belongs to the open clip fades together - the footage, the
  // metadata, the title and the timeline all describe the same file.
  const fade = `transition-opacity duration-300 ${swapping ? "opacity-0" : "opacity-100"}`;

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[#0D1116] font-app ring-1 ring-white/10 ${className}`}
      role="img"
      aria-label={`The ClypDat editor, playing ${clip.title} with its audio tracks laid out on the timeline`}
    >
      <TitleBar refresh={false}>
        {/* The metadata strip the app shows for the open clip. */}
        <span className={`flex min-w-0 items-center gap-3 truncate ${fade}`}>
          <span>Created: {clip.created}</span>
          <span className="h-4 w-px shrink-0 bg-[#2A3640]" />
          <span>Video Quality: {clip.format}</span>
          <span className="h-4 w-px shrink-0 bg-[#2A3640]" />
          <span>Size: {clip.size}</span>
          <span className="h-4 w-px shrink-0 bg-[#2A3640]" />
          <span>Captured with: ClypDat</span>
        </span>
      </TitleBar>

      <div className="flex">
        {/* The editor's tool rail. The library's filters and the editor's
            sections share this column in the app and swap between modes. */}
        <div className="flex w-14 shrink-0 flex-col border-r border-[#1E2A33] bg-[#0D1116]">
          <div className="flex flex-1 flex-col items-center gap-1 pt-2">
            {tools.map((tool, i) => (
              <span
                key={tool.label}
                className={`flex h-[50px] w-11 flex-col items-center justify-center gap-1 rounded-[10px] ${
                  i === 0 ? "bg-[#2A3350] text-[#A8B4F5]" : "text-[#AAB8C8]"
                }`}
              >
                <Glyph d={tool.d} className="h-4 w-4 fill-current" />
                <span className="text-[9px] font-semibold">{tool.label}</span>
              </span>
            ))}
          </div>
          <RailFooter />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-stretch">
            {/* Preview. The app letterboxes the video on black, with no
                transport bar until the pointer is over it. */}
            <div className="relative aspect-video min-w-0 flex-1 overflow-hidden bg-black">
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
                // Promoted to its own compositing layer. Without this the
                // video paints into the scaled panel, so every decoded frame
                // marks the filmstrip, the waveforms and the whole window
                // dirty and re-rasterises the lot sixty times a second.
                style={{ willChange: "transform" }}
                className={`h-full w-full object-contain ${fade}`}
              />
            </div>

            {/* The Info section: a header band, the Details and Effects
                cards, and the four actions pinned to the floor of the column. */}
            <div className="flex w-[250px] shrink-0 flex-col border-l border-[#1E2A33] bg-[#0F161D]">
              <div className="border-b border-[#1E2A33] bg-[#141D24] px-4 py-3">
                <p className="text-[10px] font-bold text-[#9EC6F0]">Info</p>
                <p className={`mt-0.5 truncate text-[14px] font-bold text-[#EDF4FB] ${fade}`}>{clip.title}</p>
                <p className={`mt-0.5 text-[11px] font-semibold text-[#9EC6F0] ${fade}`}>
                  Video Quality: {clip.format}
                </p>
              </div>

              <div className="space-y-3 p-3">
                <div className="rounded-[10px] border border-[#2B4050] bg-[#16222C] p-3">
                  <p className="text-[10px] font-bold text-[#9EC6F0]">DETAILS</p>
                  <p className="mt-1.5 text-[10px] text-[#9FB2C6]">Title</p>
                  <p
                    className={`mt-1 truncate rounded-md border border-[#2C3B48] bg-[#0D151C] px-2 py-1.5 text-[11px] font-semibold text-[#EDF4FB] ${fade}`}
                  >
                    {clip.title}
                  </p>
                  <p className="mt-2 text-[10px] text-[#9FB2C6]">Description</p>
                  {/* The disclaimer lives in the one field on this panel that
                      is a free text box in the real app, so it reads as
                      something typed into the editor rather than as chrome
                      bolted onto the mock. Only near the design width: below
                      lg the scaled type is unreadable, and the section prints
                      it under the window instead. */}
                  <p className="mt-1 h-[68px] rounded-md border border-[#2C3B48] bg-[#0D151C] px-2 py-1.5 text-[10px] leading-[1.45] text-[#9FB2C6]">
                    <span className="hidden lg:inline">
                      Preview footage is a six-second excerpt, re-encoded to 720p
                      and muted for the page. The clip details are the original
                      recording&apos;s.
                    </span>
                    <span className="text-[#5C6D7E] lg:hidden">Add a description</span>
                  </p>
                </div>

                <div className="rounded-[10px] border border-[#2B4050] bg-[#16222C] p-3">
                  <p className="text-[10px] font-bold text-[#9EC6F0]">EFFECTS</p>
                  <p className="mt-1.5 text-[11px] text-[#9FB2C6]">No effects applied</p>
                  <p className="mt-1 text-[9px] leading-snug text-[#6B7C8C]">
                    Nothing is written to the clip until you export, share or
                    save the trim.
                  </p>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2 border-t border-[#1E2A33] p-3 text-center text-[11px] font-bold">
                <span className="rounded-[7px] border border-[#2C3B48] bg-[#1D2A36] py-1.5 text-[#EDF4FB]">Save Trim</span>
                <span className="rounded-[7px] py-1.5 text-white" style={{ background: ACCENT }}>Export</span>
                <span className="rounded-[7px] border border-[#2C3B48] bg-[#1D2A36] py-1.5 text-[#EDF4FB]">Share</span>
                <span className="rounded-[7px] bg-[#D85E61] py-1.5 text-white">Delete</span>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="border-t border-[#2A3A48] bg-[#111A22] px-3 pb-3 pt-3">
            <div className="flex items-center justify-between rounded-[10px] border border-[#345066] bg-[#14202A] px-4 py-2">
              <div className="min-w-0">
                <p className="text-[9px] font-bold tracking-[0.1em] text-[#7FA5C7]">TIMELINE</p>
                <p className={`truncate text-[14px] font-bold text-[#EDF4FB] ${fade}`}>{clip.title}</p>
              </div>
              <span className="flex shrink-0 items-center gap-2 rounded-[7px] border border-[#283A48] bg-[#0D151C] px-3 py-1.5">
                <span className="text-[9px] font-bold tracking-[0.1em] text-[#7FA5C7]">PLAYHEAD</span>
                <span className="font-mono text-[11px] font-semibold text-[#EDF4FB]">
                  <span ref={clockRef}>0:00</span> / {formatTime(EXCERPT_SECONDS)}
                </span>
              </span>
            </div>

            <div className="relative mt-2">
              <div className="flex items-end gap-2">
                <div className="shrink-0 pb-0.5" style={{ width: LABEL_W }}>
                  <p className="text-[9px] font-bold tracking-[0.1em] text-[#7FA5C7]">TRIM RANGE</p>
                  <p className="font-mono text-[10px] font-semibold text-[#EDF4FB]">
                    0:00 &ndash; {formatTime(EXCERPT_SECONDS)}
                  </p>
                </div>
                <div className="min-w-0 flex-1">
                  <TimeRuler />
                </div>
              </div>

              {/* Sized for the busiest clip, so a one-track recording does not
                  make the whole page jump when the rotation reaches it. */}
              <div className={`mt-1.5 min-h-[170px] space-y-1.5 ${fade}`}>
                <div className="flex items-stretch gap-2">
                  <div
                    className="flex shrink-0 items-center rounded-[9px] border border-[#2B4050] bg-[#16222C] px-3 text-[11px] font-semibold text-[#EDF4FB]"
                    style={{ width: LABEL_W }}
                  >
                    Video
                  </div>
                  <div className="relative h-10 min-w-0 flex-1 overflow-hidden rounded-md border border-[#05C7B7]">
                    <Image
                      key={clip.slug}
                      src={`/media/editor/${clip.slug}/filmstrip.webp`}
                      alt=""
                      fill
                      sizes="760px"
                      unoptimized
                      className="object-cover"
                    />
                    {/* The trim-in handle at the start of the clip. */}
                    <span className="absolute inset-y-0 left-0 w-1.5 bg-[#05C7B7]" />
                  </div>
                </div>

                {clip.waveforms.map((values, i) => {
                  const track = TRACKS[i];
                  return (
                    <div key={track.label} className="flex items-stretch gap-2">
                      <div
                        className="shrink-0 rounded-[9px] border border-[#2B4050] bg-[#16222C] px-3 py-1.5"
                        style={{ width: LABEL_W }}
                      >
                        <p className="truncate text-[11px] font-semibold text-[#EDF4FB]">{track.label}</p>
                        {/* Mute and per-track volume, at the level the app had it. */}
                        <div className="mt-1 flex items-center gap-2">
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[#1D2A36] text-[#C8D9E9]">
                            <Glyph d={paths.volume} className="h-2.5 w-2.5 fill-current" />
                          </span>
                          <span className="relative h-[3px] flex-1 rounded-full bg-[#26323D]">
                            <span
                              className="absolute inset-y-0 left-0 rounded-full"
                              style={{ width: `${track.volume * 100}%`, background: track.colour }}
                            />
                            <span
                              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 bg-[#EEF4FF]"
                              style={{ left: `calc(${track.volume * 100}% - 5px)`, borderColor: track.colour }}
                            />
                          </span>
                        </div>
                      </div>
                      <div className="h-10 min-w-0 flex-1">
                        <Waveform values={values} colour={track.colour} voice={i > 0} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Playhead. Sits over the ruler and the lanes and follows the
                  video rather than a timer, so where it points is where the
                  frame is. */}
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 right-0 top-4"
                style={{ left: LABEL_W + 8 }}
              >
                {/* The carrier is the full width of the lane area so a
                    percentage translate is a percentage of the timeline.
                    Moving it with `left` re-ran layout on every frame; a
                    transform is handled by the compositor. */}
                <div ref={playheadRef} className="absolute inset-y-0 left-0 w-full will-change-transform">
                  <div className="absolute inset-y-0 left-0 w-[2px] -translate-x-1/2 bg-white">
                    <span className="absolute -top-1 left-1/2 h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[8px] border-x-transparent border-t-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
