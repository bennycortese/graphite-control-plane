import React, { useCallback } from "react";
import type { BranchInfo, CommitAction, CommitInfo } from "../types";
import { cn } from "../lib/utils";
import { CommitList } from "./CommitList";

interface BranchNodeProps {
  branch: BranchInfo;
  index: number;
  expanded: boolean;
  commits: CommitInfo[] | undefined;
  pending: CommitAction[] | undefined;
  hasChanges: boolean;
  onCheckout: (branch: string) => void;
  onToggleExpand: (branchName: string, parentName?: string) => void;
  onToggleAction: (
    branchName: string,
    index: number,
    action: "fixup" | "drop"
  ) => void;
  onReorderCommit: (
    branchName: string,
    fromIndex: number,
    toIndex: number
  ) => void;
  onApplyCommits: (branchName: string) => void;
  onResetCommits: (branchName: string) => void;
}

export function BranchNode({
  branch,
  index,
  expanded,
  commits,
  pending,
  hasChanges,
  onCheckout,
  onToggleExpand,
  onToggleAction,
  onReorderCommit,
  onApplyCommits,
  onResetCommits,
}: BranchNodeProps) {
  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      // Don't start branch drag if dragging from a commit row
      if ((e.target as HTMLElement).closest?.(".commit-row-item")) return;
      e.currentTarget.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/branch-name", branch.name);
    },
    [branch.name]
  );

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove("dragging");
    document.querySelectorAll(".drop-above, .drop-below").forEach((el) => {
      el.classList.remove("drop-above", "drop-below");
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes("application/branch-name")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    document.querySelectorAll(".drop-above, .drop-below").forEach((el) => {
      el.classList.remove("drop-above", "drop-below");
    });
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      e.currentTarget.classList.add("drop-above");
    } else {
      e.currentTarget.classList.add("drop-below");
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove("drop-above", "drop-below");
  }, []);

  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      if (branch.isCurrent || branch.isTrunk) return;
      // Don't checkout if clicking on interactive elements
      const target = e.target as HTMLElement;
      if (
        target.closest(".expand-toggle") ||
        target.closest(".commits-container") ||
        target.closest(".branch-drag-handle") ||
        target.closest(".commit-row-item")
      ) {
        return;
      }
      onCheckout(branch.name);
    },
    [branch, onCheckout]
  );

  // Sub info line
  const subParts: string[] = [];
  if (branch.commitSha) subParts.push(branch.commitSha.substring(0, 7));
  if (branch.commitMessage) subParts.push(branch.commitMessage);
  if (branch.timeAgo) subParts.push(branch.timeAgo);

  // Review badge label mapping
  const reviewLabels: Record<string, string> = {
    approved: "Approved",
    changes_requested: "Changes Requested",
    review_required: "Review Required",
  };

  return (
    <div
      className={cn(
        "gcp-node relative mr-1.5 mb-[1px] flex flex-row items-center gap-1.5 rounded-lg px-1.5 py-[7px] pl-3 transition-all duration-[0.25s]",
        branch.isCurrent &&
          "border border-[rgba(124,92,252,0.15)] -ml-[1px] mr-[5px]",
        branch.isTrunk && "cursor-default opacity-55",
        !branch.isTrunk && !branch.isCurrent && "cursor-pointer"
      )}
      style={{
        ...(branch.isCurrent
          ? {
              background:
                "linear-gradient(135deg, var(--accent-soft), rgba(124, 92, 252, 0.04))",
            }
          : {}),
        animation: `fadeSlideIn var(--duration-slow) var(--ease-out) both`,
        animationDelay: `${index * 40}ms`,
      }}
      data-branch={branch.name}
      draggable={!branch.isTrunk}
      onDragStart={!branch.isTrunk ? handleDragStart : undefined}
      onDragEnd={!branch.isTrunk ? handleDragEnd : undefined}
      onDragOver={!branch.isTrunk ? handleDragOver : undefined}
      onDragLeave={!branch.isTrunk ? handleDragLeave : undefined}
      onMouseEnter={(e) => {
        if (!branch.isTrunk && !branch.isCurrent) {
          e.currentTarget.style.backgroundColor = "var(--surface-hover)";
        }
        if (branch.isCurrent) {
          e.currentTarget.style.background =
            "linear-gradient(135deg, rgba(124, 92, 252, 0.16), rgba(124, 92, 252, 0.06))";
          e.currentTarget.style.borderColor = "rgba(124, 92, 252, 0.25)";
        }
      }}
      onMouseLeave={(e) => {
        if (!branch.isTrunk && !branch.isCurrent) {
          e.currentTarget.style.backgroundColor = "";
        }
        if (branch.isCurrent) {
          e.currentTarget.style.background =
            "linear-gradient(135deg, var(--accent-soft), rgba(124, 92, 252, 0.04))";
          e.currentTarget.style.borderColor = "rgba(124, 92, 252, 0.15)";
        }
      }}
    >
      {/* Commit avatar dot */}
      <div
        className={cn(
          "absolute z-[3] shrink-0 rounded-full",
          branch.isCurrent && "h-3 w-3 -left-4",
          branch.isTrunk && "h-2 w-2 rounded-sm -left-[13px]",
          !branch.isCurrent && !branch.isTrunk && "h-2.5 w-2.5 -left-[15px]"
        )}
        style={{
          top: "50%",
          transform: "translateY(-50%)",
          border: `2px solid var(--background)`,
          backgroundColor: branch.isCurrent
            ? "var(--accent)"
            : branch.isTrunk
              ? "rgba(255, 255, 255, 0.18)"
              : "var(--muted)",
          boxShadow: branch.isCurrent
            ? "0 0 0 3px var(--accent-soft), 0 0 10px var(--accent-glow)"
            : undefined,
        }}
      />

      {/* Content area */}
      <div
        className="flex min-w-0 flex-1 flex-col gap-[3px] px-1.5 py-[3px]"
        style={{
          cursor:
            !branch.isCurrent && !branch.isTrunk ? "pointer" : "default",
        }}
        onClick={handleContentClick}
      >
        {/* Header row */}
        <div className="flex flex-row flex-wrap items-center gap-1.5">
          <div className="flex min-w-0 flex-1 items-center gap-[7px]">
            {/* Drag handle */}
            {!branch.isTrunk && (
              <span
                className="branch-drag-handle shrink-0 cursor-grab select-none text-[11px] opacity-0 transition-opacity duration-[0.15s] ease"
                style={{ color: "var(--muted)" }}
                title="Drag to reorder in stack"
              >
                &#x2630;
              </span>
            )}

            {/* Expand/collapse toggle */}
            {!branch.isTrunk && (
              <span
                className="expand-toggle w-3.5 shrink-0 cursor-pointer select-none text-center text-[9px] transition-[color] duration-[0.15s] ease hover:text-[var(--accent-text)]"
                style={{ color: "var(--muted)" }}
                title={expanded ? "Collapse commits" : "Expand commits"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand(branch.name, branch.parentName);
                }}
              >
                {expanded ? "\u25BC" : "\u25B6"}
              </span>
            )}

            {/* Branch name */}
            <span
              className={cn(
                "max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap text-[12.5px]",
                branch.isCurrent
                  ? "font-medium text-white"
                  : "font-normal"
              )}
              style={{
                color: branch.isCurrent
                  ? "#fff"
                  : "var(--foreground)",
                letterSpacing: "-0.01em",
              }}
            >
              {branch.name}
            </span>

            {/* You are here */}
            {branch.isCurrent && (
              <span
                className="ml-2 whitespace-nowrap rounded-full px-2 py-[1px] text-[10px] font-semibold"
                style={{
                  color: "var(--accent-text)",
                  background: "var(--accent-soft)",
                  border: "1px solid rgba(124, 92, 252, 0.2)",
                  letterSpacing: "0.02em",
                }}
              >
                You are here
              </span>
            )}
          </div>

          {/* Badges */}
          <span className="ml-auto flex shrink-0 items-center gap-[5px]">
            {branch.isTrunk && (
              <span
                className="whitespace-nowrap rounded-[5px] px-2 py-[2px] text-[9px] font-semibold uppercase"
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  color: "var(--muted)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  letterSpacing: "0.06em",
                }}
              >
                TRUNK
              </span>
            )}

            {branch.pr && (
              <span
                className="whitespace-nowrap rounded-full px-[9px] py-[2px] text-[10px] font-semibold text-white"
                style={{
                  background:
                    branch.pr.status === "open"
                      ? "var(--gh-open-bg)"
                      : branch.pr.status === "merged"
                        ? "var(--gh-merged-bg)"
                        : branch.pr.status === "draft"
                          ? "var(--gh-draft-bg)"
                          : "var(--gh-closed-bg)",
                  boxShadow: "var(--shadow-sm)",
                  letterSpacing: "0.01em",
                }}
              >
                #{branch.pr.number}{" "}
                {branch.pr.status.charAt(0).toUpperCase() +
                  branch.pr.status.slice(1)}
              </span>
            )}

            {branch.pr?.reviewStatus && (
              <span
                className="whitespace-nowrap rounded-full px-2 py-[2px] text-[10px] font-semibold"
                style={{
                  background:
                    branch.pr.reviewStatus === "approved"
                      ? "var(--signal-good)"
                      : branch.pr.reviewStatus === "changes_requested"
                        ? "var(--signal-bad)"
                        : "rgba(232, 200, 56, 0.85)",
                  color:
                    branch.pr.reviewStatus === "review_required"
                      ? "#1a1a1a"
                      : "var(--gh-badge-fg)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {reviewLabels[branch.pr.reviewStatus] ||
                  branch.pr.reviewStatus}
              </span>
            )}
          </span>
        </div>

        {/* Sub info line */}
        {subParts.length > 0 && (
          <div
            className="overflow-hidden text-ellipsis whitespace-nowrap pt-[1px] text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            {subParts.join(" \u2022 ")}
          </div>
        )}

        {/* Commits container */}
        {!branch.isTrunk && (
          <div className="commits-container">
            <CommitList
              branchName={branch.name}
              expanded={expanded}
              commits={commits}
              pending={pending}
              hasChanges={hasChanges}
              onToggleAction={onToggleAction}
              onReorder={onReorderCommit}
              onApply={onApplyCommits}
              onReset={onResetCommits}
            />
          </div>
        )}
      </div>
    </div>
  );
}
