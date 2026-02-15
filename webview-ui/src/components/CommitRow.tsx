import React, { useCallback } from "react";
import type { CommitAction, CommitInfo } from "../types";
import { cn } from "../lib/utils";

interface CommitRowProps {
  action: CommitAction;
  commit: CommitInfo | undefined;
  index: number;
  branchName: string;
  onToggleAction: (
    branchName: string,
    index: number,
    action: "fixup" | "drop"
  ) => void;
  onReorder: (branchName: string, fromIndex: number, toIndex: number) => void;
}

export function CommitRow({
  action,
  commit,
  index,
  branchName,
  onToggleAction,
  onReorder,
}: CommitRowProps) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      e.currentTarget.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("application/commit-index", String(index));
      e.dataTransfer.setData("application/commit-branch", branchName);
    },
    [index, branchName]
  );

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    e.currentTarget.classList.remove("dragging");
    document
      .querySelectorAll(".commit-drop-above, .commit-drop-below")
      .forEach((el) => {
        el.classList.remove("commit-drop-above", "commit-drop-below");
      });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes("application/commit-branch")) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    document
      .querySelectorAll(".commit-drop-above, .commit-drop-below")
      .forEach((el) => {
        el.classList.remove("commit-drop-above", "commit-drop-below");
      });
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      e.currentTarget.classList.add("commit-drop-above");
    } else {
      e.currentTarget.classList.add("commit-drop-below");
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.currentTarget.classList.remove(
      "commit-drop-above",
      "commit-drop-below"
    );
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      document
        .querySelectorAll(".commit-drop-above, .commit-drop-below")
        .forEach((el) => {
          el.classList.remove("commit-drop-above", "commit-drop-below");
        });

      const fromBranch = e.dataTransfer.getData("application/commit-branch");
      const fromIndex = parseInt(
        e.dataTransfer.getData("application/commit-index"),
        10
      );
      if (fromBranch !== branchName) return;
      if (fromIndex === index) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      let insertAt = e.clientY < midY ? index : index + 1;
      if (fromIndex < insertAt) insertAt--;

      onReorder(branchName, fromIndex, insertAt);
    },
    [branchName, index, onReorder]
  );

  return (
    <div
      className={cn(
        "commit-row-item flex items-center gap-[7px] rounded-[5px] px-[7px] py-[5px] text-[11px] cursor-default",
        "transition-[background] duration-[0.15s] ease",
        "hover:bg-[var(--surface-hover)]",
        action.action === "fixup" && "opacity-60",
        action.action === "drop" && "opacity-35"
      )}
      data-index={index}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag handle */}
      <span
        className="commit-drag-handle shrink-0 cursor-grab select-none text-[10px] opacity-0 transition-opacity duration-[0.15s] ease"
        style={{ color: "var(--muted)" }}
      >
        &#x2630;
      </span>

      {/* SHA badge */}
      <span
        className={cn(
          "shrink-0 rounded px-1.5 py-[1px] font-mono text-[10px]",
          action.action === "fixup" &&
            "bg-[var(--warm-soft)] border-[rgba(240,179,82,0.25)] text-[var(--warm)]",
          action.action === "drop" &&
            "bg-[var(--signal-bad-soft)] border-[rgba(248,81,73,0.25)] text-[var(--signal-bad)]",
          action.action === "pick" &&
            "text-[var(--muted-strong)]"
        )}
        style={
          action.action === "pick"
            ? {
                background: "var(--surface)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                letterSpacing: "0.03em",
              }
            : {
                border:
                  action.action === "fixup"
                    ? "1px solid rgba(240, 179, 82, 0.25)"
                    : "1px solid rgba(248, 81, 73, 0.25)",
                letterSpacing: "0.03em",
              }
        }
      >
        {action.sha.substring(0, 7)}
      </span>

      {/* Message */}
      <span
        className={cn(
          "min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap",
          action.action === "drop"
            ? "line-through text-[var(--muted)]"
            : "text-[var(--foreground)]"
        )}
      >
        {commit?.message ?? ""}
      </span>

      {/* Action buttons */}
      <span
        className={cn(
          "commit-action-btns flex shrink-0 gap-[3px] opacity-0 transition-opacity duration-[0.15s] ease",
          (action.action === "fixup" || action.action === "drop") && "!opacity-100"
        )}
      >
        <button
          className={cn(
            "flex h-5 w-[22px] cursor-pointer items-center justify-center rounded border p-0 text-[10px] font-semibold transition-all duration-[0.15s] ease",
            action.action === "fixup"
              ? "bg-[var(--warm-soft)] text-[var(--warm)]"
              : "bg-transparent text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          )}
          style={{
            borderColor:
              action.action === "fixup"
                ? "rgba(240, 179, 82, 0.35)"
                : "rgba(255, 255, 255, 0.06)",
            boxShadow:
              action.action === "fixup"
                ? "0 0 8px rgba(240, 179, 82, 0.1)"
                : undefined,
          }}
          title={
            action.action === "fixup"
              ? "Undo squash"
              : "Squash into previous commit"
          }
          onClick={(e) => {
            e.stopPropagation();
            onToggleAction(branchName, index, "fixup");
          }}
        >
          S
        </button>
        <button
          className={cn(
            "flex h-5 w-[22px] cursor-pointer items-center justify-center rounded border p-0 text-[10px] font-semibold transition-all duration-[0.15s] ease",
            action.action === "drop"
              ? "bg-[var(--signal-bad-soft)] text-[var(--signal-bad)]"
              : "bg-transparent text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
          )}
          style={{
            borderColor:
              action.action === "drop"
                ? "rgba(248, 81, 73, 0.35)"
                : "rgba(255, 255, 255, 0.06)",
            boxShadow:
              action.action === "drop"
                ? "0 0 8px rgba(248, 81, 73, 0.1)"
                : undefined,
          }}
          title={action.action === "drop" ? "Undo drop" : "Drop this commit"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleAction(branchName, index, "drop");
          }}
        >
          &times;
        </button>
      </span>
    </div>
  );
}
