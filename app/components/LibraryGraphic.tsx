import Image from "next/image";

// A designed rendering of the ClypDat library, not a screenshot and not a
// screen recording. Both were tried: a still says nothing about what the
// library is for, and a raw 30fps window capture is visibly choppy next to
// everything else on the page.
//
// This is DOM, so it scrolls on a GPU transform at the display's own refresh
// rate, loops seamlessly, and stays sharp at any resolution.
//
// Layout, labels and clip data come from the real app, and the thumbnails are
// real frames cropped out of a capture of it - each one paired with the clip it
// actually belongs to, durations included. Nothing here describes a clip that
// does not exist.

type Clip = {
  game: string;
  date: string;
  age: string;
  thumb: string;
  backend?: string;
};

const groups: { label: string; clips: Clip[] }[] = [
  {
    label: "Wed, Aug 5",
    clips: [
      { game: "Dead by Daylight", date: "Aug 5, 2026", age: "3 hours ago", thumb: "dbd-1" },
      { game: "Dead by Daylight", date: "Aug 5, 2026", age: "3 hours ago", thumb: "dbd-2" },
    ],
  },
  {
    label: "Tue, Aug 4",
    clips: [
      { game: "Fortnite", date: "Aug 4, 2026", age: "16 hours ago", thumb: "fortnite-1" },
      { game: "Fortnite", date: "Aug 4, 2026", age: "16 hours ago", thumb: "fortnite-2" },
      {
        game: "Rift of the NecroDancer",
        date: "Aug 4, 2026",
        age: "17 hours ago",
        thumb: "necrodancer",
        backend: "Windows Capture",
      },
    ],
  },
  {
    label: "Mon, Aug 3",
    clips: [
      { game: "Fortnite", date: "Aug 3, 2026", age: "1 day ago", thumb: "fortnite-3" },
    ],
  },
  {
    label: "Sun, Aug 2",
    clips: [
      { game: "Machine Party", date: "Aug 2, 2026", age: "2 days ago", thumb: "machine-1" },
      { game: "Machine Party", date: "Aug 2, 2026", age: "2 days ago", thumb: "machine-2" },
      { game: "Machine Party", date: "Aug 2, 2026", age: "2 days ago", thumb: "machine-3" },
    ],
  },
];

function ClipCard({ clip, eager }: { clip: Clip; eager: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06]">
      <div className="relative aspect-video">
        <Image
          src={`/media/thumbs/${clip.thumb}.webp`}
          alt=""
          fill
          sizes="180px"
          // The first row is on screen immediately; the rest are below the fold
          // of the scroll window and can wait.
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
        />
      </div>
      <div className="px-2.5 py-2">
        <p className="truncate text-[9px] text-zinc-500">{clip.game}</p>
        <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-100">
          Clip from {clip.date}
        </p>
        <p className="mt-1 truncate text-[8px] text-zinc-600">
          {clip.age} &middot; Captured with: {clip.backend ?? "ClypDat"}
        </p>
      </div>
    </div>
  );
}

// `copy` exists only so the duplicated track does not emit duplicate React keys.
function Column({ copy }: { copy: number }) {
  return (
    <>
      {groups.map((group, groupIndex) => (
        <div key={`${copy}-${group.label}`} className="mb-4">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-zinc-500">
            {group.label}
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {group.clips.map((clip) => (
              <ClipCard
                key={`${copy}-${clip.thumb}`}
                clip={clip}
                eager={copy === 0 && groupIndex === 0}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export default function LibraryGraphic({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-[#0d1218] ring-1 ring-white/10 ${className}`}
      // Decorative as a whole - the surrounding copy already says what the app
      // does, and reading a rebuilt window out element by element is noise.
      role="img"
      aria-label="The ClypDat library, showing captured clips grouped by day"
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <span className="h-3 w-3 rounded-[4px] bg-emerald-400/80" />
        <span className="ml-1 flex items-center gap-1.5 rounded-md border border-rose-400/40 bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-300">
          <span className="animate-pulse-soft h-1 w-1 rounded-full bg-rose-400" />
          Replay On
        </span>
        <span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-zinc-300">
          Clip
        </span>
        <span className="text-[10px] text-zinc-500">Alt+V</span>
        <span className="text-[10px] text-zinc-600">No game detected</span>
        <span className="ml-auto flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/15" />
          ))}
        </span>
      </div>

      <div className="flex">
        {/* Icon rail */}
        <div className="flex w-9 shrink-0 flex-col items-center gap-3 border-r border-white/[0.06] py-3">
          <span className="h-5 w-5 rounded-md bg-emerald-400/20 ring-1 ring-emerald-400/40" />
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="h-4 w-4 rounded bg-white/[0.07]" />
          ))}
          <span className="mt-auto h-4 w-4 rounded-full bg-white/[0.07]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between px-3 py-2.5">
            <p className="text-[11px] font-semibold text-zinc-200">Clips (57)</p>
            <span className="rounded-md bg-white/[0.04] px-2 py-1 text-[9px] text-zinc-600">
              Search clips or games
            </span>
          </div>

          {/* The scroll viewport. Two identical columns stacked and translated
              by exactly half the track height, so the loop has no seam. */}
          <div className="relative h-[300px] overflow-hidden px-3 sm:h-[360px]">
            <div className="animate-library-scroll">
              <Column copy={0} />
              <Column copy={1} />
            </div>

            {/* Fades the grid out at both edges instead of clipping it mid-card. */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#0d1218] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0d1218] to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
