// A single page-wide atmosphere layer, rather than a glow bolted onto each
// section. Sections previously lit themselves, which left obvious dark bands
// between them - light does not stop at a section boundary.
//
// Fixed rather than absolute: the blobs stay put while the page scrolls past,
// so the colour behind the content shifts gradually instead of travelling with
// it. Everything here is decorative, sits behind all content, and never takes a
// pointer event.
export default function Ambience() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Top-left wash, warm side of the accent. */}
      <div className="ambience-blob animate-drift-a absolute -left-[10%] top-[-15%] h-[720px] w-[900px] rounded-full bg-emerald-500/[0.10] blur-[160px]" />
      {/* Counterweight on the right, cooler, so the page is not lit evenly. */}
      <div className="ambience-blob animate-drift-b absolute -right-[15%] top-[25%] h-[640px] w-[820px] rounded-full bg-teal-400/[0.07] blur-[170px]" />
      {/* Low and centred, to keep the lower half of the page from going flat. */}
      <div className="ambience-blob ambience-extra animate-drift-c absolute bottom-[-10%] left-[20%] h-[600px] w-[860px] rounded-full bg-cyan-500/[0.06] blur-[170px]" />
      {/* Faint fourth on its own timing, so no pair of blobs ever lines up. */}
      <div className="ambience-blob ambience-extra animate-drift-b absolute left-[35%] top-[55%] h-[520px] w-[620px] rounded-full bg-emerald-400/[0.05] blur-[150px] [animation-duration:41s]" />

      {/* Grain. Breaks up the banding that large soft gradients produce on
          8-bit displays, and takes the plastic sheen off the flat areas. */}
      <div className="page-grain absolute inset-0" />
    </div>
  );
}
