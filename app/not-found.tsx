import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Ambience from "./components/Ambience";
import { DOWNLOAD_URL } from "./components/links";

export default function NotFound() {
  return (
    <>
      <Ambience />
      <Header />
      <main className="flex flex-1 items-center justify-center px-6 py-32">
        <div className="max-w-lg text-center">
          <p className="font-mono text-sm text-emerald-400/70">404</p>
          <h1 className="font-display text-display mt-4 text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-balance sm:text-6xl">
            This one <span className="text-accent">wasn&apos;t saved.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-md text-lg text-zinc-400 text-balance">
            There is no page at this address. It may have moved, or the link
            was mistyped.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/"
              className="flex h-12 w-full items-center justify-center rounded-full bg-emerald-400 px-7 text-sm font-semibold text-emerald-950 transition-colors hover:bg-emerald-300 sm:w-auto"
            >
              Back to the homepage
            </Link>
            <a
              href={DOWNLOAD_URL}
              className="flex h-12 w-full items-center justify-center rounded-full border border-white/15 px-7 text-sm font-semibold text-zinc-200 transition-colors hover:border-white/30 hover:bg-white/5 sm:w-auto"
            >
              Download ClypDat
            </a>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
