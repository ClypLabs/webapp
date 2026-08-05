// The rail's tool glyphs, traced to match the app's own sidebar. Shared by the
// library and editor graphics so the two windows cannot drift apart.

export type RailIconName =
  | "grid"
  | "pencil"
  | "bolt"
  | "clapper"
  | "download"
  | "back"
  | "forward"
  | "refresh"
  | "gear";

export default function RailIcon({ name }: { name: RailIconName }) {
  const paths: Record<string, React.ReactNode> = {
    grid: [0, 1, 2].map((row) =>
      [0, 1, 2].map((col) => (
        <rect
          key={`${row}-${col}`}
          x={5 + col * 5}
          y={5 + row * 5}
          width="3"
          height="3"
          rx="1"
        />
      )),
    ),
    pencil: <path d="M4 17.2V20h2.8L16 10.8 13.2 8 4 17.2ZM19.6 8.6a1 1 0 0 0 0-1.4l-1.8-1.8a1 1 0 0 0-1.4 0L15 6.8 17.2 9l1.4-1.4Z" />,
    bolt: <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2Z" />,
    clapper: <path d="M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8Zm.4-3.6 17 2.2-.3 1.4-17-2.2.3-1.4ZM7 8.6l1.6-2.2M12 9l1.6-2.2M17 9.4l1.6-2.2" />,
    download: <path d="M12 3v10.2l3.6-3.6 1.4 1.4L12 16 7 11l1.4-1.4 3.6 3.6V3h-1Zm-7 16h14v2H5v-2Z" />,
    back: <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    forward: <path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    refresh: <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
    gear: <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm9 4a9 9 0 0 0-.2-1.7l2-1.5-2-3.4-2.3 1a9 9 0 0 0-3-1.7L15 2H9l-.5 2.7a9 9 0 0 0-3 1.7l-2.3-1-2 3.4 2 1.5a9 9 0 0 0 0 3.4l-2 1.5 2 3.4 2.3-1a9 9 0 0 0 3 1.7L9 22h6l.5-2.7a9 9 0 0 0 3-1.7l2.3 1 2-3.4-2-1.5c.13-.55.2-1.12.2-1.7Z" />,
  };

  const stroked = name === "clapper";
  const selfStroked = name === "back" || name === "forward" || name === "refresh";

  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className="h-4 w-4"
      fill={stroked || selfStroked ? "none" : "currentColor"}
      stroke={stroked ? "currentColor" : undefined}
      strokeWidth={stroked ? 1.6 : undefined}
      strokeLinecap="round"
    >
      {paths[name]}
    </svg>
  );
}
