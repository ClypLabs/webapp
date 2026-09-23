import Image from "next/image";
import type { ReactNode } from "react";

// The window furniture both app mockups share: title bar, rail footer and the
// icons in them. Colours are the desktop app's default ("System") theme, read
// off its own ramp keys - Surface_171F27 is #171F27 - with the accent at the
// app's #5864E8 fallback. Kept in one place so the library and the editor
// cannot drift apart.

export const ACCENT = "#5864E8";

const icon = "h-4 w-4 fill-current";

export const paths = {
  back: "M15.41,7.41L14,6l-6,6l6,6l1.41-1.41L10.83,12L15.41,7.41z",
  forward: "M8.59,16.59L10,18l6-6l-6-6L8.59,7.41L13.17,12L8.59,16.59z",
  refresh:
    "M17.65,6.35C16.2,4.9,14.21,4,12,4c-4.42,0-7.99,3.58-7.99,8s3.57,8,7.99,8c3.73,0,6.84-2.55,7.73-6h-2.08c-0.82,2.33-3.04,4-5.65,4c-3.31,0-6-2.69-6-6s2.69-6,6-6c1.66,0,3.14,0.69,4.22,1.78L13,11h7V4L17.65,6.35z",
  bell: "M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5.5-6.84V3.5a1.5 1.5 0 0 0-3 0v.66A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z",
  help: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 17h-2v-2h2v2Zm2.07-7.75-.9.92A3.4 3.4 0 0 0 13 15h-2v-.5a4 4 0 0 1 1.17-2.83l1.24-1.26A1.96 1.96 0 0 0 14 9a2 2 0 0 0-4 0H8a4 4 0 0 1 8 0 3.2 3.2 0 0 1-.93 2.25Z",
  gear: "M19.14 12.94a7.07 7.07 0 0 0 .06-.94 7.07 7.07 0 0 0-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54A.48.48 0 0 0 13.93 2h-3.84a.48.48 0 0 0-.48.41l-.36 2.54a7.36 7.36 0 0 0-1.62.94l-2.39-.96a.48.48 0 0 0-.59.22L2.73 8.47a.48.48 0 0 0 .12.61l2.03 1.58a7.4 7.4 0 0 0 0 1.88l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54c.05.24.25.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.48.48 0 0 0-.12-.61l-2.01-1.58ZM12 15.6a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2Z",
  search: "M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z",
  share:
    "M18,16.08C17.24,16.08 16.56,16.38 16.04,16.85L8.91,12.7C8.96,12.47 9,12.24 9,12C9,11.76 8.96,11.53 8.91,11.3L15.96,7.19C16.5,7.69 17.21,8 18,8C19.66,8 21,6.66 21,5C21,3.34 19.66,2 18,2C16.34,2 15,3.34 15,5C15,5.24 15.04,5.47 15.09,5.7L8.04,9.81C7.5,9.31 6.79,9 6,9C4.34,9 3,10.34 3,12C3,13.66 4.34,15 6,15C6.79,15 7.5,14.69 8.04,14.19L15.16,18.35C15.11,18.57 15.08,18.79 15.08,19C15.08,20.61 16.39,21.92 18,21.92C19.61,21.92 20.92,20.61 20.92,19C20.92,17.39 19.61,16.08 18,16.08Z",
  // The card's clock, exactly as the app draws it: the hands are a second
  // subpath cut out of the disc (Avalonia path strings fill even-odd).
  clock:
    "M11.99,2C6.47,2,2,6.48,2,12s4.47,10,9.99,10C17.52,22,22,17.52,22,12S17.52,2,11.99,2z M12.5,7H11v6l5.25,3.15l0.75-1.23l-4.5-2.67V7z",
  info: "M11,17H13V11H11V17M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4M11,9H13V7H11V9Z",
  effects: "M12,2L14.7,9.3L22,12L14.7,14.7L12,22L9.3,14.7L2,12L9.3,9.3L12,2Z",
  overlays:
    "M12,18.54L19.37,12.8L21,14.07L12,21.07L3,14.07L4.62,12.81L12,18.54M12,16L3,9L12,2L21,9L12,16M12,4.53L6.26,9L12,13.47L17.74,9L12,4.53Z",
  export: "M5,20H19V18H5V20M19,9H15V3H9V9H5L12,16L19,9Z",
  volume: "M3,9V15H7L12,20V4L7,9H3M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16.02C15.5,15.29 16.5,13.76 16.5,12M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23Z",
} as const;

