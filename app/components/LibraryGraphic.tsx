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

// Flat, newest day first, the order the app lists them in. The grid never
// breaks for a date: the day label sits above the clip that starts that day, in
// its own column, and the cards keep flowing with no cell left empty.
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
    dayLabel: "Wed, Jul 29",
    game: "Fortnite",
    date: "Jul 29, 2026",
    age: "6 days ago",
    thumb: "fortnite-4",
  },
  {
    game: "Honkai: Star Rail",
    date: "Jul 29, 2026",
    age: "6 days ago",
    thumb: "honkai",
  },
  {
    game: "Tom Clancy's Rainbow Six Siege",
    date: "Jul 29, 2026",
    age: "6 days ago",
    thumb: "r6-siege",
  },
];

// The rail groups clips by game. Icons come from ClypDat's own game-icon cache,
// so they are the same art the app shows rather than anything sourced elsewhere.
const games = [
  { file: "fortnite", name: "Fortnite" },
  { file: "dead-by-daylight", name: "Dead by Daylight" },
  { file: "cs2", name: "Counter-Strike 2" },
  { file: "rainbow-six-siege", name: "Tom Clancy's Rainbow Six Siege" },
  { file: "necrodancer", name: "Rift of the NecroDancer" },
  { file: "honkai", name: "Honkai: Star Rail" },
];

// Nine clips divides evenly by both column counts used below (1 on mobile,
// 3 from sm up), so no row is ever left part-empty at either size.

// The rail's tool glyphs, traced to match the app's own sidebar.
function RailIcon({
  name,
}: {
  name:
    | "grid"
    | "pencil"
    | "bolt"
    | "clapper"
    | "download"
    | "back"
    | "forward"
    | "refresh"
    | "gear";
}) {
  const paths: Record<string, React.ReactNode> = {
    grid: [0, 1, 2].map((row) =>
      [0, 1, 2].map((col) => (
        <rect
          key={`${row}-${col}`}
          x={5 + col * 5}
          y={5 + row * 5}
          width="3"
          height="3"
          rx="1"
        />
      )),
    ),
    pencil: <path d="M4 17.2V20h2.8L16 10.8 13.2 8 4 17.2ZM19.6 8.6a1 1 0 0 0 0-1.4l-1.8-1.8a1 1 0 0 0-1.4 0L15 6.8 17.2 9l1.4-1.4Z" />,
    bolt: <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />,
    clapper: <path d="M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8Zm.4-3.6 17 2.2-.3 1.4-17-2.2.3-1.4ZM7 8.6l1.6-2.2M12 9l1.6-2.2M17 9.4l1.6-2.2" />,
    download: <path d="M12 3v10.2l3.6-3.6 1.4 1.4L12 16 7 11l1.4-1.4 3.6 3.6V3h-1Zm-7 16h14v2H5v-2Z" />,
    back: <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    forward: <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    refresh: <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    gear: <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 4a9 9 0 0 0-.2-1.7l2-1.5-2-3.4-2.3 1a9 9 0 0 0-3-1.7L15 2H9l-.5 2.7a9 9 0 0 0-3 1.7l-2.3-1-2 3.4 2 1.5a9 9 0 0 0 0 3.4l-2 1.5 2 3.4 2.3-1a9 9 0 0 0 3 1.7L9 22h6l.5-2.7a9 9 0 0 0 3-1.7l2.3 1 2-3.4-2-1.5c.13-.55.2-1.12.2-1.7Z" />,
  };

  const stroked = name === "clapper";
  const selfStroked = name === "back" || name === "forward" || name === "refresh";

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill={stroked || selfStroked ? "none" : "currentColor"}
      stroke={stroked ? "currentColor" : undefined}
      strokeWidth={stroked ? 1.6 : undefined}
      strokeLinecap="round"
    >
      {paths[name]}
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 fill-current">
      <path d="M18 16.08a2.9 2.9 0 0 0-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.5.46 1.16.75 1.89.75a2.75 2.75 0 1 0-2.75-2.75c0 .24.04.47.09.7L8.14 10a2.75 2.75 0 1 0 0 4l7.12 4.16c-.05.21-.08.43-.08.65a2.68 2.68 0 1 0 2.68-2.73Z" />
    </svg>
  );
}

