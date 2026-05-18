import { execSync } from "child_process";

import { GitVersionConfig } from "./config.js";
import { GitInfo } from "./git.js";

export type GitVersionInfo = {
  version: string;
  major: number;
  minor: number;
  patch: number;
  branch: string;
  tag: string | null;
  branchType: string | null;
  timestamp: string;
  commits: string[]; // Include commits in the returned object
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseVersionFromTag(
  tag: string,
  prefix: string
): [number, number, number] {
  const cleaned = prefix
    ? tag.replace(new RegExp(`^${escapeRegExp(prefix)}`), "")
    : tag;

  const parts = cleaned.split(".").map((n) => Number(n));

  const maj = Number.isFinite(parts[0]) ? parts[0] : 0;
  const min = Number.isFinite(parts[1]) ? parts[1] : 0;
  const pat = Number.isFinite(parts[2]) ? parts[2] : 0;

  return [maj, min, pat];
}

function toVersionNumber(value: string | undefined): number {
  if (!value) return 0;
  return Number(value.replace(/^v/i, "")) || 0;
}

function parseVersionLike(value: string): [number, number, number] | null {
  const m = value.match(/v?(\d+)(?:[.-](\d+))?(?:[.-](\d+))?$/i);
  if (!m) return null;
  return [toVersionNumber(m[1]), toVersionNumber(m[2]), toVersionNumber(m[3])];
}

function regexFromConfig(regex: string | RegExp | undefined): RegExp | null {
  if (!regex) return null;
  if (typeof regex === "string") return new RegExp(regex);
  return new RegExp(regex.source, regex.flags.replace(/[gy]/g, ""));
}

function parseVersionFromRegexMatch(
  match: RegExpMatchArray
): [number, number, number] | null {
  const groups = match.groups;
  if (groups?.major) {
    return [
      toVersionNumber(groups.major),
      toVersionNumber(groups.minor),
      toVersionNumber(groups.patch),
    ];
  }

  const captures = match.slice(1).filter((value) => value !== undefined);
  if (captures.length === 0) return null;
  if (captures.length === 1) return parseVersionLike(captures[0]);

  return [
    toVersionNumber(captures[0]),
    toVersionNumber(captures[1]),
    toVersionNumber(captures[2]),
  ];
}

// Supports:
//   release/2.2.0  → 2.2.0
//   release/2.2    → 2.2.0
//   release/2      → 2.0.0
//   release/R2026-2.0 → 26.2.0
// Same for hotfix/* (hotfix/1.2.3 etc.)
function parseVersionFromBranch(
  branch: string,
  branchRegex?: string | RegExp
): [number, number, number] | null {
  const configuredRegex = regexFromConfig(branchRegex);
  if (configuredRegex) {
    const configuredMatch = branch.match(configuredRegex);
    if (configuredMatch) {
      const configuredVersion = parseVersionFromRegexMatch(configuredMatch);
      if (configuredVersion) return configuredVersion;
    }
  }

  const releaseYearMatch = branch.match(
    /^(?:release|hotfix)\/R20(\d{2})-(\d+)\.(\d+)$/
  );
  if (releaseYearMatch) {
    return [
      toVersionNumber(releaseYearMatch[1]),
      toVersionNumber(releaseYearMatch[2]),
      toVersionNumber(releaseYearMatch[3]),
    ];
  }

  const m = branch.match(
    /^(?:release|hotfix)\/(v?\d+)(?:\.(\d+))?(?:\.(\d+))?$/
  );
  if (!m) return null;
  return [toVersionNumber(m[1]), toVersionNumber(m[2]), toVersionNumber(m[3])];
}

function sortTagsDesc(tags: string[], prefix: string): string[] {
  return [...tags].sort((a, b) => {
    const [Amaj, Amin, Apat] = parseVersionFromTag(a, prefix);
    const [Bmaj, Bmin, Bpat] = parseVersionFromTag(b, prefix);
    if (Amaj !== Bmaj) return Bmaj - Amaj;
    if (Amin !== Bmin) return Bmin - Amin;
    return Bpat - Apat;
  });
}

function fmt(maj: number, min: number, pat: number, build?: number) {
  return build !== undefined
    ? `${maj}.${min}.${pat}.${build}`
    : `${maj}.${min}.${pat}`;
}

type CommitInfo = {
  commits: string[];
  count: number;
};

function getCommitsSinceLatestTag(
  latestTag: string,
  cwd: string,
  includeCommits: boolean
): CommitInfo {
  try {
    if (includeCommits) {
      const result = execSync(
        `git log ${latestTag}..HEAD --pretty=format:"%h %s"`,
        { cwd, encoding: "utf-8" }
      );
      const commits = result.split("\n").filter(Boolean);
      return { commits, count: commits.length };
    }

    const countResult = execSync(`git rev-list --count ${latestTag}..HEAD`, {
      cwd,
      encoding: "utf-8",
    });
    const count = Number.parseInt(countResult.trim(), 10) || 0;
    return { commits: [], count };
  } catch (error) {
    console.error("Error fetching commits:", error);
    return { commits: [], count: 0 };
  }
}

export function calculateVersion(
  gitInfo: GitInfo,
  config: GitVersionConfig,
  options: { cwd?: string; includeCommits?: boolean } = {}
): GitVersionInfo {
  const { tags, branchType, currentBranch } = gitInfo;
  const { tagPrefix = "v", branchRegex } = config;
  const { cwd = process.cwd(), includeCommits = true } = options;

  // Base: branch-encoded version > latest tag > default
  const branchVer = parseVersionFromBranch(currentBranch, branchRegex);
  const latestTag = sortTagsDesc(tags, tagPrefix)[0] ?? null;
  const tagged = latestTag ? parseVersionFromTag(latestTag, tagPrefix) : null;
  const [baseMajor, baseMinor, basePatch] = branchVer ?? tagged ?? [0, 1, 0];

  // Get commits since the last tag
  const { commits, count: commitCount } = latestTag
    ? getCommitsSinceLatestTag(latestTag, cwd, includeCommits)
    : { commits: [], count: 0 };

  // Output (these are returned)
  let outMajor = baseMajor;
  let outMinor = baseMinor;
  let outPatch = basePatch;

  let version = "";

  switch (branchType) {
    case "main": {
      version = fmt(outMajor, outMinor, outPatch, commitCount);
      break;
    }
    case "develop": {
      outMinor = outMinor + 1;
      outPatch = 0;
      version = `${outMajor}.${outMinor}.${outPatch}.${commitCount}`;
      break;
    }
    case "feature": {
      outMinor = outMinor + 1;
      outPatch = 0;
      version = `${outMajor}.${outMinor}.${outPatch}.${commitCount}`;
      break;
    }
    case "release": {
      if (!branchVer) {
        outMinor = outMinor + 1;
        outPatch = 0;
      }
      version = fmt(outMajor, outMinor, outPatch, commitCount);
      break;
    }
    case "hotfix": {
      version = fmt(outMajor, outMinor, outPatch, commitCount);
      break;
    }
    default: {
      version = fmt(outMajor, outMinor, outPatch, commitCount);
    }
  }

  return {
    version,
    major: outMajor,
    minor: outMinor,
    patch: outPatch,
    branch: currentBranch,
    tag: latestTag || null,
    branchType,
    timestamp: new Date().toISOString(),
    commits, // Include commits in the returned object
  };
}
