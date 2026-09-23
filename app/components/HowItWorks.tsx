import { Chapter } from "./Slate";

// One session on one timeline, drawn to scale: the buffer goes on at 21:00:00,
// something happens at 21:03:58, the save key is pressed at 21:04:12, and the minute
// before the key press becomes a file. 252 seconds end to end.
const SESSION = 252;
const pct = (seconds: number) => `${(seconds / SESSION) * 100}%`;

const events = [
  {
    at: 0,
    time: "21:00:00",
    title: "Buffer on",
    body: "Switch on the replay buffer and leave it. ClypDat keeps a rolling minute of gameplay and drops the oldest frames as new ones arrive.",
  },
  {
    at: 238,
    time: "21:03:58",
    title: "Something happens",
    body: "A clutch round, a ragdoll you'll never see again, a bug you want to report. Nobody pressed record.",
  },
  {
    at: 252,
    time: "21:04:12",
    title: "Press your save key",
    body: "The minute before the key press is already recorded, so it saves straight away.",
  },
];

// Clock labels along the ruler, one a minute.
const clock = [0, 60, 120, 180, 240].map((seconds) => ({
  at: seconds,
  text: `21:0${seconds / 60}:00`,
}));

export default function HowItWorks() {
  return (
    <section id="how" className="section-anchor px-4 py-15 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <Chapter tc="00:00:12:04" label="How it works" />

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end lg:gap-16">
          <h2 className="display text-balance text-[clamp(2.75rem,8vw,6.5rem)]">
            How the replay
            <br />
            buffer works
          </h2>
          <p className="text-lg leading-relaxed text-dim">
            Normal recording needs you to press record before the moment. A
            replay buffer is already rolling, so the moment is on disk as soon
            as you ask for it.
          </p>
        </div>

        {/* The timeline. Decorative: the three blocks under it say the same
            thing in words. */}
        <div aria-hidden className="mt-14 sm:mt-20">
          <div className="relative hidden h-4 sm:block">
            {clock.map((label) => (
              <span
                key={label.text}
                className={`slate absolute top-0 ${label.at === 0 ? "" : "-translate-x-1/2"}`}
                style={{ left: pct(label.at) }}
              >
                {label.text}
              </span>
            ))}
          </div>
          <div className="relative mt-2">
            {/* Session track */}
            <div className="relative h-12 border border-rule bg-panel">
              {/* The saved minute: the last 60 seconds before the key press. */}
              <div
                className="absolute inset-y-0 border-l border-saved/60 bg-saved/[0.12]"
                style={{ left: pct(192), right: 0 }}
              >
                <span className="slate absolute left-2 top-1/2 hidden -translate-y-1/2 text-saved sm:block">
                  Saved
                </span>
              </div>
              {events.map((event, index) => (
                <span
                  key={event.time}
                  className={`absolute -inset-y-2 w-px ${index === 2 ? "bg-rec" : "bg-paper/70"}`}
                  style={{ left: `calc(${pct(event.at)} - ${event.at === SESSION ? 1 : 0}px)` }}
                />
              ))}
            </div>
            {/* Marker flags, numbered to match the blocks below. */}
            <div className="relative mt-3 h-5">
              {events.map((event, index) => (
                <span
                  key={event.time}
                  className={`slate absolute top-0 ${
                    event.at === 0 ? "" : event.at === SESSION ? "-translate-x-full" : "-translate-x-[130%]"
                  } ${index === 2 ? "text-rec" : "text-paper"}`}
                  style={{ left: pct(event.at) }}
                >
                  {index + 1}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-4 flex items-center justify-end gap-2 font-mono text-xs text-saved">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="square">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            <span className="truncate">Fortnite - Sep-11-2026 - 21-04-12.mp4</span>
          </p>
        </div>

        <ol className="mt-12 grid gap-8 border-t border-rule pt-8 sm:grid-cols-3 sm:gap-10">
          {events.map((event, index) => (
            <li key={event.time}>
              <p className={`slate ${index === 2 ? "text-rec" : "text-dim"}`}>
                {index + 1} &middot; {event.time}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-paper">
                {event.title}
              </h3>
              <p className="mt-2 leading-relaxed text-dim">{event.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
