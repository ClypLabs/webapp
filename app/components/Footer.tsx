import Image from "next/image";
import Link from "next/link";
import {
  DISCORD_URL,
  GITHUB_URL,
  ISSUES_URL,
  RELEASES_URL,
  STATUS_URL,
  sectionLinks,
  socials,
} from "./links";

type FooterLink = { href: string; label: string };

const columns: { title: string; links: FooterLink[] }[] = [
  { title: "Product", links: sectionLinks },
  {
    title: "Community",
    links: [
      { href: DISCORD_URL, label: "Discord" },
      { href: GITHUB_URL, label: "Source code" },
      { href: RELEASES_URL, label: "Release notes" },
      { href: ISSUES_URL, label: "Report a bug" },
      { href: STATUS_URL, label: "Service status" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/account", label: "Account" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/cookies", label: "Cookie Notice" },
    ],
  },
];

function FooterAnchor({ href, label }: FooterLink) {
  const className = "transition-colors hover:text-zinc-200";
  if (href.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }
  // Hash links stay plain anchors so the browser does the scroll, rather than
  // the router treating "/#faq" as a navigation to the page already open.
  if (href.includes("#")) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 pb-10 pt-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <Image src="/logo.svg" alt="" width={28} height={16} unoptimized className="h-4 w-auto" />
              <span className="font-semibold tracking-tight text-zinc-100">ClypDat</span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-6 text-zinc-500">
              A replay buffer for Windows. Press one key and the last few
              minutes are already saved.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {socials.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-zinc-500 transition-colors hover:border-white/25 hover:bg-white/5 hover:text-zinc-200"
                >
                  <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
                {column.title}
              </p>
              <ul className="mt-4 space-y-2.5 text-sm text-zinc-500">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <FooterAnchor {...link} />
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-2 border-t border-white/[0.06] pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} ClypLabs. Licensed under GPLv3.</p>
          <p>Bundles LibVLC (LGPL-2.1+) and FFmpeg (GPL).</p>
        </div>
      </div>
    </footer>
  );
}
