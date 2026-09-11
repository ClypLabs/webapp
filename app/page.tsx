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
import ClipCounter from "./components/ClipCounter";

// Re-rendered at most every 30 seconds, so the clip counter's first paint is
// close to current; the counter then fetches the live total itself on load.
export const revalidate = 30;

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
        <ClipCounter />
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
