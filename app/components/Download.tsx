import Reveal, { RevealWords } from "./Reveal";
import CopyCommand from "./CopyCommand";
import { RELEASES_URL, WINGET_ID } from "./links";

const downloads = [
  {
    label: "Installer",
    file: "ClypDat-Setup.exe",
    description: "Installs to your user folder, no admin needed. Updates itself.",
    recommended: true,
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
      className="section-anchor section-lazy relative overflow-hidden px-6 py-24 text-center sm:py-32"
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
          Windows 10 or 11, x64. Encodes on NVIDIA, AMD or Intel GPUs, with a
          software encoder for machines that have none of the three.
        </Reveal>

        <div className="mt-14 grid gap-3 text-left sm:grid-cols-2">
          {downloads.map((item, index) => (
            <Reveal key={item.file} delay={index * 90}>
              <a
                href={`/download/${item.file}`}
                className={`group relative flex h-full flex-col items-start rounded-xl border px-5 py-4 transition-all duration-300 hover:-translate-y-0.5 motion-reduce:hover:translate-y-0 ${
                  item.recommended
                    ? "border-emerald-400/30 bg-emerald-400/[0.06] hover:border-emerald-400/60 hover:bg-emerald-400/[0.09]"
                    : "border-white/10 bg-white/[0.03] hover:border-emerald-400/40 hover:bg-white/[0.05]"
                }`}
              >
                <span className="flex w-full items-center justify-between gap-3 text-sm font-semibold text-zinc-100 transition-colors group-hover:text-emerald-300">
                  <span className="flex items-center gap-2">
                    {item.label}
                    {item.recommended ? (
                      <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                        Recommended
                      </span>
                    ) : null}
                  </span>
                  <span
                    aria-hidden
                    className="text-zinc-600 transition-transform duration-300 group-hover:translate-y-0.5 group-hover:text-emerald-300"
                  >
                    &darr;
                  </span>
                </span>
                <span className="mt-1.5 text-xs leading-5 text-zinc-500">
                  {item.description}
                </span>
                <span className="mt-3 font-mono text-[11px] text-zinc-600">
                  {item.file}
                </span>
              </a>
            </Reveal>
          ))}
        </div>

        <Reveal delay={420} className="mt-10">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
            Or install with WinGet
          </p>
          <div className="mx-auto mt-3 max-w-md">
            <CopyCommand command={`winget install --id ${WINGET_ID}`} />
          </div>
        </Reveal>

        <Reveal delay={480}>
          <a
            href={RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-block text-sm text-zinc-500 underline decoration-white/20 underline-offset-4 transition-colors hover:text-zinc-300"
          >
            Release notes and older versions on GitHub
          </a>
        </Reveal>
      </div>
    </section>
  );
}
