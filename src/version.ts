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
  const [maj, min, pat] = cleaned.split(".").map((n) => Number(n) || 0);
  return [maj, min, pat];
}

// Supports:
//   release/2.2.0  → 2.2.0
//   release/2.2    → 2.2.0
//   release/2      → 2.0.0
// Same for hotfix/* (hotfix/1.2.3 etc.)
function parseVersionFromBranch(
  branch: string
): [number, number, number] | null {
  const m = branch.match(
    /^(?:release|hotfix)\/(v?\d+)(?:\.(\d+))?(?:\.(\d+))?$/
  );
  if (!m) return null;
  const major = Number(m[1].replace(/^v/, "")) || 0;
  const minor = m[2] ? Number(m[2]) || 0 : 0;
  const patch = m[3] ? Number(m[3]) || 0 : 0;
  return [major, minor, patch];
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

function getCommitsSinceLastVersionChange(
  tags: string[],
  currentBranch: string,
  tagPrefix: string,
  cwd: string = "."
): string[] {
  try {
    // Sort tags in descending order
    const sortedTags = sortTagsDesc(tags, tagPrefix);

    // Find the latest tag that changed the version
    let lastVersionTag = null;
    for (const tag of sortedTags) {
      const [tagMajor, tagMinor, tagPatch] = parseVersionFromTag(
        tag,
        tagPrefix
      );
      const [branchMajor, branchMinor, branchPatch] = parseVersionFromBranch(
        currentBranch
      ) ?? [0, 1, 0];

      // Check if the tag version differs from the branch version
      if (
        tagMajor !== branchMajor ||
        tagMinor !== branchMinor ||
        tagPatch !== branchPatch
      ) {
        lastVersionTag = tag;
        break;
      }
    }

    // If no tag is found, use the first tag
    const tagToCompare = lastVersionTag || sortedTags[0];

    // Fetch commits since the determined tag
    const result = execSync(
      `git log ${tagToCompare}..HEAD --pretty=format:"%h %s"`,
      { cwd, encoding: "utf-8" }
    );

    return result.split("\n").filter(Boolean); // Split into lines and remove empty entries
  } catch (error) {
    console.error("Error fetching commits:", error);
    return [];
  }
}

export function calculateVersion(
  gitInfo: GitInfo,
  config: GitVersionConfig
): GitVersionInfo {
  const { tags, branchType, currentBranch } = gitInfo;
  const { tagPrefix = "v" } = config;

  // Base: branch-encoded version > latest tag > default
  const branchVer = parseVersionFromBranch(currentBranch);
  const latestTag = sortTagsDesc(tags, tagPrefix)[0] ?? null;
  const tagged = latestTag ? parseVersionFromTag(latestTag, tagPrefix) : null;
  const [baseMajor, baseMinor, basePatch] = branchVer ?? tagged ?? [0, 1, 0];

  // Get commits since the last tag
  const commits = latestTag
    ? getCommitsSinceLastVersionChange(tags, currentBranch, tagPrefix)
    : [];
  const commitCount = commits.length; // Count the number of commits

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
        outMinor;
        outPatch = 0;
      }
      version = fmt(outMajor, outMinor, outPatch, commitCount);
      break;
    }
    case "hotfix": {
      if (!branchVer) {
        outPatch = outPatch + 1;
      }
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
