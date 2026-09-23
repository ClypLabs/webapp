import { Fragment } from "react";
import { Chapter } from "./Slate";
import { DISCORD_URL, ISSUES_URL, WINGET_ID } from "./links";

type Faq = { q: string; a: string[] };

// Answers are plain strings so the same text can feed the FAQPage structured
// data below. Backticks mark a key or a command; they render as <kbd>/<code>
// on the page and are stripped for the JSON-LD.
//
// Every claim here is checked against the desktop app, not the marketing copy:
// the defaults (Insert, F10, 60 seconds) are AppSettings.cs, the length
// presets are MainWindowViewModel.DurationPresets, the import sources are
// Settings > Import Clips. Change them together.
export const faqs: Faq[] = [
  {
    q: "Is ClypDat free?",
    a: [
      "Yes. ClypDat is open source under GPLv3, and the full source is on GitHub. There is no paid tier, and you do not need an account to record, save or edit clips.",
    ],
  },
  {
    q: "Can using ClypDat get me banned by anti-cheat?",
    a: [
      "ClypDat never loads code into the game process. It reads finished frames through Windows Graphics Capture, the capture API built into Windows 10 and 11, so there is no hook or overlay DLL inside the game for anti-cheat to find.",
    ],
  },
  {
    q: "How do I save a clip?",
    a: [
      "Press the save key, which is `Insert` by default. ClypDat writes the buffer to your library as a clip, named after the game and the time it was saved.",
      "The key and the length are both in Settings > Replay Buffer. Length presets run from 30 seconds to 5 minutes, and the default is one minute.",
    ],
  },
  {
    q: "What hardware do I need?",
    a: [
      "Windows 10 or 11 on x64. ClypDat encodes on NVIDIA NVENC, AMD AMF or Intel Quick Sync, whichever your GPU has, and falls back to the libx264 software encoder when none is available.",
    ],
  },
  {
    q: "Will recording lower my frame rate?",
    a: [
      "Encoding runs on the GPU's dedicated video encoder, not the shader cores the game renders with, and downscaling happens on the GPU before a frame reaches the encoder.",
      "Your selected FPS is never lowered on its own. If the encoder can't keep up on your machine, turn on Frame-rate Protection in Settings > Replay Buffer: it drops the capture FPS while the encoder is overloaded and restores it once it recovers.",
    ],
  },
  {
    q: "Does ClypDat upload my clips?",
    a: [
      "No. Recordings, thumbnails and audio tracks stay in the library folder on your PC. The optional ClypDat account exists for Xbox activity and linked sign-ins; it never receives your footage.",
    ],
  },
  {
    q: "Can I record a whole session, not just clips?",
    a: [
      "Turn on Full Session Recording, then press its hotkey (`F10` by default) to start or stop it. ClypDat writes video and separate audio tracks as you play while the rolling buffer keeps running.",
      "A storage limit deletes the oldest sessions automatically once you pass it.",
    ],
  },
  {
    q: "Are game, voice chat and mic on separate tracks?",
    a: [
      "Yes. Game audio, chat and microphone are saved as separate tracks, and any extra app you enable in Recording Audio gets its own track too. The editor sets each track's volume, and Export mixes them into one track for players that only read the first.",
    ],
  },
  {
    q: "Which games does it detect?",
    a: [
      "ClypDat checks the window in front against, in order: games you added yourself, its own game catalogue (refreshed from GitHub once a day), and games installed through Steam, Epic Games, Battle.net or Riot.",
      "Nothing is guessed from the window. For Steam, ClypDat reads the app manifest in every Steam library folder on your PC, which names each installed game and where it lives. Epic's install manifests, Battle.net's product database and the Riot Client's install list do the same job for those launchers. Steam apps that Steam itself labels as tools or software are skipped, so Wallpaper Engine never starts a recording.",
      "If a game is missed, add it in Settings > Game Detection: pick it while it's running, browse to its .exe, or give ClypDat a folder to scan. A scan adds games it recognises and asks you about uncertain ones, such as Unity apps. Anything picked up by mistake can be excluded from the same page.",
      "If you set the capture source to Desktop Capture, ClypDat records a monitor instead, and switches to the game's window while one is detected.",
    ],
  },
  {
    q: "Can I bring my clips over from Medal or SteelSeries?",
    a: [
      "Settings > Import Clips finds clips recorded by Medal and SteelSeries Moments and copies or moves them into your ClypDat library, keeping their titles, games and dates.",
    ],
  },
  {
    q: "How do updates work?",
    a: [
      "ClypDat checks for a new release when it starts and, by default, installs it before the main window opens. If you installed through WinGet, `winget upgrade " +
        WINGET_ID +
        "` works too.",
    ],
  },
  {
    q: "Installer, Portable, Zip or MSI: which one?",
    a: [
      "Take the Installer. It installs to your user folder, so it needs no admin approval, and it updates itself. Portable runs without installing, the Zip is the raw build folder, and the MSI is for IT-managed deployment.",
    ],
  },
  {
    q: "Is there a Mac or Linux version?",
    a: [
      "Not today. Capture is built on Windows Graphics Capture, a Windows API, so ClypDat runs on Windows 10 and 11 only.",
    ],
  },
];

