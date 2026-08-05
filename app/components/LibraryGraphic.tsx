// A designed rendering of the ClypDat library, not a screenshot and not a
// screen recording. Both were tried: a still says nothing about what the
// library is for, and a raw 30fps window capture is visibly choppy next to
// everything else on the page.
//
// This is DOM, so it scrolls on a GPU transform at the display's own refresh
// rate, loops seamlessly, stays sharp at any resolution, and costs no bandwidth.
//
// Layout, labels and clip data come from the real app. Thumbnails are
// deliberately abstract - a fake game frame would be prettier and would be
// pretending to be a screenshot.

type Clip = {
  game: string;
  date: string;
  age: string;
  duration: string;
  backend?: string;
  edited?: boolean;
};

// Each game gets a stable gradient so the grid reads as a set of distinct
// captures rather than one tile repeated.
const gameTint: Record<string, string> = {
  "Dead by Daylight": "from-rose-500/30 via-zinc-700/40 to-zinc-900",
  Fortnite: "from-sky-400/30 via-indigo-500/25 to-zinc-900",
  "Rift of the NecroDancer": "from-fuchsia-500/30 via-purple-600/25 to-zinc-900",
  "Machine Party": "from-emerald-400/25 via-teal-600/20 to-zinc-900",
  "Honkai: Star Rail": "from-amber-400/25 via-orange-600/20 to-zinc-900",
  "Tom Clancy's Rainbow Six Siege": "from-cyan-400/25 via-slate-600/25 to-zinc-900",
};

const groups: { label: string; clips: Clip[] }[] = [
  {
    label: "Wed, Aug 5",
    clips: [
      { game: "Dead by Daylight", date: "Aug 5, 2026", age: "3 hours ago", duration: "1:01" },
      { game: "Dead by Daylight", date: "Aug 5, 2026", age: "3 hours ago", duration: "1:00" },
      { game: "Fortnite", date: "Aug 4, 2026", age: "16 hours ago", duration: "0:41" },
    ],
  },
  {
    label: "Mon, Aug 3",
    clips: [
      { game: "Fortnite", date: "Aug 4, 2026", age: "16 hours ago", duration: "1:00" },
      {
        game: "Rift of the NecroDancer",
        date: "Aug 4, 2026",
        age: "17 hours ago",
        duration: "0:59",
        backend: "Windows Capture",
      },
      { game: "Fortnite", date: "Aug 3, 2026", age: "1 day ago", duration: "0:14", edited: true },
    ],
  },
  {
    label: "Sun, Aug 2",
    clips: [
      { game: "Machine Party", date: "Aug 2, 2026", age: "2 days ago", duration: "0:21" },
      { game: "Machine Party", date: "Aug 2, 2026", age: "2 days ago", duration: "0:15" },
      { game: "Machine Party", date: "Aug 2, 2026", age: "2 days ago", duration: "0:16" },
    ],
  },
  {
    label: "Tue, Jul 29",
    clips: [
      { game: "Honkai: Star Rail", date: "Jul 29, 2026", age: "6 days ago", duration: "0:12", edited: true },
      {
        game: "Tom Clancy's Rainbow Six Siege",
        date: "Jul 29, 2026",
        age: "6 days ago",
        duration: "1:01",
      },
      {
        game: "Tom Clancy's Rainbow Six Siege",
        date: "Jul 29, 2026",
        age: "6 days ago",
        duration: "1:01",
      },
    ],
  },
];

function ClipCard({ clip }: { clip: Clip }) {
  const tint = gameTint[clip.game] ?? "from-zinc-600/30 via-zinc-700/30 to-zinc-900";

  return (
    <div className="overflow-hidden rounded-lg bg-white/[0.03] ring-1 ring-white/[0.06]">
      <div className={`relative aspect-video bg-gradient-to-br ${tint}`}>
        {/* Suggests a HUD without drawing one. */}
        <div className="absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-black/40 to-transparent" />
        <div className="absolute left-1.5 top-1.5 flex gap-0.5">
          {[6, 9, 5].map((w, i) => (
            <span key={i} className="h-0.5 rounded-full bg-white/25" style={{ width: w }} />
          ))}
        </div>
        <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white/90 backdrop-blur-sm">
          {clip.edited ? <span className="text-emerald-300">&#9998;</span> : null}
          {clip.duration}
        </span>
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

function Column() {
  return (
    <>
      {groups.map((group) => (
        <div key={group.label} className="mb-4">
          <p className="mb-2 text-[9px] font-semibold uppercase tracking-widest text-zinc-500">
            {group.label}
          </p>
          <div className="grid grid-cols-3 gap-2.5">
            {group.clips.map((clip, index) => (
              <ClipCard key={`${group.label}-${index}`} clip={clip} />
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
      // The whole thing is decorative - the surrounding copy already says what
      // the app does, and reading a fake window to a screen reader is noise.
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
          {["bg-white/15", "bg-white/15", "bg-white/15"].map((c, i) => (
            <span key={i} className={`h-1.5 w-1.5 rounded-full ${c}`} />
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
              <Column />
              <Column />
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
