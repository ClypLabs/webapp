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
      {/* Radial gradients, not blurred circles. A 160px blur on a 900px box has
          to be re-rasterised by the GPU on every frame it changes - and these
          are fixed, so they never leave the viewport. The gradient paints the
          same falloff once and then costs nothing to move. The boxes are larger
          than the old ones because a blur spread well past its element. */}
      {/* Top-left wash, warm side of the accent. */}
      <div className="ambience-blob animate-drift-a absolute -left-[14%] top-[-22%] h-[1040px] w-[1220px] bg-[radial-gradient(closest-side,rgba(16,185,129,0.13),transparent)]" />
      {/* Counterweight on the right, cooler, so the page is not lit evenly. */}
      <div className="ambience-blob animate-drift-b absolute -right-[20%] top-[18%] h-[980px] w-[1160px] bg-[radial-gradient(closest-side,rgba(45,212,191,0.09),transparent)]" />
      {/* Low and centred, to keep the lower half of the page from going flat. */}
      <div className="ambience-blob ambience-extra animate-drift-c absolute bottom-[-18%] left-[14%] h-[940px] w-[1200px] bg-[radial-gradient(closest-side,rgba(6,182,212,0.08),transparent)]" />
      {/* Faint fourth on its own timing, so no pair of blobs ever lines up. */}
      <div className="ambience-blob ambience-extra animate-drift-b absolute left-[30%] top-[48%] h-[820px] w-[920px] bg-[radial-gradient(closest-side,rgba(52,211,153,0.07),transparent)] [animation-duration:41s]" />

      {/* Grain. Breaks up the banding that large soft gradients produce on
          8-bit displays, and takes the plastic sheen off the flat areas. */}
      <div className="page-grain absolute inset-0" />
    </div>
  );
}
