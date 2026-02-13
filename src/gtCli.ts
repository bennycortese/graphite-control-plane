import * as vscode from "vscode";
import { execFile } from "child_process";

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
  error?: string;
};

function getWorkspaceDir(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}

function runGt(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const cwd = getWorkspaceDir();
    if (!cwd) {
      reject(new Error("No workspace folder open"));
      return;
    }

    const allArgs = ["--no-interactive", ...args];

    execFile("gt", allArgs, { cwd, timeout: 30000, shell: true }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message));
        return;
      }
      resolve(stdout);
    });
  });
}

export async function getStackState(): Promise<StackState> {
  try {
    const trunkOutput = await runGt(["trunk"]);
    const trunk = trunkOutput.trim();

    let branches: BranchInfo[];
    try {
      const logOutput = await runGt(["log"]);
      branches = parseLogDefaultOutput(logOutput, trunk);
    } catch {
      // Fallback to gt log short if gt log fails
      const logOutput = await runGt(["log", "short"]);
      branches = parseLogOutput(logOutput, trunk);
    }

    // Infer parent-child: gt log lists child-first (top) to trunk (bottom)
    for (let i = 0; i < branches.length - 1; i++) {
      branches[i].parentName = branches[i + 1].name;
    }

    const currentBranch = branches.find((b) => b.isCurrent)?.name ?? trunk;

    return { trunk, currentBranch, branches };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      trunk: "main",
      currentBranch: "",
      branches: [],
      error: msg,
    };
  }
}

function parsePRStatus(text: string): PRInfo | undefined {
  // Look for PR #NNN pattern
  const prMatch = text.match(/PR\s*#(\d+)/i);
  if (!prMatch) {
    return undefined;
  }

  const number = parseInt(prMatch[1], 10);
  let status: PRInfo["status"] = "open";
  let reviewStatus: PRInfo["reviewStatus"] = undefined;

  const lower = text.toLowerCase();

  // Determine PR status from labels
  if (lower.includes("merged")) {
    status = "merged";
  } else if (lower.includes("closed") || lower.includes("abandoned")) {
    status = "closed";
  } else if (lower.includes("draft")) {
    status = "draft";
  }

  // Determine review status
  if (lower.includes("approed")) {
    reviewStatus = "approved";
  } else if (lower.includes("changes requested") || lower.includes("changes_requested")) {
    reviewStatus = "changes_requested";
  } else if (lower.includes("review required") || lower.includes("review_required")) {
    reviewStatus = "review_required";
  }

  return { number, status, reviewStatus };
}

function parseLogDefaultOutput(output: string, trunk: string): BranchInfo[] {
  const branches: BranchInfo[] = [];
  const lines = output.split("\n");

  // gt log outputs multiline blocks per branch:
  //   ◉ branch-name (current)        ← or with PR #NNN and status labels
  //   │ 2 hours ago
  //   │
  //   │ abc1234 - commit message
  //   │
  //   ◯ next-branch
  //   ...

  let currentBranch: {
    name: string;
    isCurrent: boolean;
    headerLine: string;
    detailLines: string[];
  } | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Check for branch header line (starts with bullet character)
    const bulletMatch = trimmed.match(/^([◉◯●○\*])\s+(.+)$/);
    if (bulletMatch) {
      // Save previous branch if exists
      if (currentBranch) {
        branches.push(finalizeBranch(currentBranch, trunk));
      }

      const rest = bulletMatch[2];
      const isCurrent = bulletMatch[1] === "◉" || /\(current\)/i.test(rest);
      const nameAndRest = rest.replace(/\(current\)/i, "").trim();

      // The branch name is the first token (before any PR info or status labels)
      // It could also have (needs restack) or similar annotations
      const nameParts = nameAndRest.match(/^(\S+)\s*(.*)?$/);
      const name = nameParts?.[1] ?? nameAndRest;

      currentBranch = {
        name,
        isCurrent,
        headerLine: rest,
        detailLines: [],
      };
      continue;
    }

    // Check for detail lines (prefixed with │ or |)
    const detailMatch = trimmed.match(/^[│|]\s*(.*)$/);
    if (detailMatch && currentBranch) {
      const content = detailMatch[1].trim();
      if (content) {
        currentBranch.detailLines.push(content);
      }
      continue;
    }
  }

  // Don't forget the last branch
  if (currentBranch) {
    branches.push(finalizeBranch(currentBranch, trunk));
  }

  return branches;
}

