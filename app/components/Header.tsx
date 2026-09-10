"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DOWNLOAD_URL, GITHUB_URL, sectionLinks, socials } from "./links";

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

  const lifted = scrolled || menuOpen;

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 sm:px-4">
      {/* transition on colours and shadow only, not `all`: this is sticky, and
          `all` makes the browser watch every animatable property on it. */}
      <div
        className={`mx-auto max-w-6xl rounded-2xl border transition-[background-color,border-color,box-shadow] duration-500 ${
          lifted
            ? "border-white/[0.09] bg-[#0c1015]/85 shadow-[0_12px_40px_-12px_rgb(0_0_0/0.7)] backdrop-blur-md"
            : "border-transparent"
        }`}
      >
        <div className="flex h-14 items-center justify-between gap-4 pl-4 pr-2 sm:pl-5">
          <Link href="/" className="group flex items-center gap-2.5" aria-label="ClypDat home">
            {/* The vector mark, not /icon.png through the image optimizer: that
                URL predates the logo change, and a cached resize of it kept
                serving the old mark after the file itself was replaced. */}
            <Image
              src="/logo.svg"
              alt=""
              width={32}
              height={18}
              unoptimized
              priority
              className="h-[18px] w-auto transition-transform duration-500 group-hover:scale-110 motion-reduce:group-hover:scale-100"
            />
            <span className="text-[17px] font-semibold tracking-tight text-zinc-50">
              ClypDat
            </span>
          </Link>

          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1 text-sm">
              {navLinks.map((link) => {
                const active = activeSection === link.href.slice(2);
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      aria-current={active ? "location" : undefined}
                      className={`relative block rounded-full px-4 py-1.5 transition-colors duration-300 ${
                        active
                          ? "bg-white/[0.07] text-zinc-50"
                          : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
                      }`}
                    >
                      {link.label}
                      {/* The accent dot under the current section. */}
                      <span
                        aria-hidden
                        className={`absolute bottom-0 left-1/2 h-[3px] w-[3px] -translate-x-1/2 rounded-full bg-emerald-400 transition-opacity duration-300 ${
                          active ? "opacity-100" : "opacity-0"
                        }`}
                      />
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-1.5">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="ClypDat on GitHub"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-100 md:flex"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px] fill-current">
                <path d={githubIcon} />
              </svg>
            </a>
            <Link
              href="/account"
              className={`hidden h-9 items-center rounded-full px-3.5 text-sm transition-colors md:flex ${
                pathname === "/account"
                  ? "text-zinc-50"
                  : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100"
              }`}
            >
              Account
            </Link>
            <span aria-hidden className="mx-1 hidden h-5 w-px bg-white/10 md:block" />
            <a
              href={DOWNLOAD_URL}
              className="group flex h-9 items-center gap-2 rounded-full bg-emerald-400 pl-3.5 pr-4 text-sm font-semibold text-emerald-950 transition-[background-color,box-shadow] duration-300 hover:bg-emerald-300 hover:shadow-[0_0_28px_-6px] hover:shadow-emerald-400/60"
            >
              <DownloadIcon />
              Download
            </a>
            {/* Below md the nav collapses into this. There used to be no phone
                nav at all - the only way to reach the FAQ or the account page
                from a phone was to scroll for it. */}
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors hover:bg-white/[0.06] md:hidden"
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                className="h-[18px] w-[18px]"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
              >
                {menuOpen ? (
                  <path d="M6 6l12 12M18 6L6 18" />
                ) : (
                  <path d="M4 8h16M4 16h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        <nav
          id="mobile-nav"
          aria-label="Main"
          hidden={!menuOpen}
          className="border-t border-white/[0.06] px-2 pb-2 pt-1 md:hidden"
        >
          <ul className="flex flex-col">
            {[
              ...sectionLinks,
              { href: "/account", label: "Account" },
              { href: GITHUB_URL, label: "GitHub" },
            ].map((link) => {
              const external = link.href.startsWith("http");
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    {...(external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="flex items-center justify-between rounded-xl px-3 py-3 text-[15px] text-zinc-300 transition-colors hover:bg-white/[0.05] hover:text-zinc-50"
                  >
                    {link.label}
                    <span aria-hidden className="text-zinc-600">
                      {external ? "↗" : "→"}
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
