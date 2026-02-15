export type PRInfo = {
  number: number;
  status: "open" | "merged" | "closed" | "draft";
  reviewStatus?: "approved" | "changes_requested" | "review_required";
};

export type BranchInfo = {
  name: string;
  isCurrent: boolean;
  isTrunk: boolean;
  timeAgo: string;
  commitSha: string;
  commitMessage: string;
  pr?: PRInfo;
  parentName?: string;
};

export type StackState = {
  trunk: string;
  currentBranch: string;
  branches: BranchInfo[];
  localCommits: CommitInfo[];
  error?: string;
};

export type CommitInfo = {
  sha: string;
  message: string;
};

export type CommitAction = {
  sha: string;
  action: "pick" | "fixup" | "drop";
};

// Messages sent from the extension to the webview
export type ExtensionMessage =
  | { type: "state"; payload: StackState }
  | { type: "loading"; payload: boolean }
  | { type: "commits"; payload: { branch: string; commits: CommitInfo[] } };

// Messages sent from the webview to the extension
export type WebviewMessage =
  | { type: "ready" }
  | { type: "refresh" }
  | { type: "sync" }
  | { type: "submitStack" }
  | { type: "restack" }
  | { type: "checkout"; payload: { branch: string } }
  | { type: "createBranch" }
  | { type: "getCommits"; payload: { branch: string; parent: string } }
  | { type: "reorderBranches"; payload: { order: string[] } }
  | {
      type: "reorderCommits";
      payload: {
        branch: string;
        parent: string;
        commitActions: CommitAction[];
      };
    };
