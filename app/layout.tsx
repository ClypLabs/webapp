import type { Metadata } from "next";
import { Archivo, Inter, JetBrains_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import PauseOffscreen from "./components/PauseOffscreen";
import PerfMode from "./components/PerfMode";
import "./globals.css";

// One family for body and headlines. Archivo carries a width axis, so the
// headlines are the same face pulled to its extra-condensed end (font-stretch
// 62%) - the tall, tight caps of a broadcast lower third - rather than a second
// display font dropped in beside it.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// The desktop app's UI face (App.axaml: fonts:Inter#Inter). Only the two window
// mockups use it, so they read as the app rather than as this page.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Timecodes, filenames, keys and every other value the app itself would print.
const mono = JetBrains_Mono({
  variable: "--font-jetbrains",
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
    "Free, open-source replay buffer for Windows. It records in the background and saves the last few minutes of gameplay when you press a key. Nothing is loaded into the game, and every clip opens in a built-in editor.",
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
      "ClypDat records in the background. Press a key and the last few minutes of gameplay are saved as a clip.",
    url: siteUrl,
    siteName: "ClypDat",
    images: ["/icon.png?v=3"],
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ClypDat - Instant replay buffer for Windows",
    description:
      "ClypDat records in the background. Press a key and the last few minutes of gameplay are saved as a clip.",
    images: ["/icon.png?v=3"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${inter.variable} ${mono.variable} h-full antialiased`}
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
      {/* The page colour is set in globals.css, on both html and body. */}
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
