"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const GITHUB_URL = "https://github.com/ClypLabs/ClypDat";
// Own-domain download URL, so it survives GitHub being unreachable - see
// app/download/[asset]/route.ts.
const DOWNLOAD_URL = "/download/ClypDat-Setup.exe";

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#editor", label: "Editor" },
  { href: "#download", label: "Download" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  // The header is transparent over the hero and only takes on a background once
  // there is content behind it. A permanently frosted bar puts a hard edge
  // across the top of the page before anything has scrolled under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      // transition-colors, not transition-all: `all` on a sticky element makes
      // the browser watch every animatable property on it for changes, and the
      // only two that ever change here are the border and the background.
      className={`sticky top-0 z-50 transition-colors duration-500 ${
        scrolled
          ? "border-b border-white/10 bg-background/95"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <Image
            src="/icon.png"
            alt=""
            width={28}
            height={28}
            className="rounded-md transition-transform duration-500 group-hover:scale-105 motion-reduce:group-hover:scale-100"
          />
          <span className="text-lg font-semibold tracking-tight">ClypDat</span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-zinc-400 sm:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative transition-colors hover:text-zinc-100"
            >
              {link.label}
            </a>
          ))}
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-zinc-100"
          >
            GitHub
          </a>
        </nav>

        <a
          href={DOWNLOAD_URL}
          className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-950 transition-all duration-300 hover:bg-emerald-300 hover:shadow-[0_0_28px_-6px] hover:shadow-emerald-400/60"
        >
          Download
        </a>
      </div>
    </header>
  );
}

export { GITHUB_URL, DOWNLOAD_URL };
