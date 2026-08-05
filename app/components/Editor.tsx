import EditorGraphic from "./EditorGraphic";
import ScaleToFit from "./ScaleToFit";
import Reveal, { RevealWords } from "./Reveal";

const editorPoints = [
  "Trim start/end with a scrubbable thumbnail preview and waveform view",
  "Per-track audio volume, including separate game/chat/mic tracks",
  "Export mixes every track down to one file that plays anywhere",
  "Save Trim re-encodes in place and keeps tracks separately editable",
  "GPU export via NVENC (H.264/H.265/AV1) with automatic CPU fallback",
];


export default function Editor() {
  return (
    <section id="editor" className="section-lazy relative px-6 py-32 sm:py-40">
      <div className="mx-auto max-w-6xl">
        <div className="max-w-3xl">
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
        </div>

        {/* Full width, like the hero. Half a column was never enough room for a
            window with a timeline in it. */}
        <Reveal delay={120} className="mt-12">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/50">
            <ScaleToFit designWidth={1152}>
              <EditorGraphic />
            </ScaleToFit>
          </div>
        </Reveal>

        <ul className="mt-12 grid gap-x-10 gap-y-5 sm:grid-cols-2">
          {editorPoints.map((point, index) => (
            <Reveal
              key={point}
              as="li"
              delay={index * 70}
              className="flex items-start gap-3.5"
            >
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <span className="text-sm leading-7 text-zinc-300">{point}</span>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
