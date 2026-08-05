"use client";

import { useState } from "react";
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
      "GPU-side downscaling and NVENC encoding, falling back to AMD AMF and then software libx264 - it isn't NVIDIA-only, and it isn't going to tank your frame rate.",
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
  "flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-sm";
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
            { name: "libx264", note: "Software fallback", active: false },
          ].map((encoder) => (
            <div
              key={encoder.name}
              className={`${row} relative overflow-hidden ${
                encoder.active
                  ? "animate-row-glow border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200"
                  : "text-zinc-400"
              }`}
            >
              {encoder.active ? (
                <span
                  aria-hidden
                  className="animate-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-300/20 to-transparent"
                />
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

    case "cs2":
      return (
        <div className="space-y-3">
          <div className={row}>
            <span className="text-zinc-300">Game State Integration</span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-300/80">
              <span className="animate-pulse-soft h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Connected
            </span>
          </div>
          <p className="pt-1 text-xs uppercase tracking-widest text-zinc-600">
            Saves a clip on
          </p>
          {/* Events arriving on the feed, in turn. */}
          <div className="flex flex-wrap gap-2">
            <span className={`${chip} animate-chip-1`}>Kill</span>
            <span className={`${chip} animate-chip-2`}>Headshot</span>
            <span className={`${chip} animate-chip-3`}>Multi-kill</span>
          </div>
          <p className="pt-1 text-xs text-zinc-500">
            Reads the game&apos;s own event feed. No screen analysis, no audio
            analysis.
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
              <div className="animate-fill-grow h-full bg-gradient-to-r from-emerald-400/10 to-emerald-400/25" />
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

    case "medal":
      return (
        <div className="space-y-3">
          <div className={row}>
            <span className="text-zinc-300">Medal database</span>
            <span className="text-xs text-zinc-500">Read-only</span>
          </div>
          {/* Clips moving across, one at a time. */}
          <div className="flex justify-center gap-2 py-1">
            <span className="animate-flow-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span className="animate-flow-dot-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </div>
          <div className={`${row} animate-pop-in border-emerald-400/25 bg-emerald-400/[0.06]`}>
            <span className="text-emerald-200">Your ClypDat library</span>
            <span className="text-xs text-emerald-300/70">Titles intact</span>
          </div>
          <p className="pt-1 text-xs text-zinc-500">
            Falls back to scanning the clips folder if the database isn&apos;t
            readable.
          </p>
        </div>
      );

    default:
      return null;
  }
}

export default function Features() {
  const [active, setActive] = useState(0);

  // Selection is click-only. It used to follow scroll position, which meant
  // the panel changed under you while you were reading whichever one you had
  // deliberately picked - more fidgety than useful.


  return (
    <section id="features" className="section-lazy relative overflow-hidden px-6 py-32 sm:py-40">
      <div className="mx-auto max-w-6xl">
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

          <div className="mt-8 grid gap-5 border-t border-white/[0.06] pt-6">
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

        {/* Desktop keeps the list beside a panel that stays put as you read. */}
        <div className="mt-16 hidden gap-10 lg:mt-20 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          <div className="flex flex-col gap-2">
            {features.map((feature, index) => {
              const isActive = index === active;
              return (
                <button
                  key={feature.id}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-pressed={isActive}
                  className={`rounded-2xl px-5 py-4 text-left transition-all duration-500 ${
                    isActive ? "bg-white/[0.06]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <h3
                    className={`text-lg font-semibold transition-colors duration-500 ${
                      isActive ? "text-zinc-50" : "text-zinc-400"
                    }`}
                  >
                    {feature.title}
                  </h3>
                  {/* Body copy is always present rather than collapsed - an
                      accordion here would hide the substance behind a click. */}
                  <p
                    className={`mt-2 text-sm leading-7 transition-colors duration-500 ${
                      isActive ? "text-zinc-400" : "text-zinc-500"
                    }`}
                  >
                    {feature.description}
                  </p>
                </button>
              );
            })}

            <div className="mt-6 grid gap-4 border-t border-white/[0.06] pt-6 sm:grid-cols-2">
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

          <div className="lg:sticky lg:top-28 lg:self-start">
            {/* A short stack of cards rather than a single flat panel - the
                layers behind are inert, and only exist to give the front one
                somewhere to sit. */}
            <div className="relative">
              <div
                aria-hidden
                className="absolute inset-x-8 -top-4 h-10 rounded-2xl border border-white/[0.06] bg-white/[0.02]"
              />
              <div
                aria-hidden
                className="absolute inset-x-4 -top-2 h-10 rounded-2xl border border-white/[0.08] bg-white/[0.03]"
              />
              {/* No backdrop-blur. There is nothing behind this panel but a
                  soft gradient wash, so the blur cost a full backdrop read per
                  frame to soften something already soft. */}
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/40 sm:p-8">
                <div className="relative min-h-[300px]">
                  {features.map((feature, index) => (
                    <div
                      key={feature.id}
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
    </section>
  );
}
