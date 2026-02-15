interface CommitActionsBarProps {
  branchName: string;
  onApply: (branchName: string) => void;
  onReset: (branchName: string) => void;
}

export function CommitActionsBar({
  branchName,
  onApply,
  onReset,
}: CommitActionsBarProps) {
  return (
    <div
      className="mt-2.5 flex gap-1.5 pt-2.5"
      style={{ borderTop: "1px solid var(--divider)" }}
    >
      <button
        className="gcp-btn text-[11px] font-semibold"
        style={{
          background: "var(--signal-good-soft)",
          borderColor: "rgba(52, 208, 88, 0.2)",
          color: "var(--signal-good)",
        }}
        onClick={(e) => {
          e.stopPropagation();
          onApply(branchName);
        }}
      >
        Apply Changes
      </button>
      <button
        className="gcp-btn text-[11px]"
        onClick={(e) => {
          e.stopPropagation();
          onReset(branchName);
        }}
      >
        Reset
      </button>
    </div>
  );
}
