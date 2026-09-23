"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DOWNLOAD_URL, GITHUB_URL, sectionLinks, socials } from "./links";
import RecTimer from "./RecTimer";

// The download section has the big button in the bar itself, so it is not a
// nav item as well - two "Download"s side by side read as a mistake.
const navLinks = sectionLinks.filter((link) => link.href !== "/#download");
const githubIcon = socials.find((social) => social.href === GITHUB_URL)!.path;

function DownloadIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5 motion-reduce:group-hover:translate-y-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" />
    </svg>
  );
}

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Transparent over the hero; once there is content behind it the bar lifts
  // into a floating pill. A full-width bar put a hard edge straight through the
  // hero's glow before anything had scrolled under it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Which section the reader is in. A thin band across the middle of the
  // viewport decides it, so a section counts once it holds the centre of the
  // screen rather than the moment its first pixel appears.
  useEffect(() => {
    if (pathname !== "/") return;
    const ids = sectionLinks.map((link) => link.href.slice(2));
    const nodes = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    if (!nodes.length) return;

    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        // Document order wins if two sections share the band.
        setActiveSection(ids.find((id) => visible.has(id)) ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    nodes.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      setActiveSection(null);
    };
  }, [pathname]);

  // Escape closes the phone menu, and so does growing past the breakpoint -
  // otherwise a menu opened on a narrow window stays open, invisibly, behind
  // the desktop nav and reappears the next time the window is narrowed.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const wide = window.matchMedia("(min-width: 768px)");
    const onWide = () => wide.matches && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [menuOpen]);

  return (
    // A plain broadcast bar across the full width: ink, one rule underneath,
    // and the REC light counting how long the page has been open. It only
    // firms up once something has scrolled under it.
    <header
      className={`sticky top-0 z-50 border-b transition-colors duration-300 ${
        scrolled || menuOpen ? "border-rule bg-ink" : "border-transparent bg-ink/80"
      }`}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-5">
          <Link href="/" className="flex items-center gap-2.5" aria-label="ClypDat home">
            {/* Serve the approved mark directly, without a cached optimizer
                resize from an earlier logo revision. */}
            <Image
              src="/logo-mark.png"
              alt=""
              width={32}
              height={18}
              unoptimized
              priority
              className="h-[16px] w-auto"
            />
            <span className="text-[17px] font-bold tracking-tight text-paper [font-stretch:87%]">
              ClypDat
            </span>
          </Link>
          <span className="slate hidden items-center gap-2 text-dim sm:flex">
            <RecTimer />
          </span>
        </div>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navLinks.map((link) => {
              const active = activeSection === link.href.slice(2);
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={active ? "location" : undefined}
                    className={`slate block px-3 py-2 transition-colors duration-200 ${
                      active ? "text-paper" : "text-dim hover:text-paper"
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-1">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ClypDat on GitHub"
            className="hidden h-9 w-9 items-center justify-center text-dim transition-colors hover:text-paper md:flex"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-[17px] w-[17px] fill-current">
              <path d={githubIcon} />
            </svg>
          </a>
          <Link
            href="/account"
            className={`slate hidden px-3 py-2 transition-colors md:block ${
              pathname === "/account" ? "text-paper" : "text-dim hover:text-paper"
            }`}
          >
            Account
          </Link>
          <a href={DOWNLOAD_URL} className="btn btn-primary btn-sm ml-2">
            <DownloadIcon />
            Download
          </a>
          {/* Below md the nav collapses into this. */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 items-center justify-center text-paper md:hidden"
          >
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-[18px] w-[18px]"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="square"
            >
              {menuOpen ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </div>

      <nav
        id="mobile-nav"
        aria-label="Main"
        hidden={!menuOpen}
        className="border-t border-rule bg-ink px-4 pb-3 md:hidden"
      >
        <ul className="flex flex-col">
          {[
            ...sectionLinks,
            { href: "/account", label: "Account" },
            { href: GITHUB_URL, label: "GitHub" },
          ].map((link) => {
            const external = link.href.startsWith("http");
            return (
              <li key={link.href} className="border-b border-rule last:border-b-0">
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="slate flex items-center justify-between py-3.5 text-[13px] text-dim transition-colors hover:text-paper"
                >
                  {link.label}
                  <span aria-hidden>{external ? "↗" : "→"}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
