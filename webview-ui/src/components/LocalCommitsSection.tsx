import type { CommitInfo } from "../types";

interface LocalCommitsSectionProps {
  commits: CommitInfo[];
  onCreateBranch: () => void;
}

export function LocalCommitsSection({
  commits,
  onCreateBranch,
}: LocalCommitsSectionProps) {
  if (commits.length === 0) return null;

  return (
    <div
      className="mx-4 mb-3.5 mt-2.5 rounded-xl p-3 transition-[border-color] duration-[0.25s]"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--divider)",
      }}
    >
      {/* Header */}
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className="text-[10px] font-bold uppercase"
          style={{ color: "var(--muted-strong)", letterSpacing: "0.06em" }}
        >
          Local Commits
        </span>
        <span
          className="min-w-[18px] rounded-full px-[7px] py-[1px] text-center text-[10px] font-bold"
          style={{
            background: "var(--accent-soft)",
            color: "var(--accent-text)",
          }}
        >
          {commits.length}
        </span>
      </div>

      {/* Commit list */}
      <div className="mb-2.5 flex flex-col gap-[1px]">
        {commits.map((commit) => (
          <div
            key={commit.sha}
            className="flex items-center gap-[7px] rounded-[5px] px-1.5 py-1 text-[11px] transition-[background] duration-[0.15s] ease hover:bg-[var(--surface-hover)]"
          >
            <span
              className="shrink-0 rounded px-1.5 py-[1px] font-mono text-[10px]"
              style={{
                background: "var(--surface)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                color: "var(--muted-strong)",
                letterSpacing: "0.03em",
              }}
            >
              {commit.sha.substring(0, 7)}
            </span>
            <span
              className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap"
              style={{ color: "var(--foreground)" }}
            >
              {commit.message}
            </span>
          </div>
        ))}
      </div>

      {/* Add to Stack button */}
      <button
        className="gcp-btn gcp-btn-primary w-full justify-center text-xs font-semibold"
        style={{ height: 32 }}
        onClick={onCreateBranch}
      >
        Add to Stack
      </button>
    </div>
  );
}
