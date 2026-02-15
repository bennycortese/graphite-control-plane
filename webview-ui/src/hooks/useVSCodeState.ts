import { useState, useEffect, useCallback, useRef } from "react";
import type {
  StackState,
  CommitInfo,
  CommitAction,
  ExtensionMessage,
} from "../types";
import { vscodeApi } from "../vscode";

export function useVSCodeState() {
  const [state, setState] = useState<StackState | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(
    () => new Set()
  );
  const [commitsCache, setCommitsCache] = useState<
    Map<string, CommitInfo[]>
  >(() => new Map());
  const [pendingEdits, setPendingEdits] = useState<
    Map<string, CommitAction[]>
  >(() => new Map());

  // Keep refs for use in callbacks without stale closures
  const commitsCacheRef = useRef(commitsCache);
  commitsCacheRef.current = commitsCache;
  const pendingEditsRef = useRef(pendingEdits);
  pendingEditsRef.current = pendingEdits;

  // Signal ready on mount
  useEffect(() => {
    vscodeApi.postMessage({ type: "ready" });
  }, []);

  // Listen for messages from extension
  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionMessage>) => {
      const msg = event.data;
      switch (msg.type) {
        case "state":
          // Clear caches for fresh data after actions
          setCommitsCache(new Map());
          setPendingEdits(new Map());
          setState(msg.payload);
          setLoading(false);
          break;
        case "loading":
          setLoading(msg.payload);
          break;
        case "commits": {
          const { branch, commits } = msg.payload;
          setCommitsCache((prev) => {
            const next = new Map(prev);
            next.set(branch, commits);
            return next;
          });
          setPendingEdits((prev) => {
            const next = new Map(prev);
            next.set(
              branch,
              commits.map((c) => ({ sha: c.sha, action: "pick" as const }))
            );
            return next;
          });
          break;
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Action dispatchers
  const refresh = useCallback(() => {
    vscodeApi.postMessage({ type: "refresh" });
  }, []);

  const sync = useCallback(() => {
    vscodeApi.postMessage({ type: "sync" });
  }, []);

  const submitStack = useCallback(() => {
    vscodeApi.postMessage({ type: "submitStack" });
  }, []);

  const restack = useCallback(() => {
    vscodeApi.postMessage({ type: "restack" });
  }, []);

  const checkout = useCallback((branch: string) => {
    vscodeApi.postMessage({ type: "checkout", payload: { branch } });
  }, []);

  const createBranch = useCallback(() => {
    vscodeApi.postMessage({ type: "createBranch" });
  }, []);

  const reorderBranches = useCallback((order: string[]) => {
    vscodeApi.postMessage({ type: "reorderBranches", payload: { order } });
  }, []);

  // Commit helpers
  const toggleExpand = useCallback(
    (branchName: string, parentName?: string) => {
      setExpandedBranches((prev) => {
        const next = new Set(prev);
        if (next.has(branchName)) {
          next.delete(branchName);
        } else {
          next.add(branchName);
          // Request commits if not cached
          if (!commitsCacheRef.current.has(branchName)) {
            vscodeApi.postMessage({
              type: "getCommits",
              payload: { branch: branchName, parent: parentName || "" },
            });
          }
        }
        return next;
      });
    },
    []
  );

  const toggleCommitAction = useCallback(
    (branchName: string, index: number, targetAction: "fixup" | "drop") => {
      setPendingEdits((prev) => {
        const next = new Map(prev);
        const pending = [...(next.get(branchName) || [])];
        if (!pending[index]) return prev;

        pending[index] = {
          ...pending[index],
          action:
            pending[index].action === targetAction ? "pick" : targetAction,
        };
        next.set(branchName, pending);
        return next;
      });
    },
    []
  );

  const reorderCommitInPending = useCallback(
    (branchName: string, fromIndex: number, toIndex: number) => {
      setPendingEdits((prev) => {
        const next = new Map(prev);
        const pending = [...(next.get(branchName) || [])];
        const [item] = pending.splice(fromIndex, 1);
        pending.splice(toIndex, 0, item);
        next.set(branchName, pending);
        return next;
      });
    },
    []
  );

  const hasChanges = useCallback(
    (branchName: string) => {
      const commits = commitsCache.get(branchName) || [];
      const pending = pendingEdits.get(branchName) || [];
      if (commits.length !== pending.length) return true;
      for (let i = 0; i < commits.length; i++) {
        if (commits[i].sha !== pending[i].sha) return true;
        if (pending[i].action !== "pick") return true;
      }
      return false;
    },
    [commitsCache, pendingEdits]
  );

  const applyCommitChanges = useCallback(
    (branchName: string) => {
      const pending = pendingEdits.get(branchName);
      if (!pending) return;

      const nonDrop = pending.filter((c) => c.action !== "drop");
      if (nonDrop.length === 0) return; // Cannot drop all

      const branch = state?.branches?.find((b) => b.name === branchName);
      const parent = branch?.parentName || "";

      vscodeApi.postMessage({
        type: "reorderCommits",
        payload: {
          branch: branchName,
          parent,
          commitActions: pending.map((p) => ({
            sha: p.sha,
            action: p.action,
          })),
        },
      });
    },
    [pendingEdits, state]
  );

  const resetCommitChanges = useCallback(
    (branchName: string) => {
      const commits = commitsCache.get(branchName) || [];
      setPendingEdits((prev) => {
        const next = new Map(prev);
        next.set(
          branchName,
          commits.map((c) => ({ sha: c.sha, action: "pick" as const }))
        );
        return next;
      });
    },
    [commitsCache]
  );

  return {
    state,
    loading,
    expandedBranches,
    commitsCache,
    pendingEdits,
    // Actions
    refresh,
    sync,
    submitStack,
    restack,
    checkout,
    createBranch,
    reorderBranches,
    // Commit helpers
    toggleExpand,
    toggleCommitAction,
    reorderCommitInPending,
    hasChanges,
    applyCommitChanges,
    resetCommitChanges,
  };
}
