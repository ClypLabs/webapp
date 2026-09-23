import BufferStrip from "./BufferStrip";
import LibraryGraphic from "./LibraryGraphic";
import ScaleToFit from "./ScaleToFit";
import { DOWNLOAD_URL, GITHUB_URL } from "./links";

export default function Hero() {
  return (
    <section className="border-b border-rule px-4 pb-16 pt-8 sm:px-6 sm:pb-24 sm:pt-12">
      <div className="mx-auto max-w-7xl">
        {/* The slate over the feed: what is running and how it behaves. No
            hotkey here - the save key is the user's to change. */}
        <div className="slate mb-5 flex flex-wrap items-center gap-x-6 gap-y-1.5">
          <span className="text-dim">Replay buffer</span>
          <span>Length 01:00</span>
          <span className="hidden sm:inline">Oldest frames dropped first</span>
        </div>

        <BufferStrip />

        <h1 className="display mt-10 text-[clamp(3.4rem,10.5vw,9rem)] sm:mt-12">
          Always recording.
          <br />
          Saves on demand.
        </h1>

        <div className="mt-10 grid gap-10 sm:mt-14 lg:grid-cols-[minmax(0,34rem)_1fr] lg:items-end lg:gap-16">
          <div className="space-y-4 text-lg leading-relaxed text-dim">
            <p>
              ClypDat records your game in the background and keeps the last
              30 seconds to 5 minutes, however long you set it. Press your save
              key and that footage is written to disk as an MP4, named after the
              game.
            </p>
            <p className="text-base text-faint">
              Nothing is loaded into the game process, so anti-cheat has
              nothing to find.
            </p>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <a href={DOWNLOAD_URL} className="btn btn-primary">
                Download for Windows
              </a>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                Source on GitHub
              </a>
            </div>
            <p className="slate">
              Windows 10 / 11 x64 &middot; No admin rights &middot; Free, GPLv3
            </p>
          </div>
        </div>

        {/* The library as a monitor feed: crop marks, no card, no glow. */}
        <figure className="mx-auto mt-16 max-w-[1176px] sm:mt-24">
          <figcaption className="slate mb-3 flex items-center justify-between">
            <span>Library</span>
            <span>Clips grouped by day, newest first</span>
          </figcaption>
          <div className="viewfinder">
            <ScaleToFit designWidth={1152}>
              <LibraryGraphic className="w-full" />
            </ScaleToFit>
          </div>
        </figure>
      </div>
    </section>
  );
}
