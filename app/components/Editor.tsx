import EditorGraphic from "./EditorGraphic";
import ScaleToFit from "./ScaleToFit";
import { Chapter } from "./Slate";

// A channel strip under the window: one column per thing the editor does,
// each with the label the app would print over it.
const strip = [
  { label: "Trim", text: "Set the start and end with thumbnail scrubbing and a waveform view." },
  { label: "Tracks", text: "Game, chat and mic are separate tracks, each with its own volume." },
  { label: "Export", text: "Mixes every track into one file that plays anywhere." },
  { label: "Save trim", text: "Cuts the file in place and keeps the tracks separate." },
  { label: "Encode", text: "NVENC export in H.264, H.265 or AV1, falling back to the CPU when there's no GPU encoder." },
];

export default function Editor() {
  return (
    <section
      id="editor"
      className="section-anchor section-lazy border-t border-rule px-4 py-15 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <Chapter tc="00:01:02:09" label="Editor" />

        <div className="mt-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="display text-balance text-[clamp(2.75rem,8vw,6.5rem)]">
            Every clip opens
            <br />
            in the editor.
          </h2>
          <p className="max-w-sm text-lg leading-relaxed text-dim lg:text-right">
            Cut it down, set each audio track&apos;s level and export, without
            opening another program.
          </p>
        </div>

        <figure className="mx-auto mt-14 max-w-[1176px] sm:mt-20">
          <div className="viewfinder">
            <ScaleToFit designWidth={1152}>
              <EditorGraphic />
            </ScaleToFit>
          </div>
          {/* Below lg the window is scaled down far enough that the copy of
              this line inside its description field is unreadable, so it is
              printed here instead - see EditorGraphic. */}
          <figcaption className="slate mt-3 normal-case tracking-normal lg:hidden">
            Preview footage is a six-second excerpt, re-encoded to 720p and
            muted for the page. The clip details are the original
            recording&apos;s.
          </figcaption>
        </figure>

        <ul className="mt-12 grid divide-y divide-rule border-y border-rule lg:grid-cols-5 lg:divide-x lg:divide-y-0">
          {strip.map((item) => (
            <li key={item.label} className="py-5 lg:px-5 lg:first:pl-0">
              <p className="slate text-paper">{item.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-dim">{item.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
