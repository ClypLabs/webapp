import Image from "next/image";
import appPreview from "@/public/screenshots/app-preview.webp";
import { DOWNLOAD_URL, GITHUB_URL } from "./Header";

export default function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
      {/* Ambient glow. Sits behind everything, never intercepts a click, and
          animates only where the OS allows motion - see globals.css. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-56 -z-10 flex justify-center"
      >
        <div className="relative h-[620px] w-full max-w-5xl">
          <div className="animate-drift-a absolute left-1/2 top-0 h-[440px] w-[680px] -translate-x-1/2 rounded-full bg-emerald-500/25 blur-[130px]" />
          <div className="animate-drift-b absolute left-[18%] top-24 h-[360px] w-[460px] rounded-full bg-teal-400/20 blur-[120px]" />
          <div className="animate-drift-c absolute right-[14%] top-10 h-[380px] w-[420px] rounded-full bg-cyan-500/15 blur-[120px]" />
        </div>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="animate-rise mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          Free &amp; open source, GPLv3
        </div>

        <h1
          className="animate-rise text-4xl font-semibold tracking-tight text-balance sm:text-6xl"
          style={{ animationDelay: "60ms" }}
        >
          Never miss the clip.
        </h1>
        <p
          className="animate-rise mt-6 max-w-xl text-lg text-zinc-400 text-balance"
          style={{ animationDelay: "120ms" }}
        >
          ClypDat is always recording in the background. The moment something
          worth keeping happens, press one key &mdash; the last few minutes are
          already saved. No process hook, so anti-cheat has nothing to object
          to.
        </p>

        <div
          className="animate-rise mt-10 flex flex-col items-center gap-3 sm:flex-row"
          style={{ animationDelay: "180ms" }}
        >
          <a
            href={DOWNLOAD_URL}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-400 px-6 text-sm font-semibold text-emerald-950 transition-all hover:bg-emerald-300 hover:shadow-lg hover:shadow-emerald-500/25 sm:w-auto"
          >
            Download for Windows
          </a>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 w-full items-center justify-center rounded-full border border-white/15 px-6 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/5 sm:w-auto"
          >
            View source on GitHub
          </a>
        </div>
        <p
          className="animate-rise mt-4 text-xs text-zinc-500"
          style={{ animationDelay: "240ms" }}
        >
          Windows 10/11, x64. Installer needs no admin approval.
        </p>
        <div
          className="animate-rise mt-5 flex items-center gap-4 text-xs text-zinc-500"
          style={{ animationDelay: "280ms" }}
        >
          <a
            href="https://x.com/ClypDat"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ClypDat on X"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 transition-colors hover:border-white/25 hover:bg-white/5 hover:text-zinc-200"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-current"
            >
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.963 6.817H1.684l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
            </svg>
          </a>
          <a
            href="https://discord.gg/jt3eJf238t"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Join ClypDat on Discord"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 transition-colors hover:border-white/25 hover:bg-white/5 hover:text-zinc-200"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-current"
            >
              <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.027c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.2 13.2 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.794 8.18 1.794 12.061 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.007.127c-.598.35-1.22.648-1.873.891a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.077.077 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.033-.03ZM8.02 15.33c-1.18 0-2.156-1.085-2.156-2.419 0-1.333.956-2.418 2.156-2.418 1.21 0 2.175 1.095 2.156 2.418 0 1.334-.956 2.419-2.156 2.419Zm7.974 0c-1.18 0-2.156-1.085-2.156-2.419 0-1.333.956-2.418 2.156-2.418 1.21 0 2.175 1.095 2.156 2.418 0 1.334-.956 2.419-2.156 2.419Z" />
            </svg>
          </a>
        </div>
      </div>

      <div
        className="animate-rise relative mx-auto mt-16 max-w-5xl"
        style={{ animationDelay: "300ms" }}
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/50">
          {/* Static import, so Next knows the dimensions at build time and
              generates the blur placeholder itself - no layout shift, and
              something on screen before the full image arrives. priority
              because this is the LCP element. */}
          <Image
            src={appPreview}
            alt="The ClypDat library, showing captured clips grouped by day"
            placeholder="blur"
            priority
            sizes="(min-width: 1280px) 1024px, 100vw"
            className="w-full"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden"
          >
            <div className="animate-sheen h-full w-1/3 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
