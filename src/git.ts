import { exec } from "child_process";
import { promisify } from "util";

import { GitVersionConfig } from "./config.js";

const execAsync = promisify(exec);

export interface GitInfo {
  currentBranch: string;
  tags: string[];
  branchType: string | null;
  sourceBranch?: string | null;
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

function branchNameMatchesPrefix(branch: string, prefix: string): boolean {
  if (!prefix.endsWith("/")) return branch === prefix;
  return branch.startsWith(prefix);
}

function normalizeCandidateBranch(ref: string): string {
  return normalizeBranchName(ref.replace(/^origin\//, ""));
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

async function inferSourceBranch(
  execGit: (cmd: string) => Promise<{ stdout: string }>,
  currentBranch: string,
  branchPrefixes: Record<string, string>
): Promise<string | null> {
  const sourceAwareTypes = new Set(["bugfix", "feature", "support"]);
  const currentType = Object.entries(branchPrefixes).find(([, prefix]) =>
    branchNameMatchesPrefix(currentBranch, prefix)
  )?.[0];

  if (!currentType || !sourceAwareTypes.has(currentType)) return null;

  try {
    const refs = await execGit(
      'git for-each-ref --format="%(refname:short)" refs/heads refs/remotes'
    );
    const candidates = refs.stdout
      .split("\n")
      .map((ref) => normalizeCandidateBranch(ref.trim()))
      .filter(Boolean)
      .filter((branch) => branch !== "HEAD" && branch !== currentBranch)
      .filter((branch, index, branches) => branches.indexOf(branch) === index)
      .filter((branch) =>
        Object.entries(branchPrefixes).some(
          ([type, prefix]) =>
            type !== currentType && branchNameMatchesPrefix(branch, prefix)
        )
      );

    const scored: Array<{ branch: string; distance: number }> = [];

    for (const branch of candidates) {
      const quotedBranch = shellQuote(branch);
      try {
        const forkPoint = await execGit(
          `git merge-base --fork-point ${quotedBranch} HEAD`
        );
        const base = forkPoint.stdout.trim();
        if (!base) continue;

        const distance = await execGit(`git rev-list --count ${base}..HEAD`);
        scored.push({
          branch,
          distance: Number.parseInt(distance.stdout.trim(), 10) || 0,
        });
      } catch {
        try {
          const mergeBase = await execGit(`git merge-base ${quotedBranch} HEAD`);
          const base = mergeBase.stdout.trim();
          if (!base) continue;

          const distance = await execGit(`git rev-list --count ${base}..HEAD`);
          scored.push({
            branch,
            distance: Number.parseInt(distance.stdout.trim(), 10) || 0,
          });
        } catch {
          // Candidate cannot be related to HEAD in this checkout.
        }
      }
    }

    scored.sort((a, b) => a.distance - b.distance);
    return scored[0]?.branch ?? null;
  } catch {
    return null;
  }
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

  let allTags: string[] = [];

  try {
    const reachableTagResult = await execGit("git tag --merged HEAD --list");
    allTags = reachableTagResult.stdout
      .split("\n")
      .map((tag) => tag.trim())
      .filter(Boolean);
  } catch {
    const tagResult = await execGit("git tag --list");
    allTags = tagResult.stdout
      .split("\n")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  const tags = allTags.filter((tag) => isValidSemverTag(tag, tagPrefix));

  const branchType =
    Object.entries(branchPrefixes).find(([type, prefix]) =>
      branchNameMatchesPrefix(currentBranch, prefix)
    )?.[0] ?? null;
  const sourceBranch = await inferSourceBranch(
    execGit,
    currentBranch,
    branchPrefixes
  );

  return {
    currentBranch,
    tags,
    branchType,
    sourceBranch,
  };
}
