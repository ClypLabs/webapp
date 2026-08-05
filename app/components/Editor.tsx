import Reveal, { RevealWords } from "./Reveal";

const editorPoints = [
  "Trim start/end with a scrubbable thumbnail preview and waveform view",
  "Per-track audio volume, including separate game/chat/mic tracks",
  "Export mixes every track down to one file that plays anywhere",
  "Save Trim re-encodes in place and keeps tracks separately editable",
  "GPU export via NVENC (H.264/H.265/AV1) with automatic CPU fallback",
];

const contextActions = [
  "Rename",
  "Export",
  "Delete",
  "Open file location",
  "Filter by game",
  "Filter by clip type",
];

export default function Editor() {
  return (
    <section id="editor" className="relative px-6 py-32 sm:py-40">
      <div className="mx-auto grid max-w-6xl gap-14 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div>
          <Reveal
            as="p"
            className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/70"
          >
            Editor
          </Reveal>
          <h2 className="font-display text-display mt-6 font-semibold text-4xl leading-[1.05] tracking-[-0.02em] text-balance sm:text-6xl">
            <RevealWords text="A real editor," />{" "}
            <RevealWords text="not an afterthought." wordClassName="text-accent" />
          </h2>
          <Reveal delay={300} as="p" className="mt-6 text-lg text-zinc-400">
            Every clip opens straight into ClypDat&apos;s built-in editor. Trim
            it, balance the audio tracks, and export &mdash; no round trip
            through another app.
          </Reveal>

          <ul className="mt-10 space-y-5">
            {editorPoints.map((point, index) => (
              <Reveal
                key={point}
                as="li"
                delay={index * 80}
                className="flex items-start gap-3.5"
              >
                <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span className="text-sm leading-7 text-zinc-300">{point}</span>
              </Reveal>
            ))}
          </ul>
        </div>

        <Reveal
          delay={120}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-7 sm:p-9"
        >
          {/* A stylised context menu rather than a screenshot of one. It shows
              the real actions, and it stays legible at any width. */}
          <p className="text-xs uppercase tracking-widest text-zinc-600">
            Right-click a clip to
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2.5 text-sm text-zinc-200">
            {contextActions.map((action, index) => (
              <Reveal
                key={action}
                as="li"
                delay={160 + index * 55}
                className="rounded-lg border border-white/10 bg-white/[0.02] px-3.5 py-3 transition-colors duration-300 hover:border-emerald-400/25 hover:bg-white/[0.05]"
              >
                {action}
              </Reveal>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
