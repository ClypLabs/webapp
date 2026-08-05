import Reveal, { RevealWords } from "./Reveal";

const steps = [
  {
    step: "01",
    title: "Arm it once",
    body: "Turn the buffer on and forget it. ClypDat holds the last few minutes of gameplay in memory, continuously overwriting the oldest frames.",
  },
  {
    step: "02",
    title: "Play",
    body: "A clutch, a one-in-a-thousand ragdoll, a bug worth reporting. You weren't recording it - and you never have to remember to.",
  },
  {
    step: "03",
    title: "Press the key",
    body: "The clip is already in memory, so saving is instant. It lands on disk named after the game, ready to trim.",
  },
];

export default function HowItWorks() {
  return (
    <section className="relative px-6 py-32 sm:py-40">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal
            as="p"
            className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/70"
          >
            How it works
          </Reveal>
          <h2 className="font-display text-display mt-6 font-semibold text-4xl leading-[1.05] tracking-[-0.02em] text-balance sm:text-6xl">
            <RevealWords text="Recording" />{" "}
            <RevealWords text="after the fact." wordClassName="text-accent" />
          </h2>
          <Reveal
            delay={260}
            as="p"
            className="mx-auto mt-6 max-w-xl text-lg text-zinc-400 text-balance"
          >
            Every other capture tool asks you to decide before the good thing
            happens. A replay buffer doesn&apos;t.
          </Reveal>
        </div>

        <div className="relative mt-20 grid gap-12 md:mt-24 md:grid-cols-3 md:gap-8">
          {/* Hairline connecting the three steps. Decorative, desktop only - on
              stacked mobile there is no line to draw between them. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-10 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block"
          />

          {steps.map((item, index) => (
            <Reveal
              key={item.step}
              delay={index * 130}
              className="group relative text-center"
            >
              <div className="flex h-20 items-center justify-center">
                <span className="relative flex h-20 w-20 items-center justify-center rounded-full border border-white/10 bg-background font-display text-2xl text-emerald-300 transition-colors duration-500 group-hover:border-emerald-400/40">
                  {/* Halo, so the marker sits on the hairline rather than being
                      crossed by it. */}
                  <span
                    aria-hidden
                    className="absolute inset-0 -z-10 rounded-full bg-emerald-500/10 blur-xl transition-opacity duration-500 group-hover:opacity-100 md:opacity-0"
                  />
                  {item.step}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-semibold text-zinc-100">
                {item.title}
              </h3>
              <p className="mx-auto mt-3 max-w-xs text-sm leading-7 text-zinc-400">
                {item.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
