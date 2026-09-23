import Image from "next/image";

import { Glyph, RailFooter, TitleBar, paths } from "./AppChrome";
import RailIcon from "./RailIcon";

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

// Nine clips divides evenly by the three columns, so no row is ever left
// part-empty.

// One clip tile, as the app's template draws it: the thumbnail on its own
// ground, then a meta band with game, title, age and capture backend beside a
// square share button. Colours are the default theme's own ramp keys.
function ClipCard({ clip, eager }: { clip: Clip; eager: boolean }) {
  return (
    <div className="overflow-hidden rounded-xl bg-[#24303A]">
      {/* The crop is 614x331, not 16:9. Forcing it into aspect-video made
          object-cover shave the sides, which cut into the duration badge baked
          into the top-right of every frame. */}
      <div className="relative aspect-[614/331] bg-[#16202A]">
        <Image
          src={`/media/thumbs/${clip.thumb}.webp`}
          alt=""
          fill
          sizes="380px"
          // Already WebP at exactly the size they are shown at; the optimizer
          // would only re-encode them softer.
          unoptimized
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
        />
      </div>
      {/* Same numbers as the app's template: a 16x13 margin, 6px between
          the three lines, and an 8px run between clock, age and backend with
          everything on the row centred on one line. */}
      <div className="flex items-center justify-between gap-2 bg-[#1E2A35] px-4 py-[13px] leading-[1.2]">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="truncate text-[12px] font-bold text-[#8C98A7]">{clip.game}</p>
          <p className="truncate text-[15px] font-bold text-[#EDF4FB]">Clip from {clip.date}</p>
          <p className="flex min-w-0 items-center gap-2">
            <Glyph d={paths.clock} className="h-3 w-3 shrink-0 fill-[#8C98A7]" />
            <span className="shrink-0 text-[12px] font-semibold text-[#8C98A7]">{clip.age}</span>
            <span className="truncate text-[11px] text-[#5C6D7E]">
              Captured with: ClypDat
            </span>
          </p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#2A3844] text-[#C8D9E9]">
          <Glyph d={paths.share} className="h-[17px] w-[17px] fill-current" />
        </span>
      </div>
    </div>
  );
}

// `copy` only exists so the duplicated track does not emit duplicate React keys.
function Track({ copy }: { copy: number }) {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-3 pb-3">
      {clips.map((clip, index) => (
        <div key={`${copy}-${clip.thumb}`}>
          {/* Every cell reserves the day label's height whether or not it
              has one, which is what keeps the rows aligned: the app puts the
              label over the clip that starts the day, not across the row. */}
          <p className="mb-2 h-4 truncate text-[11px] font-bold uppercase tracking-wide text-[#9FB2C6]">
            {clip.dayLabel ?? " "}
          </p>
          <ClipCard clip={clip} eager={copy === 0 && index < 3} />
        </div>
      ))}
    </div>
  );
}

// The rail's library filters, in the app's order: all clips (lit), edited,
// auto-clips, full sessions, imports.
const filters = ["pencil", "bolt", "clapper", "download"] as const;

export default function LibraryGraphic({ className = "" }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-[#0D1116] font-app ring-1 ring-white/10 ${className}`}
      // Decorative as a whole - the surrounding copy already says what the app
      // does, and reading a rebuilt window out element by element is noise.
      role="img"
      aria-label="The ClypDat library, showing captured clips grouped by day"
    >
      <TitleBar refresh>No game detected</TitleBar>

      <div className="flex">
        <div className="flex w-14 shrink-0 flex-col border-r border-[#1E2A33] bg-[#0D1116]">
          <div className="flex flex-1 flex-col items-center gap-1.5 pt-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#2A3350] text-[#A8B4F5]">
              <RailIcon name="grid" />
            </span>
            {filters.map((name) => (
              <span key={name} className="flex h-9 w-9 items-center justify-center text-[#8C98A7]">
                <RailIcon name={name} />
              </span>
            ))}

            <span className="my-1.5 h-px w-7 bg-[#1E2A33]" />

            {/* Per-game shelves, from the app's own game-icon cache. */}
            <div className="flex flex-col items-center gap-2.5">
              {games.map((game) => (
                <Image
                  key={game.file}
                  src={`/media/games/${game.file}.png`}
                  alt=""
                  width={30}
                  height={30}
                  unoptimized
                  className="h-[30px] w-[30px] rounded-lg object-cover"
                />
              ))}
            </div>
          </div>
          <RailFooter />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between border-b border-[#1E2A33] px-5 py-2.5">
            <p className="text-[14px] font-bold text-[#EDF4FB]">Clips (57)</p>
            <span className="flex h-8 w-56 items-center gap-2 rounded-lg border border-[#232F3A] bg-[#141D24] px-2.5 text-[12px] text-[#6B7C8C]">
              <Glyph d={paths.search} className="h-4 w-4 shrink-0 fill-current" />
              Search Clips or Games
            </span>
          </div>

          {/* The scroll viewport. Two identical tracks stacked and translated by
              exactly half the height, so the loop has no seam. The fades sit
              outside the scrolling box so the top one reaches over the edge
              where the header meets it. */}
          <div className="relative px-5 pt-3">
            <div className="relative h-[574px] overflow-hidden">
              <div className="animate-library-scroll">
                <Track copy={0} />
                <Track copy={1} />
              </div>
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-[#0D1116] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0D1116] to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
