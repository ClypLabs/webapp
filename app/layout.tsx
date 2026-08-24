import type { Metadata } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import PauseOffscreen from "./components/PauseOffscreen";
import PerfMode from "./components/PerfMode";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for headlines only - body copy stays on Geist. A grotesque with
// some actual character in its shapes, rather than a serif: a serif at this
// size is the reference site's signature, and borrowing it would read as a
// copy rather than as a page of our own.
const displayFont = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

// The canonical domain, and it has to be a real one: metadataBase is what
// every relative URL in the metadata below resolves against, so the og:image
// is only fetchable by a social scraper if this points somewhere that serves
// the site. The apex 308-redirects here, so www is the canonical form.
const siteUrl = "https://www.clypdat.xyz";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "ClypDat - Instant replay buffer for Windows",
  description:
    "ClypDat is always recording in the background. Press one key and the last few minutes of your gameplay are already saved. No process hook, built-in editor, CS2 auto-clipping.",
  // No explicit icon entry - app/favicon.ico is picked up automatically by
  // Next's file convention, and duplicating it here just risks the two
  // drifting if one gets swapped and not the other.
  //
  // Google was pulling one of the in-page screenshots as a search-result
  // thumbnail, and a grid of tiny unreadable frames sitting next to the title
  // does the listing no favours. max-image-preview:none drops the thumbnail
  // while leaving the text snippet and indexing untouched.
  robots: {
    index: true,
    follow: true,
    "max-image-preview": "none",
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "none",
    },
  },
  openGraph: {
    title: "ClypDat - Instant replay buffer for Windows",
    description:
      "ClypDat is always recording in the background. Press one key and the last few minutes of your gameplay are already saved.",
    url: siteUrl,
    siteName: "ClypDat",
    images: ["/icon.png"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ClypDat - Instant replay buffer for Windows",
    description:
      "ClypDat is always recording in the background. Press one key and the last few minutes of your gameplay are already saved.",
    images: ["/icon.png"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${displayFont.variable} h-full antialiased`}
    >
      <head>
        {/* Reveal-on-scroll starts elements hidden and a client observer brings
            them in. Without JS that observer never runs, so the page would be
            blank - this makes the hidden state conditional on JS existing. */}
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html:
                "[data-reveal]{opacity:1 !important;transform:none !important}",
            }}
          />
        </noscript>
      </head>
      {/* No background here - it belongs on `html`, or it paints over the
          ambience layer. See globals.css. */}
      <body className="min-h-full flex flex-col text-foreground">
        {children}
        <PauseOffscreen />
        <PerfMode />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
