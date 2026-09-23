import Link from "next/link";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { DOWNLOAD_URL } from "./components/links";

// SMPTE colour bars at 75%: grey, yellow, cyan, green, magenta, red, blue;
// the reverse-blue castellations under them; then the pluge row.
const bars = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"];
const castellations = ["#0000c0", "#131313", "#c000c0", "#131313", "#00c0c0", "#131313", "#c0c0c0"];
const pluge = ["#00214c", "#ffffff", "#32006a", "#131313", "#090909", "#131313", "#1d1d1d", "#131313"];

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex flex-1 items-center px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-20">
          <div aria-hidden className="relative aspect-video w-full overflow-hidden border border-rule">
            <div className="smpte absolute inset-0 opacity-80">
              <div>
                {bars.map((colour) => (
                  <span key={colour} style={{ background: colour }} />
                ))}
              </div>
              <div>
                {castellations.map((colour, index) => (
                  <span key={index} style={{ background: colour }} />
                ))}
              </div>
              <div>
                {pluge.map((colour, index) => (
                  <span key={index} style={{ background: colour, flexGrow: index < 3 ? 1.25 : index === 3 ? 1.75 : 0.35 }} />
                ))}
              </div>
            </div>
            <span className="slate absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-ink px-3 py-1.5 text-[13px] text-paper">
              No signal
            </span>
          </div>

          <div>
            <p className="slate">Error 404</p>
            <h1 className="display mt-4 text-[clamp(3.5rem,11vw,8rem)]">No signal</h1>
            <p className="mt-6 max-w-md text-lg leading-relaxed text-dim">
              Nothing was recorded at this address. The page may have moved, or
              the link was mistyped.
            </p>
            <div className="mt-10 flex flex-col gap-2.5 sm:flex-row">
              <Link href="/" className="btn btn-primary">
                Back to the homepage
              </Link>
              <a href={DOWNLOAD_URL} className="btn btn-ghost">
                Download ClypDat
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