// Splits on backticks: even parts are prose, odd parts are a key or command.
// A hotkey (letters joined with +) reads better as separate keycaps.
function Answer({ text }: { text: string }) {
  return (
    <>
      {text.split("`").map((part, index) => {
        if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>;
        if (/^[A-Z][\w]*(\+[\w]+)*$/.test(part) && !part.includes(" ")) {
          return (
            <span key={index} className="inline-flex items-center gap-1 align-baseline">
              {part.split("+").map((key, keyIndex) => (
                <Fragment key={key}>
                  {keyIndex > 0 ? <span className="text-faint">+</span> : null}
                  <kbd className="kbd">{key}</kbd>
                </Fragment>
              ))}
            </span>
          );
        }
        return (
          <code
            key={index}
            className="border border-rule bg-panel-2 px-1.5 py-0.5 font-mono text-[0.85em] text-paper"
          >
            {part}
          </code>
        );
      })}
    </>
  );
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a.join(" ").replaceAll("`", ""),
    },
  })),
};

export default function FAQ() {
  return (
    <section
      id="faq"
      className="section-anchor section-lazy border-t border-rule px-4 py-15 sm:px-6 sm:py-28"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <div className="mx-auto max-w-7xl">
        <Chapter tc="00:01:37:22" label="FAQ" />

        <div className="mt-10 grid gap-12 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-20">
          {/* Sticks beside the list on desktop, so the way to ask a person
              stays in view however far down the list you read. */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <h2 className="display text-[clamp(2.75rem,8vw,6.5rem)]">Questions</h2>
            <p className="mt-6 max-w-sm leading-relaxed text-dim">
              Something not covered here? Ask in the Discord, or open a GitHub
              issue with your Windows version and GPU.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                Discord
              </a>
              <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                Report a bug
              </a>
            </div>
          </div>

          {/* Native <details>: keyboard and screen-reader support come free, it
              works without JS, and find-in-page opens the matching answer. */}
          <div className="border-t border-rule">
            {faqs.map((item, index) => (
              <details key={item.q} className="faq-item group border-b border-rule">
                <summary className="flex cursor-pointer list-none items-baseline gap-4 py-5 text-left [&::-webkit-details-marker]:hidden">
                  <span className="slate w-6 shrink-0">{String(index + 1).padStart(2, "0")}</span>
                  <span className="flex-1 text-lg font-semibold text-paper transition-colors group-hover:text-white">
                    {item.q}
                  </span>
                  <span aria-hidden className="font-mono text-lg text-faint group-open:hidden">+</span>
                  <span aria-hidden className="hidden font-mono text-lg text-paper group-open:inline">&minus;</span>
                </summary>
                <div className="space-y-3 pb-6 pl-10 pr-2 leading-7 text-dim sm:pr-10">
                  {item.a.map((paragraph) => (
                    <p key={paragraph}>
                      <Answer text={paragraph} />
                    </p>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
