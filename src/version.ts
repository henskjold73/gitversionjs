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
};

function parseVersion(tag: string, prefix: string): [number, number, number] {
  const version = tag.replace(prefix, "");
  const [major, minor, patch] = version.split(".").map(Number);
  return [major || 0, minor || 0, patch || 0];
}

export function calculateVersion(
  gitInfo: GitInfo,
  config: GitVersionConfig
): GitVersionInfo {
  const { tags, branchType, currentBranch } = gitInfo;
  const { tagPrefix = "v" } = config;

  const latestTag = tags.sort().reverse()[0];
  const [major, minor, patch] = latestTag
    ? parseVersion(latestTag, tagPrefix)
    : [0, 1, 0];

  let version = "";

  switch (branchType) {
    case "feature":
      version = `${major}.${minor}.${patch}-beta.${Date.now()}`;
      break;
    case "release":
      version = `${major}.${minor + 1}.0`;
      break;
    case "hotfix":
      version = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      version = `${major}.${minor}.${patch}`;
  }

  return {
    version,
    major,
    minor,
    patch,
    branch: currentBranch,
    tag: latestTag || null,
    branchType,
    timestamp: new Date().toISOString(),
  };
}
