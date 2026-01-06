import { exec } from "child_process";
import { promisify } from "util";

import { GitVersionConfig } from "./config.js";

const execAsync = promisify(exec);

export interface GitInfo {
  currentBranch: string;
  tags: string[];
  branchType: string | null;
}

function normalizeBranchName(ref: string): string {
  const trimmed = (ref ?? "").trim();
  if (!trimmed) return "HEAD";
  if (trimmed.startsWith("refs/heads/"))
    return trimmed.slice("refs/heads/".length);
  if (trimmed.startsWith("refs/")) {
    const parts = trimmed.split("/");
    return parts[parts.length - 1] || "HEAD";
  }
  if (trimmed.startsWith("remotes/"))
    return trimmed.replace(/^remotes\//, "").replace(/^origin\//, "");
  return trimmed;
}

function inferBranchFromCiEnv(): string | null {
  const candidates: Array<string | undefined> = [
    process.env.GITHUB_HEAD_REF,
    process.env.GITHUB_REF_NAME,
    process.env.BUILD_SOURCEBRANCHNAME,
    process.env.BUILD_SOURCEBRANCH,
    process.env.CI_COMMIT_REF_NAME,
    process.env.BRANCH_NAME,
    process.env.GIT_BRANCH,
  ];

  for (const c of candidates) {
    const n = normalizeBranchName(c ?? "");
    if (n && n !== "HEAD") return n;
  }
  return null;
}

export type GitInfoOptions = {
  cwd?: string;
};

function isValidSemverTag(tag: string, prefix: string): boolean {
  if (prefix && !tag.startsWith(prefix)) return false;
  const cleaned = prefix ? tag.slice(prefix.length) : tag;
  return /^\d+(\.\d+){0,2}$/.test(cleaned);
}

export async function getGitInfo(
  config: GitVersionConfig,
  options: GitInfoOptions = {}
): Promise<GitInfo> {
  const { cwd } = options;
  const { tagPrefix = "v", branchPrefixes = {} } = config;

  const execGit = (cmd: string) =>
    cwd ? execAsync(cmd, { cwd }) : execAsync(cmd);

  let currentBranch = (await execGit("git rev-parse --abbrev-ref HEAD")).stdout
    .trim();

  if (!currentBranch || currentBranch === "HEAD") {
    const fromEnv = inferBranchFromCiEnv();
    if (fromEnv) {
      currentBranch = fromEnv;
    } else {
      try {
        const nameRev = await execGit("git name-rev --name-only HEAD");
        const inferred = normalizeBranchName(nameRev.stdout.trim());
        if (inferred && inferred !== "HEAD") currentBranch = inferred;
      } catch {
        // ignore
      }
    }
  }

  const tagResult = await execGit("git tag --list");
  const allTags = tagResult.stdout
    .split("\n")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const tags = allTags.filter((tag) => isValidSemverTag(tag, tagPrefix));

  const branchType =
    Object.entries(branchPrefixes).find(([type, prefix]) =>
      currentBranch.startsWith(prefix)
    )?.[0] ?? null;

  return {
    currentBranch,
    tags,
    branchType,
  };
}
