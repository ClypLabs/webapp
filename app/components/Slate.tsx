// Small pieces of the page's broadcast furniture, shared between sections.

// A chapter marker at the head of each section, the way an edit timeline
// marks one: where it sits, a rule, and its name. The timecodes are the
// section's place on the page read as a programme, not a real duration.
export function Chapter({ tc, label }: { tc: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="h-0 w-0 border-x-[5px] border-t-[7px] border-x-transparent border-t-rec" />
      <span className="slate text-dim">{tc}</span>
      <span aria-hidden className="h-px flex-1 bg-rule" />
      <span className="slate">{label}</span>
    </div>
  );
}
