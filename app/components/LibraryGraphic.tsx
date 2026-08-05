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
// actually belongs to, durations included.

type Clip = {
  game: string;
  date: string;
  age: string;
  thumb: string;
  backend?: string;
  /** Set on the first clip of a day; renders in the header strip above its row. */
  dayLabel?: string;
};

// Flat, in library order. The grid never breaks for a date - the real app puts
// the day label in a strip above the row, in that clip's own column, so the
// cards keep flowing and no cell is ever left empty.
const clips: Clip[] = [
  {
    dayLabel: "Wed, Aug 5",
    game: "Dead by Daylight",
    date: "Aug 5, 2026",
    age: "3 hours ago",
    thumb: "dbd-1",
  },
  {
    game: "Dead by Daylight",
    date: "Aug 5, 2026",
    age: "4 hours ago",
    thumb: "dbd-2",
  },
  {
    dayLabel: "Tue, Aug 4",
    game: "Fortnite",
    date: "Aug 4, 2026",
    age: "16 hours ago",
    thumb: "fortnite-1",
  },
  {
    game: "Fortnite",
    date: "Aug 4, 2026",
    age: "16 hours ago",
    thumb: "fortnite-2",
  },
  {
    game: "Rift of the NecroDancer",
    date: "Aug 4, 2026",
    age: "17 hours ago",
    thumb: "necrodancer",
    backend: "Windows Capture",
  },
  {
    dayLabel: "Mon, Aug 3",
    game: "Fortnite",
    date: "Aug 3, 2026",
    age: "2 days ago",
    thumb: "fortnite-3",
  },
  {
    dayLabel: "Sun, Aug 2",
    game: "Machine Party",
    date: "Aug 2, 2026",
    age: "2 days ago",
    thumb: "machine-1",
  },
  {
    game: "Machine Party",
    date: "Aug 2, 2026",
    age: "2 days ago",
    thumb: "machine-2",
  },
  {
    game: "Machine Party",
    date: "Aug 2, 2026",
    age: "2 days ago",
    thumb: "machine-3",
  },
];

const COLUMNS = 3;

const rows = Array.from(
  { length: Math.ceil(clips.length / COLUMNS) },
  (_, i) => clips.slice(i * COLUMNS, i * COLUMNS + COLUMNS),
);

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 fill-current">
      <path d="M18 16.08a2.9 2.9 0 0 0-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.5.46 1.16.75 1.89.75a2.75 2.75 0 1 0-2.75-2.75c0 .24.04.47.09.7L8.14 10a2.75 2.75 0 1 0 0 4l7.12 4.16c-.05.21-.08.43-.08.65a2.68 2.68 0 1 0 2.68-2.73Z" />
    </svg>
  );
}

function ClipCard({ clip, eager }: { clip: Clip; eager: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
      <div className="relative aspect-video">
        <Image
          src={`/media/thumbs/${clip.thumb}.webp`}
          alt=""
          fill
          sizes="200px"
          // The first row is on screen immediately; the rest sit below the fold
          // of the scroll window and can wait.
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
        />
      </div>
      <div className="flex items-end justify-between gap-2 px-2.5 py-2">
        <div className="min-w-0">
          <p className="truncate text-[9px] text-zinc-500">{clip.game}</p>
          <p className="mt-0.5 truncate text-[11px] font-semibold text-zinc-100">
            Clip from {clip.date}
          </p>
          <p className="mt-1 flex items-center gap-1 truncate text-[8px] text-zinc-600">
            <svg viewBox="0 0 24 24" aria-hidden className="h-2 w-2 fill-current">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 10.6-3.5 2-1-1.7 2.5-1.5V6h2v6.6Z" />
            </svg>
            {clip.age}
            <span className="text-zinc-700">
              Captured with: {clip.backend ?? "ClypDat"}
            </span>
          </p>
        </div>
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-zinc-400">
          <ShareIcon />
        </span>
      </div>
    </div>
  );
}

// `copy` only exists so the duplicated track does not emit duplicate React keys.
function Track({ copy }: { copy: number }) {
  return (
    <>
      {rows.map((row, rowIndex) => (
        <div key={`${copy}-${rowIndex}`}>
          {/* Header strip. Same column template as the cards, so a day label
              sits directly over the clip that starts that day and the cards
              below it stay aligned across the row. */}
          <div className="grid grid-cols-3 gap-2.5">
            {row.map((clip) => (
              <p
                key={`${copy}-h-${clip.thumb}`}
                className="h-4 truncate text-[9px] font-semibold uppercase tracking-widest text-zinc-500"
              >
                {clip.dayLabel ?? " "}
              </p>
            ))}
          </div>
          <div className="mt-1 mb-3 grid grid-cols-3 gap-2.5">
            {row.map((clip) => (
              <ClipCard
                key={`${copy}-${clip.thumb}`}
                clip={clip}
                eager={copy === 0 && rowIndex === 0}
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

          {/* The scroll viewport. Two identical tracks stacked and translated by
              exactly half the height, so the loop has no seam. */}
          <div className="relative h-[300px] overflow-hidden px-3 sm:h-[360px]">
            <div className="animate-library-scroll">
              <Track copy={0} />
              <Track copy={1} />
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
