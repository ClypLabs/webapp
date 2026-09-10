import LibraryGraphic from "./LibraryGraphic";
import ScaleToFit from "./ScaleToFit";
import Reveal, { RevealWords } from "./Reveal";
import { DOWNLOAD_URL, GITHUB_URL, socials } from "./links";

// GitHub already has its own button right above these.
const heroSocials = socials.filter((social) => social.href !== GITHUB_URL);

export default function Hero() {
  return (
    // Pulled up under the header by the header's own height (69px), so the
    // glow runs to the top of the page. Starting below the bar left the bar
    // sitting on a flat dark strip with the glow cut off in a line beneath it.
    <section className="relative -mt-[69px] overflow-hidden px-6 pt-[calc(69px+5rem)] pb-24 sm:pt-[calc(69px+7rem)] sm:pb-32">
      {/* Ambient glow. Sits behind everything, never intercepts a click, and
          animates only where the OS allows motion - see globals.css. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-56 -z-10 flex justify-center"
      >
        <div className="relative h-[620px] w-full max-w-5xl">
          {/* Gradients rather than blurred circles, for the same reason as the
              page-wide ambience: an animated blur is re-rasterised every frame.
              Centred with a calc offset instead of -translate-x-1/2, because the
              drift keyframes set transform outright and were overriding it. */}
          <div className="animate-drift-a absolute left-[calc(50%-470px)] top-[-130px] h-[700px] w-[940px] bg-[radial-gradient(closest-side,rgba(16,185,129,0.30),transparent)]" />
          <div className="animate-drift-b absolute left-[6%] top-0 h-[600px] w-[700px] bg-[radial-gradient(closest-side,rgba(45,212,191,0.24),transparent)]" />
          <div className="animate-drift-c absolute right-[2%] top-[-40px] h-[620px] w-[660px] bg-[radial-gradient(closest-side,rgba(6,182,212,0.18),transparent)]" />
        </div>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
        {/* No backdrop-blur. It sits over the hero's own gradient glow and
            nothing else, so the blur cost a backdrop read and a blur pass per
            composite to soften something that was already a soft gradient -
            and it sits over one of the few things on the page that moves, so
            that read happened on every frame of the drift. */}
        <Reveal className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs text-zinc-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-pulse-soft absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Free &amp; open source, GPLv3
        </Reveal>

        {/* The headline carries the page. The payload phrase takes the gradient
            fill - the one place the eye is meant to land first. */}
        <h1 className="font-display text-display font-semibold text-5xl leading-[0.95] tracking-[-0.02em] text-balance sm:text-7xl lg:text-8xl">
          <RevealWords text="Never miss" delay={80} />{" "}
          <RevealWords
            text="the clip."
            delay={80}
            wordClassName="text-accent"
          />
        </h1>

        <Reveal
          delay={420}
          as="p"
          className="mt-8 max-w-xl text-lg leading-relaxed text-zinc-400 text-balance"
        >
          ClypDat records in the background and keeps the last few minutes.
          When something good happens, press one key and it&apos;s saved.
          Nothing runs inside the game, so anti-cheat has nothing to flag.
        </Reveal>

        <Reveal
          delay={520}
          className="mt-11 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row"
        >
          <a
            href={DOWNLOAD_URL}
            className="group flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-7 text-sm font-semibold text-emerald-950 transition-all duration-300 hover:bg-emerald-300 hover:shadow-[0_0_40px_-8px] hover:shadow-emerald-400/60 sm:w-auto"
          >
            Download for Windows
            <span
              aria-hidden
              className="transition-transform duration-300 group-hover:translate-x-0.5"
            >
              &rarr;
            </span>
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center rounded-full border border-white/15 px-7 text-sm font-semibold text-zinc-200 transition-colors duration-300 hover:border-white/30 hover:bg-white/5 sm:w-auto"
          >
            View source on GitHub
          </a>
        </Reveal>

        <Reveal delay={600} as="p" className="mt-5 text-xs text-zinc-500">
          Windows 10 and 11, x64. The installer doesn&apos;t need admin rights.
        </Reveal>

        <Reveal delay={660} className="mt-6 flex items-center gap-3">
          {heroSocials.map((social) => (
            <a
              key={social.href}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.label}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-500 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/5 hover:text-zinc-200 motion-reduce:hover:translate-y-0"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-current"
              >
                <path d={social.path} />
              </svg>
            </a>
          ))}
        </Reveal>
      </div>

      <Reveal delay={720} className="relative mx-auto mt-20 max-w-6xl">
        {/* Phone treatment, all for the same reason: the graphic is scaled to
            fit, so anything sized in fixed pixels reads far heavier down there.
            The radius steps down (16px against a 342px card is four times
            rounder than against 1152px), the border and tint go away entirely
            (both are lighter than the page, so the card's edge stayed visible
            through the fade), and the bottom corners keep a larger radius than
            the top so the faded edge reads as dissolving rather than cut. */}
        <div className="relative overflow-hidden rounded-t-md rounded-b-xl shadow-2xl shadow-black/50 sm:rounded-2xl sm:border sm:border-white/10 sm:bg-white/[0.03]">
          {/* Scaled rather than restacked, so a phone shows the same three
              column library the app actually has. The design width matches the
              max-w-6xl wrapper, so at desktop it renders 1:1 and fills the card
              exactly - anything narrower left a gap down the right-hand side. */}
          <ScaleToFit designWidth={1152}>
            <LibraryGraphic className="w-full" />
          </ScaleToFit>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            {/* Travels out of the clip above, so it is the wrapper that decides
                whether this is on screen - see PauseOffscreen.tsx. */}
            <div
              data-pause-anchor
              className="animate-sheen h-full w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
            />
          </div>

          {/* Fades the screenshot into the page instead of ending it on a hard
              edge, so the next section reads as continuing rather than
              starting. Just the bottom edge - the graphic itself should stay
              visible.

              Inside the card, not beside it: as a sibling it painted its own
              square-cornered rectangle over the card's rounded bottom, which
              put the pointy corners back. In here the card's overflow clips it
              to the same radius. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background sm:h-32"
          />
        </div>
      </Reveal>
    </section>
  );
}
