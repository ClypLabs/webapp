import Image from "next/image";

// The editor, drawn the same way as the library graphic: real layout, real
// labels, one real frame - and everything that moves drawn in DOM so it is
// sharp at any size and animates on the compositor.
//
// The preview still and the timeline filmstrip are cropped straight out of the
// app. The waveforms are drawn rather than cropped, because a still waveform in
// a section about editing audio is a picture of nothing happening.

// Deterministic pseudo-waveform. A real one would need the clip's audio, and an
// obviously synthetic zig-zag would look fake - this is dense and irregular
// enough to read as a waveform at this size without pretending to be a specific
// recording.
function bars(seed: number, count: number) {
  const out: number[] = [];
  let value = seed;
  for (let i = 0; i < count; i++) {
    value = (value * 1103515245 + 12345) % 2147483648;
    const base = (value / 2147483648) * 0.7 + 0.15;
    // A slow envelope on top, so the track has loud and quiet passages rather
    // than uniform noise.
    const envelope = 0.55 + 0.45 * Math.sin((i / count) * Math.PI * 3 + seed);
    out.push(Math.min(1, base * envelope + 0.12));
  }
  return out;
}

const tracks = [
  { label: "Game Audio", colour: "bg-teal-400/70", seed: 7, volume: 0.72 },
  { label: "Chat Audio", colour: "bg-sky-400/70", seed: 19, volume: 0.6 },
  { label: "Microphone", colour: "bg-amber-400/70", seed: 33, volume: 0.66 },
];

const BAR_COUNT = 96;

function Waveform({
  colour,
  seed,
  className = "",
}: {
  colour: string;
  seed: number;
  className?: string;
}) {
  return (
    <div className={`flex h-full items-center gap-[2px] px-1 ${className}`}>
      {bars(seed, BAR_COUNT).map((height, i) => (
        <span
          key={i}
          className={`flex-1 rounded-[1px] ${colour}`}
          style={{ height: `${Math.round(height * 100)}%` }}
        />
      ))}
    </div>
  );
}

function TimeRuler() {
  return (
    <div className="flex items-end justify-between px-1 pb-1 text-[9px] text-zinc-600">
      {["0:00", "0:10", "0:20", "0:30", "0:40", "0:50", "1:00"].map((t) => (
        <span key={t}>{t}</span>
      ))}
    </div>
  );
}

export default function EditorGraphic({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#0d1218] ring-1 ring-white/10 ${className}`}
      role="img"
      aria-label="The ClypDat editor, trimming a clip with separate game, chat and microphone audio tracks"
    >
      {/* Title bar */}
      <div className="flex items-stretch border-b border-white/[0.06]">
        <div className="flex w-12 shrink-0 items-center justify-center">
          <Image src="/icon.png" alt="" width={20} height={20} unoptimized />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5">
          <span className="flex items-center gap-1.5 rounded-md border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-[12px] font-semibold text-rose-300">
            <span className="animate-pulse-soft h-1.5 w-1.5 rounded-full bg-rose-400" />
            Replay On
          </span>
          <span className="rounded-md border border-white/10 px-2.5 py-1 text-[12px] text-zinc-300">
            Clip
          </span>
          {/* The metadata strip the app shows for the open clip. */}
          <span className="truncate text-[11px] text-zinc-600">
            1080p@60 &middot; 222.6 MB &middot; Captured with: ClypDat
          </span>
          <span className="ml-auto flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-white/15" />
            ))}
          </span>
        </div>
      </div>

      <div className="flex">
        {/* Icon rail, matching the library window. */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-white/[0.06] bg-black/20 py-3">
          <span className="h-7 w-7 rounded-lg bg-white/[0.05]" />
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 ring-1 ring-sky-400/40">
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-sky-300">
              <path d="M4 17.2V20h2.8L16 10.8 13.2 8 4 17.2ZM19.6 8.6a1 1 0 0 0 0-1.4l-1.8-1.8a1 1 0 0 0-1.4 0L15 6.8 17.2 9l1.4-1.4Z" />
            </svg>
          </span>
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-5 w-5 rounded-md bg-white/[0.07]" />
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-stretch">
            {/* Preview */}
            <div className="flex min-w-0 flex-1 flex-col p-3">
              <div className="relative h-[330px] flex-1 overflow-hidden rounded-lg bg-black">
                <Image
                  src="/media/editor/preview.webp"
                  alt=""
                  fill
                  sizes="760px"
                  unoptimized
                  className="object-cover"
                />
              </div>

              {/* Transport */}
              <div className="mt-2.5 flex items-center gap-3 px-1">
                <span className="font-mono text-[11px] text-zinc-400">
                  0:05 <span className="text-zinc-600">/ 1:00</span>
                </span>
                <div className="h-1 w-24 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-3/4 rounded-full bg-zinc-400" />
                </div>
                <div className="mx-auto flex items-center gap-3 text-zinc-400">
                  {["M18 6v12L9 12l9-6Z", "M8 5v14l11-7L8 5Z", "M6 6v12l9-6-9-6Z"].map(
                    (d, i) => (
                      <svg
                        key={i}
                        viewBox="0 0 24 24"
                        aria-hidden
                        className={`fill-current ${i === 1 ? "h-4 w-4 text-zinc-100" : "h-3 w-3"}`}
                      >
                        <path d={d} />
                      </svg>
                    ),
                  )}
                </div>
                <span className="font-mono text-[11px] text-zinc-600">100%</span>
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
                <p className="mt-1.5 truncate rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-zinc-200">
                  Fortnite - Aug-04-2026
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

            <div className="space-y-1.5">
              {/* Video track: the app's own filmstrip. */}
              <div className="flex items-stretch gap-2">
                <div className="flex w-[92px] shrink-0 items-center rounded-md border border-white/[0.06] bg-white/[0.02] px-2 text-[10px] text-zinc-400">
                  Video
                </div>
                <div className="relative h-9 min-w-0 flex-1 overflow-hidden rounded-md">
                  <Image
                    src="/media/editor/filmstrip.webp"
                    alt=""
                    fill
                    sizes="640px"
                    unoptimized
                    className="object-cover"
                  />
                </div>
              </div>

              {tracks.map((track) => (
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
                    <Waveform colour={track.colour} seed={track.seed} />
                  </div>
                </div>
              ))}
            </div>

            {/* Playhead. Sweeps the full width of the tracks, which is the one
                thing in this panel that is genuinely in motion. */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-2 left-[116px] right-3 overflow-hidden"
            >
              <div className="animate-playhead relative h-full w-px bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                <span className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
