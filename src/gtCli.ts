import * as vscode from "vscode";
import { execFile } from "child_process";

export type BranchInfo = {
  name: string;
  isCurrent: boolean;
  isTrunk: boolean;
  timeAgo: string;
  commitSha: string;
  commitMessage: string;
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
    const [trunkOutput, logOutput] = await Promise.all([
      runGt(["trunk"]),
      runGt(["log", "short"]),
    ]);

    const trunk = trunkOutput.trim();
    const branches = parseLogOutput(logOutput, trunk);
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
