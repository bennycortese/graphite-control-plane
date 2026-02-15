import React, { useCallback } from "react";
import type { BranchInfo, CommitAction, CommitInfo } from "../types";
import { BranchNode } from "./BranchNode";

interface BranchListProps {
  branches: BranchInfo[];
  expandedBranches: Set<string>;
  commitsCache: Map<string, CommitInfo[]>;
  pendingEdits: Map<string, CommitAction[]>;
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
  onReorderBranches: (order: string[]) => void;
  hasChanges: (branchName: string) => boolean;
}

export function BranchList({
  branches,
  expandedBranches,
  commitsCache,
  pendingEdits,
  onCheckout,
  onToggleExpand,
  onToggleAction,
  onReorderCommit,
  onApplyCommits,
  onResetCommits,
  onReorderBranches,
  hasChanges,
}: BranchListProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      document.querySelectorAll(".drop-above, .drop-below").forEach((el) => {
        el.classList.remove("drop-above", "drop-below");
      });

      const sourceBranch = e.dataTransfer.getData("application/branch-name");
      if (!sourceBranch) return;

      // Find the target node
      const target = (e.target as HTMLElement).closest?.(
        "[data-branch]"
      ) as HTMLElement | null;
      if (!target) return;
      const targetBranch = target.dataset.branch;
      if (!targetBranch || sourceBranch === targetBranch) return;

      const currentOrder = branches.map((b) => b.name);
      const sourceIdx = currentOrder.indexOf(sourceBranch);
      const targetIdx = currentOrder.indexOf(targetBranch);
      if (sourceIdx === -1 || targetIdx === -1) return;

      const newOrder = [...currentOrder];
      newOrder.splice(sourceIdx, 1);

      const rect = target.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      let insertIdx = newOrder.indexOf(targetBranch);
      if (e.clientY >= midY) insertIdx++;
      newOrder.splice(insertIdx, 0, sourceBranch);

      // Send bottom-up (trunk first)
      const bottomUp = [...newOrder].reverse();
      onReorderBranches(bottomUp);
    },
    [branches, onReorderBranches]
  );

  if (!branches || branches.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center px-3 py-[60px] text-center text-[13px] font-medium"
        style={{ color: "var(--muted)", letterSpacing: "0.01em" }}
      >
        No branches found
      </div>
    );
  }

  return (
    <ul className="m-0 flex min-w-[300px] list-none flex-col p-0">
      <div
        className="relative mb-5 ml-7 mt-2.5 flex flex-col gap-0"
        style={{
          /* Vertical branch line via pseudo-element is in CSS below */
        }}
        onDrop={handleDrop}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("application/branch-name")) {
            e.preventDefault();
          }
        }}
      >
        {/* Vertical branch line */}
        <div
          className="pointer-events-none absolute z-[1] w-[2px] rounded-[1px] -left-2.5"
          style={{
            top: "18px",
            bottom: "8px",
            background:
              "linear-gradient(180deg, var(--accent) 0%, rgba(124, 92, 252, 0.3) 50%, rgba(124, 92, 252, 0.08) 100%)",
          }}
        />

        {branches.map((branch, i) => (
          <BranchNode
            key={branch.name}
            branch={branch}
            index={i}
            expanded={expandedBranches.has(branch.name)}
            commits={commitsCache.get(branch.name)}
            pending={pendingEdits.get(branch.name)}
            hasChanges={hasChanges(branch.name)}
            onCheckout={onCheckout}
            onToggleExpand={onToggleExpand}
            onToggleAction={onToggleAction}
            onReorderCommit={onReorderCommit}
            onApplyCommits={onApplyCommits}
            onResetCommits={onResetCommits}
          />
        ))}
      </div>
    </ul>
  );
}
