"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Reveal, { RevealWords } from "./Reveal";

type Feature = {
  id: string;
  title: string;
  description: string;
};

const features: Feature[] = [
  {
    id: "no-hook",
    title: "No process hook",
    description:
      "Built directly on DXGI Desktop Duplication instead of injecting into the game, so anti-cheat has nothing to flag. True per-window capture keeps recording through alt-tabs and overlays.",
  },
  {
    id: "gpu",
    title: "GPU-accelerated everything",
    description:
      "GPU-side downscaling and NVENC encoding, falling back to AMD AMF, Intel Quick Sync and then software libx264 - it isn't NVIDIA-only, and it isn't going to tank your frame rate.",
  },
  {
    id: "session",
    title: "Full session recording",
    description:
      "Optionally record the entire session to one file alongside the rolling clip buffer. Audio resyncs every 60s so multi-hour sessions don't drift out of sync.",
  },
  {
    id: "detection",
    title: "Smart game detection",
    description:
      "Foreground-window scanning against a catalog of known games and your installed Steam library, updated from GitHub. Clips are named after the game automatically.",
  },
];

// Real features, but ones that do not need a diagram to land. Keeping them as a
// short row under the list means the section is four panels deep instead of six
// without quietly dropping two things the app does.
const alsoDoes = [
  {
    title: "CS2 auto-clipping",
    description:
      "Listens to CS2's own Game State Integration feed - no screen or voice analysis - and saves a clip on kills, headshots or multi-kills. (Experimental)",
  },
  {
    title: "Import from Medal",
    description:
      "Scans Medal's local database, or its clips folder as a fallback, and copies your existing clips over with their titles intact.",
  },
];

// Panel styling shared by every visual, so they read as one family rather than
// six unrelated illustrations.
const row =
  "flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-[15px]";
const chip =
  "rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-zinc-400";

