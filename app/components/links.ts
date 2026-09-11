// Outbound links shared by the header, hero, download section and footer.
// Plain module rather than exports hanging off Header.tsx: that file is a
// client component, and constants belong somewhere any component can import
// without dragging a client boundary along.

export const GITHUB_URL = "https://github.com/ClypLabs/ClypDat";
export const RELEASES_URL = `${GITHUB_URL}/releases/latest`;
export const ISSUES_URL = `${GITHUB_URL}/issues`;
export const DISCORD_URL = "https://discord.gg/jt3eJf238t";
export const X_URL = "https://x.com/ClypDat";
// Better Stack status page. api.clypdat.xyz/v1/status stays as the JSON check
// the API page reads; this is the page people are sent to.
export const STATUS_URL = "https://status.clypdat.xyz";

// Own-domain download URL, so it survives GitHub being unreachable - see
// app/download/[asset]/route.ts.
export const DOWNLOAD_URL = "/download/ClypDat-Setup.exe";

export const WINGET_ID = "ClypLabs.ClypDat";

export const socials = [
  {
    href: X_URL,
    label: "ClypDat on X",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.657l-5.214-6.817-5.963 6.817H1.684l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z",
  },
  {
    href: DISCORD_URL,
    label: "Join ClypDat on Discord",
    path: "M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.027c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.2 13.2 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.794 8.18 1.794 12.061 0a.074.074 0 0 1 .078.01c.12.099.246.198.373.292a.077.077 0 0 1-.007.127c-.598.35-1.22.648-1.873.891a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.077.077 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.548-13.66a.061.061 0 0 0-.033-.03ZM8.02 15.33c-1.18 0-2.156-1.085-2.156-2.419 0-1.333.956-2.418 2.156-2.418 1.21 0 2.175 1.095 2.156 2.418 0 1.334-.956 2.419-2.156 2.419Zm7.974 0c-1.18 0-2.156-1.085-2.156-2.419 0-1.333.956-2.418 2.156-2.418 1.21 0 2.175 1.095 2.156 2.418 0 1.334-.956 2.419-2.156 2.419Z",
  },
  {
    href: GITHUB_URL,
    label: "ClypDat source on GitHub",
    path: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12",
  },
];

// Hash links are written against "/" so they still land on the right section
// from the policy pages, not on a fragment of the page you are already on.
export const sectionLinks = [
  { href: "/#features", label: "Features" },
  { href: "/#editor", label: "Editor" },
  { href: "/#faq", label: "FAQ" },
  { href: "/#download", label: "Download" },
];
