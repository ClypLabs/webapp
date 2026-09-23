import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

type Section = { title: string; content: ReactNode };

export function policyMetadata(title: string, description: string): Metadata {
  return { title: `${title} | ClypDat`, description };
}

// `updated` is per policy, so changing one page does not claim the others
// changed with it.
export default function PolicyPage({ title, sections, updated = "September 9, 2026" }: { title: string; sections: Section[]; updated?: string }) {
  return (
    <>
    <Header />
    <main className="flex-1 px-4 py-14 sm:px-6 sm:py-20">
      {/* A plain document: no card around it. Links inside the policy text are
          restyled from here, so the pages themselves keep their own markup. */}
      <article className="mx-auto w-full max-w-3xl [&_a]:text-paper [&_a]:underline [&_a]:decoration-rule-strong [&_a]:underline-offset-4 [&_a:hover]:decoration-paper">
        <nav aria-label="Policies" className="slate flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link>
        </nav>
        <p className="slate mt-12">ClypLabs</p>
        <h1 className="display mt-3 text-[clamp(3rem,9vw,5.5rem)]">{title}</h1>
        <p className="slate mt-5 normal-case tracking-normal">Effective date and last updated: {updated}</p>
        <div className="mt-12 border-t border-rule text-[15px] leading-7 text-dim [&_strong]:text-paper">
          {sections.map((section) => <section key={section.title} className="border-b border-rule py-8"><h2 className="text-xl font-semibold text-paper">{section.title}</h2><div className="mt-3 space-y-4">{section.content}</div></section>)}
        </div>
      </article>
    </main>
    <Footer />
    </>
  );
}