function finalizeBranch(
  raw: { name: string; isCurrent: boolean; headerLine: string; detailLines: string[] },
  trunk: string
): BranchInfo {
  let timeAgo = "";
  let commitSha = "";
  let commitMessage = "";

  for (const line of raw.detailLines) {
    // Match time patterns like "2 hours ago", "3 days ago", "5 minutes ago"
    if (/\d+\s+(second|minute|hour|day|week|month|year)s?\s+ago/i.test(line)) {
      timeAgo = line;
      continue;
    }

    // Match commit lines: "abc1234 - commit message" or just a sha
    const commitMatch = line.match(/^([0-9a-f]{7,40})\s*[-–]\s*(.+)$/i);
    if (commitMatch) {
      commitSha = commitMatch[1];
      commitMessage = commitMatch[2];
      continue;
    }
  }

  // Try to extract PR info from header line and detail lines
  const allText = [raw.headerLine, ...raw.detailLines].join(" ");
  const pr = parsePRStatus(allText);

  return {
    name: raw.name,
    isCurrent: raw.isCurrent,
    isTrunk: raw.name === trunk,
    timeAgo,
    commitSha,
    commitMessage,
    pr,
  };
}

function parseLogOutput(output: string, trunk: string): BranchInfo[] {
  const branches: BranchInfo[] = [];

  // gt log short outputs lines like:
  //   ◉ branch-name (current) · 2 hours ago · abc1234 · commit message
  //   ◯ other-branch · 1 day ago · def5678 · another commit
  // The exact format may vary; we split on the bullet characters.

  const lines = output.split("\n");

  for (const line of lines) {
    // Match lines that start with a bullet character (◉ or ◯ or similar)
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    // Try to extract branch info from the line
    // Patterns: "◉ name (current) · time · sha · msg" or "◯ name · time · sha · msg"
    // Also handle lines without bullet: just branch name lines from gt log
    const bulletMatch = trimmed.match(/^[◉◯●○▸▹►▻⦿⊙\*]\s+(.+)$/);
    if (!bulletMatch) {
      continue;
    }

    const rest = bulletMatch[1];

    // Check for (current) marker
    const isCurrent = /\(current\)/i.test(rest);
    const cleaned = rest.replace(/\(current\)/i, "").trim();

    // Split on the separator (· or |)
    const parts = cleaned.split(/\s*[·|]\s*/);
    const name = parts[0]?.trim() ?? "";

    if (!name) {
      continue;
    }

    const timeAgo = parts[1]?.trim() ?? "";
    const commitSha = parts[2]?.trim() ?? "";
    const commitMessage = parts.slice(3).join(" · ").trim();

    branches.push({
      name,
      isCurrent,
      isTrunk: name === trunk,
      timeAgo,
      commitSha,
      commitMessage,
    });
  }

  return branches;
}

export async function gtSync(): Promise<string> {
  return runGt(["repo", "sync", "--force"]);
}

export async function gtSubmit(): Promise<string> {
  return runGt(["submit", "--no-edit"]);
}

export async function gtSubmitStack(): Promise<string> {
  return runGt(["stack", "submit", "--no-edit"]);
}

export async function gtRestack(): Promise<string> {
  return runGt(["restack"]);
}

export async function gtCheckout(branch: string): Promise<string> {
  return runGt(["checkout", branch]);
}

export async function gtCreate(name: string): Promise<string> {
  return runGt(["create", name, "--all"]);
}

export async function gtDelete(name: string): Promise<string> {
  return runGt(["branch", "delete", name, "--force"]);
}
