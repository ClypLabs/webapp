"use client";

import { useEffect, useState } from "react";

// A shell command with a copy button. The command is real selectable text as
// well, so it still works where the clipboard API is refused (an insecure
// origin, or a browser that asks and gets told no).
export default function CopyCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
    } catch {
      // Nothing to recover - the text is on screen to select by hand.
    }
  };

  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 py-2 pl-4 pr-2 text-left">
      <span aria-hidden className="select-none font-mono text-sm text-emerald-400/70">
        &gt;
      </span>
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-zinc-200 [scrollbar-width:none]">
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy command"}
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-semibold text-zinc-300 transition-colors hover:border-white/25 hover:bg-white/5"
      >
        {copied ? (
          <>
            <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            Copied
          </>
        ) : (
          <>
            <svg aria-hidden viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="11" height="11" rx="2" />
              <path d="M5 15V6a2 2 0 0 1 2-2h9" />
            </svg>
            Copy
          </>
        )}
      </button>
      {/* Announced once per copy, for anyone not looking at the button. */}
      <span className="sr-only" aria-live="polite">
        {copied ? "Command copied to clipboard" : ""}
      </span>
    </div>
  );
}
