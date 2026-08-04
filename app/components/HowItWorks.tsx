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
    <section className="relative border-t border-white/10 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Recording after the fact.
          </h2>
          <p className="mt-4 text-zinc-400 text-balance">
            Every other capture tool asks you to decide before the good thing
            happens. A replay buffer doesn&apos;t.
          </p>
        </div>

        <div className="relative mt-16 grid gap-6 md:grid-cols-3">
          {/* Hairline connecting the three steps. Decorative, desktop only -
              on stacked mobile there is no line to draw between them. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-9 hidden h-px bg-gradient-to-r from-transparent via-white/15 to-transparent md:block"
          />

          {steps.map((item) => (
            <div key={item.step} className="relative">
              <div className="flex h-[72px] items-center justify-center">
                <span className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/10 bg-background text-lg font-semibold text-emerald-300">
                  {item.step}
                </span>
              </div>
              <div className="mt-5 text-center">
                <h3 className="text-base font-semibold text-zinc-100">
                  {item.title}
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-zinc-400">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
