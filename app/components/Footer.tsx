import Image from "next/image";
import Link from "next/link";
import { GITHUB_URL } from "./Header";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 text-sm text-zinc-500 sm:flex-row">
        <div className="flex items-center gap-2">
          <Image
            src="/icon.png"
            alt=""
            width={20}
            height={20}
            className="rounded"
          />
          <span>ClypDat</span>
        </div>
        <div className="text-center">
          <p>Licensed under GPLv3. Bundles LibVLC and ffmpeg.</p>
          <p className="mt-2">
            <Link href="/terms" className="transition-colors hover:text-zinc-300">Terms of Service</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/privacy" className="transition-colors hover:text-zinc-300">Privacy Policy</Link>
            <span aria-hidden="true"> · </span>
            <Link href="/cookies" className="transition-colors hover:text-zinc-300">Cookie Notice</Link>
          </p>
        </div>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-zinc-300"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
