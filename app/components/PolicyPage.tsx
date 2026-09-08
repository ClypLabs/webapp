import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

type Section = { title: string; content: ReactNode };

export function policyMetadata(title: string, description: string): Metadata {
  return { title: `${title} | ClypDat`, description };
}

export default function PolicyPage({ title, sections }: { title: string; sections: Section[] }) {
  return (
    <main className="min-h-screen px-6 py-16 sm:py-24">
      <article className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/30 sm:p-10">
        <nav aria-label="Policy navigation" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-emerald-300">
          <Link href="/">Home</Link><Link href="/account">Account</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link>
        </nav>
        <p className="mt-10 text-sm uppercase tracking-[0.22em] text-emerald-300">ClypLabs</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-4 text-sm text-zinc-400">Effective date: September 9, 2026</p>
        <div className="mt-10 space-y-9 text-[15px] leading-7 text-zinc-300">
          {sections.map((section) => <section key={section.title}><h2 className="text-xl font-semibold text-white">{section.title}</h2><div className="mt-3 space-y-4">{section.content}</div></section>)}
        </div>
      </article>
    </main>
  );
}
