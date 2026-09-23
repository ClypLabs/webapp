import type { CSSProperties, ReactNode } from "react";
import { Chapter } from "./Slate";

// The capture path, stage by stage, grouped by whose process each stage runs
// in. Every line is checked against the desktop app: Windows Graphics Capture
// for frames, GPU downscale before encode, the encoder order NVENC > AMF >
// Quick Sync > libx264.
type Stage = { slate: string; name: string; note: string };

const groups: { owner: string; stages: Stage[] }[] = [
  {
    owner: "Game process",
    stages: [{ slate: "Source", name: "Your game", note: "Untouched. No hook, no overlay DLL." }],
  },
  {
    owner: "Windows",
    stages: [
      {
        slate: "Capture",
        name: "Windows Graphics Capture",
        note: "The game window's finished frames, handed over by the OS.",
      },
    ],
  },
  {
    owner: "ClypDat",
    stages: [
      { slate: "Scale", name: "GPU downscale", note: "Resized on the GPU before the encoder sees a frame." },
      { slate: "Encode", name: "NVENC · AMF · QSV", note: "Whichever your GPU has. libx264 on the CPU if none." },
      { slate: "Buffer", name: "Last 30 s to 5 min", note: "Oldest frames dropped as new ones arrive." },
      { slate: "Out", name: "MP4 in your library", note: "Written when you press your save key." },
    ],
  },
];

// Real features that sit beside the capture path rather than on it.
const more: { label: string; title: string; body: ReactNode; tag?: string }[] = [
  {
    label: "Full session",
    title: "Record the whole session",
    body: (
      <>
        Start and stop it with its own hotkey. Video and each audio track are
        written as you play, and the replay buffer keeps running alongside.
        Audio resyncs every 60 seconds, so hour six is still in sync, and a
        storage limit deletes the oldest sessions once you pass it.
      </>
    ),
  },
  {
    label: "Detection",
    title: "Game detection",
    body: "The window in front is checked against games you added, ClypDat's own catalogue, and the install manifests Steam, Epic, Battle.net and Riot keep. Every clip is named after the game it came from. Alt-tab out and it holds the last game frame instead of recording your desktop.",
  },
  {
    label: "Auto-clip",
    title: "Auto-clipping",
    tag: "Experimental",
    body: "Saves a clip on its own when something happens in a supported game, read from the game's local event feed or from the captured frames. You choose which events count for each game in Settings.",
  },
  {
    label: "Import",
    title: "Medal and SteelSeries clips",
    body: "Pulls in clips from Medal and SteelSeries Moments using their local catalogues, or their clip folders if a catalogue can't be read. Copy or move them; titles, games and dates come across.",
  },
];

function StageBox({ stage, first }: { stage: Stage; first: boolean }) {
  return (
    <div
      className={`relative flex-1 border bg-panel p-4 ${
        first ? "border-dashed border-rule-strong bg-transparent" : "border-rule"
      }`}
    >
      <p className="slate">{stage.slate}</p>
      <p className="mt-2 font-semibold leading-snug text-paper">{stage.name}</p>
      <p className="mt-1.5 text-sm leading-snug text-dim">{stage.note}</p>
    </div>
  );
}

export default function Features() {
  return (
    <section
      id="features"
      className="section-anchor section-lazy border-t border-rule px-4 py-15 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <Chapter tc="00:00:31:18" label="Capture" />

        <h2 className="display mt-10 max-w-5xl text-balance text-[clamp(2.75rem,8vw,6.5rem)]">
          Nothing runs inside the game.
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-dim">
          ClypDat captures through Windows Graphics Capture, the API Windows
          itself provides for recording a window. It never loads code into the
          game process, which is what anti-cheat looks for.
        </p>

        {/* The chain. Horizontal from lg, a column below it. The frame
            travelling along it is decoration; the boxes carry the content. */}
        <div className="mt-14 lg:mt-20">
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr_4fr] lg:gap-3">
            {groups.map((group, groupIndex) => (
              <div key={group.owner} className="flex flex-col">
                <div className="flex items-center gap-3">
                  <span className={`slate ${groupIndex === 2 ? "text-paper" : "text-dim"}`}>
                    {group.owner}
                  </span>
                  <span aria-hidden className="h-px flex-1 bg-rule" />
                </div>
                <div className="relative mt-3 flex flex-1 flex-col gap-3 lg:flex-row">
                  {group.stages.map((stage) => (
                    <StageBox key={stage.name} stage={stage} first={groupIndex === 0} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* The direction frames travel, game to file, with one moving along it. */}
          <div aria-hidden className="mt-3 hidden items-center gap-3 lg:flex">
            <span className="slate">Frame in</span>
            <div className="relative h-px flex-1 bg-rule-strong [container-type:inline-size]">
              <span
                data-pause-anchor
                className="animate-packet absolute -top-[3px] left-0 h-[7px] w-[7px] bg-paper"
                style={{ "--travel": "calc(100cqw - 7px)" } as CSSProperties}
              />
              <span className="absolute -right-px -top-[4px] h-0 w-0 border-y-[4.5px] border-l-[7px] border-y-transparent border-l-rule-strong" />
            </div>
            <span className="slate">File out</span>
          </div>
        </div>

        <div className="mt-20 sm:mt-28">
          <p className="slate">Other capture features</p>
          <dl className="mt-4 border-t border-rule">
            {more.map((item) => (
              <div
                key={item.label}
                className="grid gap-2 border-b border-rule py-6 sm:grid-cols-[10rem_16rem_minmax(0,1fr)] sm:gap-8"
              >
                <dt className="slate pt-1">{item.label}</dt>
                <dd className="font-semibold text-paper">
                  {item.title}
                  {item.tag ? (
                    <span className="slate ml-2 border border-rule-strong px-1.5 py-0.5 text-[10px] text-dim">
                      {item.tag}
                    </span>
                  ) : null}
                </dd>
                <dd className="max-w-2xl leading-relaxed text-dim">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
