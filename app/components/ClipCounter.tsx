import LiveClipCount from "./LiveClipCount";
import Reveal from "./Reveal";
import { getClipStats } from "@/app/lib/clip-stats";

// Every clip, auto-clip and full session saved with ClypDat, as one number -
// the per-kind counts behind it stay in the database for later.
//
// Rendered on the server with the page, which revalidates every few minutes
// (see page.tsx), so a visit never waits on the database and the database is
// read a handful of times an hour however many people load the page.
export default async function ClipCounter() {
  let saves = 0;
  try {
    saves = (await getClipStats()).total;
  } catch {
    // No database (local build without env vars) or a transient failure: leave
    // the section out rather than show a zero that isn't true.
    return null;
  }
  if (saves <= 0) return null;

  return (
    <section aria-label="Clips saved with ClypDat" className="relative px-6 pb-12 pt-4">
      <Reveal className="relative mx-auto max-w-2xl">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center shadow-2xl shadow-black/40 sm:px-12 sm:py-12">
          {/* A glow sitting behind the number, and a hairline of accent along
              the top edge - the card reads as lit from the figure itself. */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-[36rem] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(52,211,153,0.16),transparent)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent"
          />

          <p className="relative inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-300">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-pulse-soft absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Live count
          </p>

          <LiveClipCount initial={saves} />

          <div className="relative mx-auto mt-8 flex max-w-md items-center justify-center gap-2 border-t border-white/[0.06] pt-5 text-xs text-zinc-500">
            <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-zinc-500" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Counted when a clip is saved. The clip itself never leaves your PC.
          </div>
        </div>
      </Reveal>
    </section>
  );
}
