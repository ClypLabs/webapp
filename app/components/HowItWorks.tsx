import type { ReactNode } from "react";
import Reveal, { RevealWords } from "./Reveal";

// Each step's little picture. Like the feature diagrams, these only show what
// the app actually does: a toggle that stays on, a buffer that drops its
// oldest frames, a key that writes a file named after the game.
function ArmVisual() {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-zinc-200">Replay buffer</p>
        <p className="mt-0.5 text-xs text-zinc-500">Keeps the last 1:00</p>
      </div>
      {/* A switch in the on position, drawn rather than interactive. */}
      <span aria-hidden className="relative h-6 w-11 rounded-full bg-emerald-400/90">
        <span className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-emerald-950" />
      </span>
    </div>
  );
}

function PlayVisual() {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 text-zinc-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-pulse-soft absolute inline-flex h-full w-full rounded-full bg-rose-400" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-rose-400" />
          </span>
          Buffering
        </span>
        <span className="font-mono text-zinc-500">-1:00 &rarr; now</span>
      </div>
      {/* Frames sliding left through a fixed window, the oldest falling off
          the edge - the same loop as the session diagram in Features. */}
      <div className="relative mt-3 h-6 overflow-hidden rounded-md">
        <div className="animate-buffer-shift flex h-full w-[200%] gap-1">
          {Array.from({ length: 40 }).map((_, i) => (
            <span key={i} className="h-full flex-1 rounded-sm bg-emerald-400/20" />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[#0d1116] to-transparent" />
      </div>
    </div>
  );
}

function SaveVisual() {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
      <div className="flex items-center gap-1.5">
        {/* AppSettings.SaveReplayHotkey in the desktop app. */}
        {["Ctrl", "Shift", "F9"].map((key, index) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            {index > 0 ? <span aria-hidden className="text-xs text-zinc-600">+</span> : null}
            <kbd className="kbd text-sm">{key}</kbd>
          </span>
        ))}
        <span className="ml-auto text-xs text-zinc-500">default</span>
      </div>
      <p className="mt-3 flex items-center gap-2 truncate text-xs text-emerald-200/90">
        <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        <span className="truncate font-mono">Fortnite 2026-09-11 21-04-12.mp4</span>
      </p>
    </div>
  );
}

const steps: { step: string; title: string; body: string; visual: ReactNode }[] = [
  {
    step: "01",
    title: "Turn it on once",
    body: "Switch on the replay buffer and leave it. ClypDat keeps the last few minutes of gameplay and drops the oldest frames as new ones come in.",
    visual: <ArmVisual />,
  },
  {
    step: "02",
    title: "Play",
    body: "A clutch round, a ragdoll you'll never see again, a bug you want to report. You don't have to remember to hit record.",
    visual: <PlayVisual />,
  },
  {
    step: "03",
    title: "Press the key",
    body: "The footage is already recorded, so the clip saves straight away, named after the game and ready to trim.",
    visual: <SaveVisual />,
  },
];

export default function HowItWorks() {
  return (
    <section className="relative px-6 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal
            as="p"
            className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/70"
          >
            How it works
          </Reveal>
          <h2 className="font-display text-display mt-6 font-semibold text-4xl leading-[1.05] tracking-[-0.02em] text-balance sm:text-6xl">
            <RevealWords text="Recording" />{" "}
            <RevealWords text="after the fact." wordClassName="text-accent" />
          </h2>
          <Reveal
            delay={260}
            as="p"
            className="mx-auto mt-6 max-w-xl text-lg text-zinc-400 text-balance"
          >
            Normal recording makes you press record before anything happens.
            A replay buffer is always rolling, so you decide afterwards.
          </Reveal>
        </div>

        <ol className="mt-16 grid gap-4 md:mt-20 md:grid-cols-3 md:gap-5">
          {steps.map((item, index) => (
            <Reveal
              key={item.step}
              as="li"
              delay={index * 130}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition-colors duration-500 hover:border-white/20 sm:p-7"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-400/10 font-mono text-xs text-emerald-300">
                  {item.step}
                </span>
                <h3 className="text-lg font-semibold text-zinc-100">{item.title}</h3>
              </div>
              <p className="mt-4 flex-1 text-sm leading-7 text-zinc-400">{item.body}</p>
              <div className="mt-6">{item.visual}</div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