function ClipCard({ clip, eager }: { clip: Clip; eager: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl bg-[#1b222c] ring-1 ring-white/[0.04]">
      {/* The crop is 614x331, not 16:9. Forcing it into aspect-video made
          object-cover shave the sides, which cut into the duration badge baked
          into the top-right of every frame. */}
      <div className="relative aspect-[614/331]">
        <Image
          src={`/media/thumbs/${clip.thumb}.webp`}
          alt=""
          fill
          // One card fills most of a phone; three share the width from sm up.
          sizes="380px"
          // These are already WebP at exactly the size they are shown at.
          // Letting the optimizer touch them re-encodes an encoded image at
          // q75 - visibly soft - and generates upscaled 1080w/3840w variants
          // that carry no extra detail, because the source has none to give.
          unoptimized
          // The first row is on screen immediately; the rest sit below the fold
          // of the scroll window and can wait.
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
        />
      </div>
      {/* The app sets the meta block on its own lighter panel rather than
          letting it sit on the card background. */}
      <div className="flex items-center justify-between gap-2 bg-[#232b37] px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[11px] text-zinc-400">{clip.game}</p>
          <p className="mt-0.5 truncate text-[14px] font-semibold text-zinc-50">
            Clip from {clip.date}
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 truncate text-[11px] text-zinc-400">
            <svg viewBox="0 0 24 24" aria-hidden className="h-3 w-3 shrink-0 fill-current">
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 10.6-3.5 2-1-1.7 2.5-1.5V6h2v6.6Z" />
            </svg>
            {clip.age}
            <span className="text-zinc-500">
              Captured with: {clip.backend ?? "ClypDat"}
            </span>
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] text-zinc-200">
          <ShareIcon />
        </span>
      </div>
    </div>
  );
}

// `copy` only exists so the duplicated track does not emit duplicate React keys.
function Track({ copy }: { copy: number }) {
  return (
    <div className="grid grid-cols-3 gap-x-3.5 gap-y-4 pb-4">
      {clips.map((clip, index) => (
        <div key={`${copy}-${clip.thumb}`}>
          {/* Every cell reserves the same label height whether or not it has a
              label. That is what keeps rows aligned, and it does so at any
              column count - the previous full-width header strip had to assume
              three columns, which is exactly what broke on a phone. */}
          {/* The reserved height keeps rows aligned across columns, but in one
              column there is nothing to align to, so an empty label is just a
              gap. Collapse it on mobile, keep it from sm up. */}
          <p
            className="mb-1.5 h-5 truncate text-[11px] font-semibold uppercase tracking-widest text-zinc-500"
          >
            {clip.dayLabel ?? " "}
          </p>
          <ClipCard clip={clip} eager={copy === 0 && index < 3} />
        </div>
      ))}
    </div>
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
      {/* Title bar. The mark sits in a cell exactly as wide as the rail below
          it, so it lines up with the column of rail buttons - but it keeps the
          title bar's own background: the darker rail column starts below. */}
      <div className="flex items-stretch border-b border-white/[0.06]">
        <div className="flex w-12 shrink-0 items-center justify-center">
          <Image src="/icon.png" alt="" width={20} height={20} unoptimized />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2.5">
          <span className="flex items-center gap-1.5 text-zinc-500">
            <RailIcon name="back" />
            <RailIcon name="forward" />
            <RailIcon name="refresh" />
          </span>
          <span className="flex items-center gap-1.5 rounded-md border border-rose-400/40 bg-rose-500/10 px-2.5 py-1 text-[12px] font-semibold text-rose-300">
            <span className="animate-pulse-soft h-1.5 w-1.5 rounded-full bg-rose-400" />
            Replay On
          </span>
          <span className="rounded-md border border-white/10 px-2.5 py-1 text-[12px] text-zinc-300">
            Clip
          </span>
          <span className="text-[12px] text-zinc-500">Alt+V</span>
          <span className="text-[12px] text-zinc-600">No game detected</span>
          <span className="ml-auto flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-2 w-2 rounded-full bg-white/15" />
            ))}
          </span>
        </div>
      </div>

      <div className="flex">
        {/* Icon rail */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-3 border-r border-white/[0.06] bg-black/20 py-3">
          {/* All clips, selected - the one lit tile in the rail. */}
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-300 ring-1 ring-sky-400/40">
            <RailIcon name="grid" />
          </span>
          {(["pencil", "bolt", "clapper", "download"] as const).map((name) => (
            <span key={name} className="text-zinc-500">
              <RailIcon name={name} />
            </span>
          ))}

          <span className="h-px w-5 bg-white/10" />

          {/* Per-game shelves. These are the icons ClypDat itself caches for
              each detected game, at the size it stores them. */}
          {games.map((game) => (
            <Image
              key={game.file}
              src={`/media/games/${game.file}.png`}
              alt=""
              width={28}
              height={28}
              unoptimized
              className="h-7 w-7 rounded-lg object-cover"
            />
          ))}


          <span className="mt-auto text-zinc-600">
            <RailIcon name="gear" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between px-4 py-3.5">
            <p className="text-[14px] font-semibold text-zinc-200">Clips (57)</p>
            <span className="rounded-md bg-white/[0.04] px-3 py-1.5 text-[11px] text-zinc-600">
              Search clips or games
            </span>
          </div>

          {/* The scroll viewport. Two identical tracks stacked and translated by
              exactly half the height, so the loop has no seam. */}
          {/* The fades sit outside the scrolling box. Inside it they were
              clipped by its own overflow, so the top one could never reach up
              over the boundary with the header - which is exactly where the
              hairline of un-faded card edge was showing. */}
          <div className="relative px-4">
            <div className="relative h-[560px] overflow-hidden">
              <div className="animate-library-scroll">
                <Track copy={0} />
                <Track copy={1} />
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 -top-2 h-8 bg-gradient-to-b from-[#0d1218] via-[#0d1218] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0d1218] to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
