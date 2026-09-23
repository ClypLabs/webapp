import type { CSSProperties } from "react";

// The replay buffer, drawn as what it is: a minute of real frames rolling
// toward NOW, with the oldest ones falling off the far end. The frames are the
// Fortnite clip's own filmstrip from the editor mockup (17 frames, 2244x74).
const STRIP_HEIGHT = 56;
const TILE = (2244 * STRIP_HEIGHT) / 74;

const labels = [
  { at: 0, text: "-1:00" },
  { at: 25, text: "-0:45" },
  { at: 50, text: "-0:30" },
  { at: 75, text: "-0:15" },
];

export default function BufferStrip() {
  return (
    <div aria-hidden>
      <div className="relative h-4">
        {labels.map((label) => (
          <span
            key={label.text}
            className={`slate absolute top-0 ${label.at === 0 ? "" : "-translate-x-1/2"}`}
            style={{ left: `${label.at}%` }}
          >
            {label.text}
          </span>
        ))}
        <span className="slate absolute right-0 top-0 text-rec">Now</span>
      </div>
      <div className="ruler mt-1 h-2.5" />
      <div
        className="relative overflow-hidden border-y border-rule bg-panel"
        style={{ height: STRIP_HEIGHT }}
      >
        <div
          className="animate-roll absolute inset-y-0 left-0 opacity-85"
          style={
            {
              width: `calc(100% + ${TILE}px)`,
              backgroundImage: "url(/media/editor/fortnite/filmstrip.webp)",
              backgroundSize: `${TILE}px 100%`,
              backgroundRepeat: "repeat-x",
              "--tile": `${TILE}px`,
            } as CSSProperties
          }
        />
        {/* The oldest end, about to be dropped. */}
        <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-ink via-ink/70 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-[3px] bg-rec" />
      </div>
    </div>
  );
}
