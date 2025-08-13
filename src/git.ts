import { exec } from "child_process";
import { promisify } from "util";

import { GitVersionConfig } from "./config.js";

const execAsync = promisify(exec);

export interface GitInfo {
  currentBranch: string;
  tags: string[];
  branchType: string | null;
}

export async function getGitInfo(config: GitVersionConfig): Promise<GitInfo> {
  const { tagPrefix = "v", branchPrefixes = {} } = config;

  const branchResult = await execAsync("git rev-parse --abbrev-ref HEAD");
  const currentBranch = branchResult.stdout.trim();

  const tagResult = await execAsync("git tag --list");
  const allTags = tagResult.stdout
    .split("\n")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const tags = allTags.filter((tag) => tag.startsWith(tagPrefix));

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
