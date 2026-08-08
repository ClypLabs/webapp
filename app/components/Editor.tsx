import EditorGraphic from "./EditorGraphic";
import ScaleToFit from "./ScaleToFit";
import Reveal, { RevealWords } from "./Reveal";

// Split into the two columns that flank the window, in reading order: down the
// left of it, then down the right.
const leftPoints = [
  "Trim start/end with a scrubbable thumbnail preview and waveform view",
  "Per-track audio volume, including separate game/chat/mic tracks",
  "Export mixes every track down to one file that plays anywhere",
];

const rightPoints = [
  "Save Trim re-encodes in place and keeps tracks separately editable",
  "GPU export via NVENC (H.264/H.265/AV1) with automatic CPU fallback",
];

function Points({ points, offset }: { points: string[]; offset: number }) {
  return (
    <ul className="space-y-5 lg:space-y-7">
      {points.map((point, index) => (
        <Reveal
          key={point}
          as="li"
          delay={(offset + index) * 70}
          className="flex items-start gap-3"
        >
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
          <span className="text-sm leading-6 text-zinc-300">{point}</span>
        </Reveal>
      ))}
    </ul>
  );
}


export default function Editor() {
  return (
    <section id="editor" className="section-lazy relative px-6 py-32 sm:py-40">
      {/* Wider than the rest of the page: the window is flanked by its own
          feature list now, and every pixel the columns take is a pixel off the
          window, which scales rather than reflows. */}
      <div className="mx-auto max-w-7xl">
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

        {/* Window in the middle, points either side of it, so the section is
            one block rather than a picture with a list underneath. Below lg
            the columns fall under the window and read as a single list - a
            170px column would put two words on a line. */}
        <div className="mt-12 grid gap-x-6 gap-y-8 lg:grid-cols-[10.5rem_minmax(0,1fr)_10.5rem] lg:items-center">
          <div className="order-2 lg:order-1">
            <Points points={leftPoints} offset={0} />
          </div>

          <Reveal delay={120} className="order-1 lg:order-2">
            {/* Same reasoning as the hero card: the corner radius does not scale
                with the graphic, so it has to step down with the viewport. */}
            <div className="overflow-hidden rounded-md border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/50 sm:rounded-2xl">
              <ScaleToFit designWidth={1152}>
                <EditorGraphic />
              </ScaleToFit>
            </div>
          </Reveal>

          <div className="order-3">
            <Points points={rightPoints} offset={leftPoints.length} />
          </div>
        </div>
      </div>
    </section>
  );
}
