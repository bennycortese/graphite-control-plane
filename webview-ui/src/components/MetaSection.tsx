interface MetaSectionProps {
  trunk: string;
  currentBranch: string;
}

export function MetaSection({ trunk, currentBranch }: MetaSectionProps) {
  return (
    <div
      className="flex gap-5 px-[18px] py-2.5 text-[11px]"
      style={{ color: "var(--muted)" }}
    >
      <div>
        <span
          className="mr-1.5 text-[9px] font-semibold uppercase"
          style={{ opacity: 0.5, letterSpacing: "0.08em" }}
        >
          trunk
        </span>
        <span>{trunk || "\u2014"}</span>
      </div>
      <div>
        <span
          className="mr-1.5 text-[9px] font-semibold uppercase"
          style={{ opacity: 0.5, letterSpacing: "0.08em" }}
        >
          head
        </span>
        <span>{currentBranch || "\u2014"}</span>
      </div>
    </div>
  );
}
