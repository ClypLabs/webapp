import Reveal, { RevealWords } from "./Reveal";

const GITHUB_URL = "https://github.com/ClypLabs/ClypDat";
const RELEASES_URL = `${GITHUB_URL}/releases/latest`;

const downloads = [
  {
    label: "Installer",
    file: "ClypDat-Setup.exe",
    description: "Recommended. Installs to your user folder, no admin needed.",
  },
  {
    label: "Portable",
    file: "ClypDat-Portable.exe",
    description: "Self-extracting, no install step.",
  },
  {
    label: "Zip",
    file: "ClypDat-win-x64.zip",
    description: "Raw build folder.",
  },
  {
    label: "MSI",
    file: "ClypDat.msi",
    description: "For managed/enterprise deployment.",
  },
];

export default function Download() {
  return (
    <section
      id="download"
      className="section-anchor section-lazy relative overflow-hidden px-6 py-32 text-center sm:py-40"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-40 -z-10 flex justify-center"
      >
        <div className="animate-drift-a h-[640px] w-[880px] bg-[radial-gradient(closest-side,rgba(16,185,129,0.18),transparent)]" />
      </div>

      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-display font-semibold text-4xl leading-[1.05] tracking-[-0.02em] text-balance sm:text-6xl">
          <RevealWords text="Get" />{" "}
          <RevealWords text="ClypDat." wordClassName="text-accent" />
        </h2>
        <Reveal
          delay={220}
          as="p"
          className="mx-auto mt-6 max-w-xl text-lg text-zinc-400 text-balance"
        >
          Windows 10 or 11, x64. The native capture backend works on NVIDIA,
          AMD, and as a software fallback, any GPU-less machine.
        </Reveal>

        <div className="mt-14 grid gap-3 text-left sm:grid-cols-2">
          {downloads.map((item, index) => (
            <Reveal key={item.file} delay={index * 90}>
              <a
                href={`/download/${item.file}`}
                className="group flex h-full flex-col items-start rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:bg-white/[0.05] motion-reduce:hover:translate-y-0"
              >
                <span className="flex w-full items-center justify-between text-sm font-semibold text-zinc-100 transition-colors group-hover:text-emerald-300">
                  {item.label}
                  <span
                    aria-hidden
                    className="text-zinc-600 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-emerald-300"
                  >
                    &darr;
                  </span>
                </span>
                <span className="mt-1.5 text-xs leading-5 text-zinc-500">
                  {item.description}
                </span>
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal delay={420}>
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-block text-sm text-zinc-500 underline decoration-white/20 underline-offset-4 transition-colors hover:text-zinc-300"
          >
            All releases on GitHub
          </a>
        </Reveal>
      </div>
    </section>
  );
}