export function Glyph({ d, className = icon }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className}>
      <path d={d} fillRule="evenodd" />
    </svg>
  );
}

// The title bar: the bare mark (no tile behind it), history buttons, the
// replay pill, the save-key chip, then whatever this view shows for status.
export function TitleBar({ refresh, children }: { refresh: boolean; children: ReactNode }) {
  return (
    <div className="flex h-11 items-center border-b border-[#1E2A33] bg-[#171F27] pl-3.5 pr-2">
      <Image src="/logo-mark.png" alt="" width={32} height={18} unoptimized className="h-[15px] w-auto" />
      <span className="ml-3 flex items-center text-[#8C98A7]">
        <span className="p-1"><Glyph d={paths.back} /></span>
        <span className="p-1 opacity-60"><Glyph d={paths.forward} /></span>
        {refresh ? <span className="ml-0.5 p-1"><Glyph d={paths.refresh} /></span> : null}
      </span>
      <span className="ml-4 flex h-[26px] items-center gap-1.5 rounded-[7px] border border-[#D85E61] bg-[#3A1E24] px-2.5 text-[12px] font-bold text-[#FF8A8F]">
        <span className="animate-pulse-soft h-[6px] w-[6px] rounded-full bg-[#D85E61]" />
        Recording
      </span>
      <span className="ml-2 flex h-[26px] items-center rounded-[7px] border border-[#42586B] bg-[#111C25] px-2.5 text-[12px] font-bold text-[#D7E2EF]">
        Insert
      </span>
      <span className="ml-3 h-5 w-px bg-[#2A3640]" />
      <div className="ml-3 flex min-w-0 flex-1 items-center text-[12px] text-[#93A6B8]">{children}</div>
      <span className="ml-3 flex items-center gap-4 pr-2 text-[#9FB2C6]">
        <Glyph d={paths.bell} className="h-4 w-4 fill-current" />
        <svg viewBox="0 0 24 24" aria-hidden className="ml-2 h-4 w-4 stroke-current" fill="none" strokeWidth={1.6}>
          <path d="M5 12h14" />
        </svg>
        <svg viewBox="0 0 24 24" aria-hidden className="h-3.5 w-3.5 stroke-current" fill="none" strokeWidth={1.6}>
          <rect x="4" y="4" width="16" height="16" />
        </svg>
        <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 stroke-current" fill="none" strokeWidth={1.6}>
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </span>
    </div>
  );
}

// The foot of the rail: the library drive's usage ring, help, settings.
export function RailFooter() {
  return (
    <div className="flex flex-col items-center gap-3 pb-3 text-[#8C98A7]">
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 36 36" aria-hidden className="h-7 w-7 -rotate-90">
          <circle cx="18" cy="18" r="15" fill="none" stroke="#26323D" strokeWidth="3" />
          <circle cx="18" cy="18" r="15" fill="none" stroke={ACCENT} strokeWidth="3" strokeDasharray="94.2" strokeDashoffset="0" />
        </svg>
        <span className="mt-1 text-[9px] font-bold text-[#D2DEEC]">41.6 GB</span>
        <span className="text-[8px] text-[#6B7C8C]">No Limit</span>
      </div>
      <Glyph d={paths.help} className="h-4 w-4 fill-current" />
      <Glyph d={paths.gear} className="h-4 w-4 fill-current" />
    </div>
  );
}
