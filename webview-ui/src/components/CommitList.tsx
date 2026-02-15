import { useRef, useEffect, useCallback } from "react";
import type { CommitAction, CommitInfo } from "../types";
import { CommitRow } from "./CommitRow";
import { CommitActionsBar } from "./CommitActionsBar";

interface CommitListProps {
  branchName: string;
  expanded: boolean;
  commits: CommitInfo[] | undefined;
  pending: CommitAction[] | undefined;
  hasChanges: boolean;
  onToggleAction: (
    branchName: string,
    index: number,
    action: "fixup" | "drop"
  ) => void;
  onReorder: (branchName: string, fromIndex: number, toIndex: number) => void;
  onApply: (branchName: string) => void;
  onReset: (branchName: string) => void;
}

export function CommitList({
  branchName,
  expanded,
  commits,
  pending,
  hasChanges,
  onToggleAction,
  onReorder,
  onApply,
  onReset,
}: CommitListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevExpanded = useRef(expanded);

  // Smooth expand/collapse animation
  const animate = useCallback((el: HTMLDivElement, expanding: boolean) => {
    if (expanding) {
      el.style.display = "block";
      el.style.height = "0px";
      el.style.overflow = "hidden";
      el.style.opacity = "0";
      el.style.transition =
        "height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease";
      requestAnimationFrame(() => {
        el.style.height = el.scrollHeight + "px";
        el.style.opacity = "1";
      });
      const onEnd = () => {
        el.style.height = "";
        el.style.overflow = "";
        el.style.transition = "";
        el.style.opacity = "";
        el.removeEventListener("transitionend", onEnd);
      };
      el.addEventListener("transitionend", onEnd, { once: true });
    } else {
      el.style.height = el.scrollHeight + "px";
      el.style.overflow = "hidden";
      el.style.transition =
        "height 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease";
      el.style.opacity = "1";
      requestAnimationFrame(() => {
        el.style.height = "0px";
        el.style.opacity = "0";
      });
      const onEnd = () => {
        el.style.display = "none";
        el.style.height = "";
        el.style.overflow = "";
        el.style.transition = "";
        el.style.opacity = "";
        el.removeEventListener("transitionend", onEnd);
      };
      el.addEventListener("transitionend", onEnd, { once: true });
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (expanded !== prevExpanded.current) {
      animate(el, expanded);
      prevExpanded.current = expanded;
    }
  }, [expanded, animate]);

  // Set initial display state
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.display = expanded ? "block" : "none";
    prevExpanded.current = expanded;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loading = expanded && !commits;
  const empty = expanded && commits && commits.length === 0;

  return (
    <div
      ref={containerRef}
      className="mt-2 pt-2"
      style={{ borderTop: "1px solid var(--divider)", overflow: "hidden" }}
    >
      {loading && (
        <div
          className="py-1.5 text-[11px] italic"
          style={{ color: "var(--muted)" }}
        >
          Loading commits...
        </div>
      )}

      {empty && (
        <div
          className="py-1.5 text-[11px] italic"
          style={{ color: "var(--muted)" }}
        >
          No commits found
        </div>
      )}

      {pending && pending.length > 0 && (
        <div className="flex flex-col gap-[1px]">
          {pending.map((action, i) => (
            <CommitRow
              key={action.sha}
              action={action}
              commit={commits?.find((c) => c.sha === action.sha)}
              index={i}
              branchName={branchName}
              onToggleAction={onToggleAction}
              onReorder={onReorder}
            />
          ))}
        </div>
      )}

      {hasChanges && (
        <CommitActionsBar
          branchName={branchName}
          onApply={onApply}
          onReset={onReset}
        />
      )}
    </div>
  );
}
