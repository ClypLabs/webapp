import CountUp from "./CountUp";
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
    <section aria-label="Clips saved with ClypDat" className="relative px-6 pb-8 pt-4">
      <Reveal className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <p className="font-display text-display text-5xl font-semibold leading-none tracking-[-0.02em] sm:text-7xl">
          <CountUp value={saves} />
        </p>
        <p className="text-accent mt-4 text-lg font-semibold sm:text-xl">
          clips saved with ClypDat
        </p>
        <p className="mt-3 text-xs text-zinc-600">
          Counted when a clip is saved. The clip itself never leaves your PC.
        </p>
      </Reveal>
    </section>
  );
}
