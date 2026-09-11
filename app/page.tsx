import Header from "./components/Header";
import Hero from "./components/Hero";
import HowItWorks from "./components/HowItWorks";
import Features from "./components/Features";
import Editor from "./components/Editor";
import Download from "./components/Download";
import FAQ from "./components/FAQ";
import Footer from "./components/Footer";
import { RevealProvider } from "./components/Reveal";
import Ambience from "./components/Ambience";

// The live clips-saved counter (components/ClipCounter.tsx) is hidden for now.
// Counting carries on regardless: the app reports every save to
// /api/stats/clips whether or not the page shows it. To show it again, import
// ClipCounter, render <ClipCounter /> after <Hero />, and add
// `export const revalidate = 30` so the page's first paint stays close to the
// live total.

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* One observer drives every reveal on the page - see Reveal.tsx. */}
      <RevealProvider />
      {/* One atmosphere layer for the whole page - see Ambience.tsx. */}
      <Ambience />
      <Header />
      <main className="flex-1">
        <Hero />
        <HowItWorks />
        <Features />
        <Editor />
        <FAQ />
        <Download />
      </main>
      <Footer />
    </div>
  );
}
