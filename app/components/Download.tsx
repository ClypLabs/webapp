import CopyCommand from "./CopyCommand";
import { Chapter } from "./Slate";
import { RELEASES_URL, WINGET_ID } from "./links";

// The release assets, listed the way a release page lists them: file first.
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
    description: "The raw build folder.",
  },
  {
    label: "MSI",
    file: "ClypDat.msi",
    description: "For managed or enterprise deployment.",
  },
];

export default function Download() {
  return (
    <section
      id="download"
      className="section-anchor section-lazy border-t border-rule px-4 py-15 sm:px-6 sm:py-28"
    >
      <div className="mx-auto max-w-7xl">
        <Chapter tc="00:02:14:00" label="Download" />

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-20">
          <div>
            <h2 className="display text-[clamp(2.75rem,8vw,6.5rem)]">Get ClypDat</h2>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-dim">
              Windows 10 or 11, x64. Encodes on NVIDIA, AMD or Intel GPUs, with
              a software encoder for machines that have none of the three.
            </p>

            <div className="mt-10 max-w-md">
              <p className="slate">Or install with WinGet</p>
              <div className="mt-3">
                <CopyCommand command={`winget install --id ${WINGET_ID}`} />
              </div>
            </div>
          </div>

          <div className="self-end">
            <div className="slate hidden grid-cols-[9rem_minmax(0,1fr)_1.5rem] gap-4 pb-3 sm:grid">
              <span>File</span>
              <span>Notes</span>
              <span />
            </div>
            <ul className="border-t border-rule">
              {downloads.map((item) => (
                <li key={item.file} className="border-b border-rule">
                  <a
                    href={`/download/${item.file}`}
                    className={`group grid grid-cols-[minmax(0,1fr)_1.5rem] items-baseline gap-x-4 gap-y-1 py-5 transition-colors sm:grid-cols-[9rem_minmax(0,1fr)_1.5rem] ${
                      item.recommended
                        ? "-mx-4 border-l-2 border-dim bg-[#1a1f24] px-4 text-paper hover:bg-[#1f252b] sm:-mx-4"
                        : "hover:bg-panel sm:-mx-4 sm:px-4"
                    }`}
                  >
                    <span className="font-semibold">
                      {item.label}
                      {item.recommended ? (
                        <span className="slate ml-2 text-[10px] text-dim">Recommended</span>
                      ) : null}
                    </span>
                    <span
                      aria-hidden
                      className={`col-start-2 row-start-1 text-right font-mono sm:col-start-3 ${
                        item.recommended ? "text-paper" : "text-faint group-hover:text-paper"
                      }`}
                    >
                      &darr;
                    </span>
                    <span className="text-dim sm:col-start-2 sm:row-start-1">
                      {item.description}
                      <span className="mt-1 block font-mono text-xs text-faint">
                        {item.file}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="slate mt-6 inline-block text-dim underline decoration-rule-strong underline-offset-4 transition-colors hover:text-paper"
            >
              Release notes and older versions on GitHub ↗
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