// Diagrams rather than mocked-up screenshots. Each one states something true
// about the feature - a fake UI would be prettier and would be lying.
function FeatureVisual({ id }: { id: string }) {
  switch (id) {
    case "no-hook":
      return (
        <div className="space-y-3">
          <div className={row}>
            <span className="text-zinc-300">Your game</span>
            <span className="text-xs text-zinc-500">Untouched</span>
          </div>
          <div className="flex items-center gap-3 px-1">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <span className="text-[11px] uppercase tracking-widest text-zinc-600">
              No injection
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>
          <div className={`${row} border-emerald-400/25 bg-emerald-400/[0.06]`}>
            <span className="text-emerald-200">DXGI Desktop Duplication</span>
            <span className="text-xs text-emerald-300/70">OS-level</span>
          </div>
          {/* Frames arriving, one after another, without anything touching the
              game process. */}
          <div className="flex justify-center gap-2">
            <span className="animate-flow-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="animate-flow-dot-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="animate-flow-dot-3 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <div className={row}>
            <span className="text-zinc-300">ClypDat</span>
            <span className="text-xs text-zinc-500">Reads frames</span>
          </div>
        </div>
      );

    case "gpu":
      return (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-widest text-zinc-600">
            Encoder, in order of preference
          </p>
          {[
            { name: "NVENC", note: "NVIDIA", active: true },
            { name: "AMD AMF", note: "Radeon", active: false },
            { name: "Intel QSV", note: "Arc / Iris Xe", active: false },
            { name: "libx264", note: "Software fallback", active: false },
          ].map((encoder) => (
            <div
              key={encoder.name}
              className={`${row} relative ${
                encoder.active
                  ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200"
                  : "text-zinc-400"
              }`}
            >
              {encoder.active ? (
                <>
                  {/* The glow, as a layer that fades rather than a box-shadow
                      keyframe. It sits outside the clip below because an outer
                      shadow spreads past its own element and would be cut off
                      by an overflow-hidden parent. */}
                  <span
                    aria-hidden
                    className="animate-row-glow pointer-events-none absolute inset-0 rounded-lg shadow-[0_0_20px_-6px_rgb(52_211_153_/_0.5)]"
                  />
                  {/* The clip the shimmer needs, on its own element, so the row
                      itself is free of overflow-hidden. */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-lg"
                  >
                    <span className="animate-shimmer absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-300/20 to-transparent" />
                  </span>
                </>
              ) : null}
              <span className="relative">{encoder.name}</span>
              <span className="relative text-xs opacity-70">{encoder.note}</span>
            </div>
          ))}
          <p className="pt-1 text-xs text-zinc-500">
            Downscaling happens on the GPU, before the encoder ever sees a frame.
          </p>
        </div>
      );

    case "session":
      return (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-zinc-600">
              Rolling buffer
            </p>
            {/* Frames marching through a fixed window - the oldest fall off the
                left as new ones arrive. */}
            <div className="relative h-8 overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
              <div className="animate-buffer-shift flex h-full w-[200%] items-center gap-1 px-1">
                {Array.from({ length: 48 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-4 flex-1 rounded-sm bg-emerald-400/20"
                  />
                ))}
              </div>
              <div className="absolute inset-y-0 right-0 w-1/4 bg-emerald-400/15" />
              <div className="absolute inset-y-0 right-1/4 w-px bg-emerald-400/40" />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Last few minutes, overwriting oldest frames.
            </p>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-widest text-zinc-600">
              Full session
            </p>
            <div className="h-8 overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
              {/* Full width, scaled down. The bar used to animate its own
                  `width`, which ran layout on every frame - see globals.css. */}
              <div className="animate-fill-grow h-full w-full bg-gradient-to-r from-emerald-400/10 to-emerald-400/25" />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Audio resyncs every 60s, so hour six is still in sync.
            </p>
          </div>
        </div>
      );

    case "detection":
      return (
        <div className="space-y-3">
          <div className={row}>
            <span className="font-mono text-xs text-zinc-500">
              Foreground window
            </span>
          </div>
          <div className="flex justify-center py-1 text-zinc-600">
            <span className="animate-flow-dot">&darr;</span>
          </div>
          <div
            className={`${row} relative overflow-hidden border-emerald-400/25 bg-emerald-400/[0.06]`}
          >
            <span
              aria-hidden
              className="animate-scan-line pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-transparent via-emerald-300/20 to-transparent"
            />
            <span className="relative text-emerald-200">Fortnite</span>
            <span className="relative text-xs text-emerald-300/70">Matched</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className={chip}>Known-game catalog</span>
            <span className={chip}>Your Steam library</span>
          </div>
        </div>
      );

    default:
      return null;
  }
}

// The conditions under which the section is scroll-driven. Both are duplicated
// in globals.css - the CSS builds the runway, this decides whether to read it,
// and they have to agree.
const PIN_QUERY = "(min-width: 1024px) and (min-height: 820px)";
const STILL_QUERY = "(prefers-reduced-motion: reduce)";

export default function Features() {
  // The step, and which way it was taken. The card that arrives comes from the
  // side the scroll came from, so moving back up the list does not look like
  // moving down it - which is why the direction is part of the same state
  // rather than something derived afterwards.
  const [step, setStep] = useState({ index: 0, forward: true });
  const active = step.index;
  const setActive = useCallback((next: number | ((current: number) => number)) => {
    setStep((current) => {
      const index = typeof next === "function" ? next(current.index) : next;
      if (index === current.index) return current;
      return { index, forward: index > current.index };
    });
  }, []);
  const trackRef = useRef<HTMLDivElement>(null);

  // Whether the scroll-driven behaviour applies right now. It has to match the
  // CSS in globals.css exactly, or the runway and the selection disagree.
  const pinnedNow = () =>
    window.matchMedia(PIN_QUERY).matches &&
    !window.matchMedia(STILL_QUERY).matches;

  // Position within the runway picks the feature: the runway is divided into
  // one equal band per feature, and whichever band the scroll sits in is the
  // one on screen.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const desktop = window.matchMedia(PIN_QUERY);
    const still = window.matchMedia(STILL_QUERY);

    let frame = 0;

    const measure = () => {
      frame = 0;
      // The distance the stage spends stuck: everything past the one viewport
      // the stage itself occupies.
      const travel = track.offsetHeight - window.innerHeight;
      if (travel <= 0) return;
      const progress = -track.getBoundingClientRect().top / travel;
      const band = Math.floor(progress * features.length);
      const index = Math.min(features.length - 1, Math.max(0, band));
      setActive((current) => (current === index ? current : index));
    };

    // Scroll fires far more often than the screen refreshes, and the read here
    // forces layout - one measurement per frame is all that can be shown.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    const detach = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };

    const attach = () => {
      detach();
      if (!desktop.matches || still.matches) return;
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      measure();
    };

    attach();
    desktop.addEventListener("change", attach);
    still.addEventListener("change", attach);

    return () => {
      detach();
      desktop.removeEventListener("change", attach);
      still.removeEventListener("change", attach);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // Clicking a feature still works, but while pinned the selection belongs to
  // the scroll position - setting it without moving the page would have the
  // next wheel notch snap it straight back. So a click scrolls to the middle of
  // that feature's band and lets the measurement above do the selecting.
  const select = useCallback((index: number) => {
    setActive(index);

    const track = trackRef.current;
    if (!track || !pinnedNow()) return;

    const travel = track.offsetHeight - window.innerHeight;
    if (travel <= 0) return;

    const top =
      track.getBoundingClientRect().top +
      window.scrollY +
      (travel * (index + 0.5)) / features.length;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  return (
    // No `overflow-hidden` here and no `section-lazy`: the first breaks a
    // sticky descendant outright (it becomes a scrollport of its own, and the
    // stage sticks to that instead of to the viewport), and the second reserves
    // a 900px placeholder for a section that is now several viewports tall,
    // which makes the scrollbar lie and the runway jump as it resolves.
    // `overflow-x-clip` still contains the ambient wash sideways without
    // creating a scroll container.
    <section
      id="features"
      className="section-anchor-pinned relative overflow-x-clip px-6 py-32 sm:py-40"
    >
      <div className="mx-auto max-w-7xl">
        {/* The runway. Its only job is to be tall: one viewport for the stage,
            plus one step of scroll per feature after the first. */}
        <div
          ref={trackRef}
          className="pin-track"
          style={{ "--pin-steps": features.length } as CSSProperties}
        >
          <div className="pin-stage">
            <div className="max-w-3xl">
              <Reveal
                as="p"
                className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/70"
              >
                Capture
              </Reveal>
              <h2 className="font-display text-display mt-6 font-semibold text-4xl leading-[1.05] tracking-[-0.02em] text-balance sm:text-6xl">
                <RevealWords text="Built for how you" />{" "}
                <RevealWords text="actually play." wordClassName="text-accent" />
              </h2>
              <Reveal delay={280} as="p" className="mt-6 max-w-xl text-lg text-zinc-400">
                Two capture backends, switchable in Settings - ClypDat&apos;s own
                native engine by default, with Windows Capture as a fallback.
                Neither one hooks into your game.
              </Reveal>
            </div>

            {/* Phone: a tab row, then the active description, then its diagram.
                A stacked list with a diagram under each item is far taller than a
                phone wants, and a panel above the list updates something you have
                already scrolled past. */}
            <div className="mt-12 lg:hidden">
              <div className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {features.map((feature, index) => (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => setActive(index)}
                    aria-pressed={index === active}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors duration-300 ${
                      index === active
                        ? "bg-white/[0.08] text-zinc-50"
                        : "text-zinc-500"
                    }`}
                  >
                    {feature.title}
                  </button>
                ))}
              </div>

              <p className="mt-5 text-sm leading-7 text-zinc-400">
                {features[active].description}
              </p>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <FeatureVisual id={features[active].id} />
              </div>
            </div>

            {/* Desktop: the list beside its panel, both inside the stuck stage. */}
            <div className="mt-12 hidden gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
              <div className="flex flex-col gap-2">
                {features.map((feature, index) => {
                  const isActive = index === active;
                  return (
                    <button
                      key={feature.id}
                      type="button"
                      onClick={() => select(index)}
                      aria-pressed={isActive}
                      className={`rounded-2xl px-6 py-5 text-left transition-all duration-500 ${
                        isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <h3
                        className={`text-xl font-semibold transition-colors duration-500 ${
                          isActive ? "text-zinc-50" : "text-zinc-400"
                        }`}
                      >
                        {feature.title}
                      </h3>
                      {/* Body copy is always present rather than collapsed - an
                          accordion here would hide the substance behind a click,
                          and the four of them together are what fills the stage.
                          Collapsing the inactive three left half a viewport of
                          nothing under the section. */}
                      <p
                        className={`mt-2 text-[15px] leading-7 transition-colors duration-500 ${
                          isActive ? "text-zinc-400" : "text-zinc-500"
                        }`}
                      >
                        {feature.description}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Centred against the list rather than stretched to it. Matching
                  the list's height meant a 300px diagram adrift in a 600px box,
                  and spreading the diagram out to fill that box only made the
                  drawing itself look broken - a flow chart with a screen of
                  nothing between its steps. The panel is the size of its
                  contents, and the leftover height sits outside it. */}
              <div className="lg:self-center">
                {/* A short stack of cards rather than a single flat panel - the
                    layers behind are inert, and only exist to give the front one
                    somewhere to sit. */}
                {/* Keyed on the step so the deal animation replays on every
                    change - a CSS animation only runs when the element is new to
                    the DOM, and re-adding the class on an existing node does
                    nothing. The visuals inside are the same four either way. */}
                <div className="relative" key={active}>
                  {/* Only the sliver that sits above the front panel is drawn.
                      These are full 40px cards, and the front panel is a 4% white
                      tint rather than an opaque surface - it used to carry a
                      backdrop blur that smeared their lower halves away, and when
                      that went (it cost a backdrop read per frame) the halves
                      behind the panel started showing straight through it as two
                      stray lines across every diagram. Clipping at the panel's top
                      edge fixes it without the panel having to be opaque, and
                      without paying for a blur. */}
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute inset-x-0 -top-4 h-4 overflow-hidden ${
                      step.forward ? "animate-stack-back" : "animate-stack-back-up"
                    }`}
                  >
                    <div className="absolute inset-x-8 top-0 h-10 rounded-2xl border border-white/[0.06] bg-white/[0.02]" />
                    <div className="absolute inset-x-4 top-2 h-10 rounded-2xl border border-white/[0.08] bg-white/[0.03]" />
                  </div>
                  {/* No backdrop-blur. There is nothing behind this panel but a
                      soft gradient wash, so the blur cost a full backdrop read per
                      frame to soften something already soft. */}
                  <div
                    className={`relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 sm:p-8 lg:p-10 ${
                      step.forward ? "animate-stack-deal" : "animate-stack-deal-up"
                    }`}
                  >
                    {/* One fixed height for all four diagrams on desktop, so the
                        panel does not resize under you as the scroll steps
                        through them - the tallest of them sets it. */}
                    <div className="relative min-h-[300px] w-full lg:h-[300px]">
                      {features.map((feature, index) => (
                        <div
                          key={feature.id}
                          // The three panels behind the visible one stay mounted so
                          // the crossfade has something to fade to, but their
                          // animations are held - opacity 0 hides an animation, it
                          // does not stop it. See globals.css.
                          data-visual={index === active ? "on" : "off"}
                          className={`absolute inset-0 transition-opacity duration-500 ${
                            index === active
                              ? "opacity-100"
                              : "pointer-events-none opacity-0"
                          }`}
                          aria-hidden={index !== active}
                        >
                          <FeatureVisual id={feature.id} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The rest of the section, below the runway - reached once the last
            feature has had its turn and the stage lets go. */}
        {/* No extra top margin on desktop: the stage already ends with half a
            viewport of centring slack under it, and stacking a margin on top of
            that put the divider most of a screen away from anything. */}
        <div className="mt-12 grid gap-5 border-t border-white/[0.06] pt-8 sm:grid-cols-2 sm:gap-8 lg:mt-0">
          {alsoDoes.map((item) => (
            <div key={item.title}>
              <h3 className="text-sm font-semibold text-zinc-300">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-zinc-500">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
