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

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Strip prefix only if it's at the start (e.g., "v1.2.3" -> "1.2.3")
function parseVersionFromTag(
  tag: string,
  prefix: string
): [number, number, number] {
  const cleaned = prefix
    ? tag.replace(new RegExp(`^${escapeRegExp(prefix)}`), "")
    : tag;
  const [maj, min, pat] = cleaned.split(".").map((x) => Number(x) || 0);
  return [maj, min, pat];
}

// Accept release/x.y or release/x.y.z (same for hotfix)
function parseVersionFromBranch(
  branch: string
): [number, number, number] | null {
  const m = branch.match(/^(?:release|hotfix)\/(v?\d+)\.(\d+)(?:\.(\d+))?$/);
  if (!m) return null;
  const major = Number(m[1].replace(/^v/, "")) || 0;
  const minor = Number(m[2]) || 0;
  const patch = m[3] ? Number(m[3]) || 0 : 0;
  return [major, minor, patch];
}

// Numeric compare for tags like "v10.0.0" vs "v2.0.0"
function cmpTagSemverDesc(a: string, b: string, prefix: string): number {
  const [A, B] = [a, b].map((t) => parseVersionFromTag(t, prefix));
  // compare major, then minor, then patch (descending)
  if (A[0] !== B[0]) return B[0] - A[0];
  if (A[1] !== B[1]) return B[1] - A[1];
  return B[2] - A[2];
}

function fmt(major: number, minor: number, patch: number) {
  return `${major}.${minor}.${patch}`;
}

export function calculateVersion(
  gitInfo: GitInfo,
  config: GitVersionConfig
): GitVersionInfo {
  const { tags, branchType, currentBranch } = gitInfo;
  const { tagPrefix = "v" } = config;

  // 1) If branch encodes a version, use it as the base (authoritative)
  const branchVer = parseVersionFromBranch(currentBranch);

  // 2) Else find latest tag (semver-aware)
  const latestTag = tags
    .slice()
    .sort((a, b) => cmpTagSemverDesc(a, b, tagPrefix))[0];
  const tagged = latestTag ? parseVersionFromTag(latestTag, tagPrefix) : null;

  // 3) Fallback base if neither branch nor tags give one
  const base: [number, number, number] = branchVer ?? tagged ?? [0, 1, 0];

  let outMajor = base[0],
    outMinor = base[1],
    outPatch = base[2];
  let version = "";

  switch (branchType) {
    case "main": {
      // exactly base (tagged or branch-provided)
      version = fmt(outMajor, outMinor, outPatch);
      break;
    }
    case "develop": {
      // next minor prebuild-ish (keep your dot timestamp style)
      version = `${outMajor}.${outMinor + 1}.0.${Date.now()}`;
      break;
    }
    case "feature": {
      // next minor prebuild-ish
      version = `${outMajor}.${outMinor + 1}.0.${Date.now()}`;
      break;
    }
    case "release": {
      // If branch said release/x.y(.z), we already used it as base → use that exact version.
      // Otherwise, keep your old rule: +1 minor, patch=0
      if (!branchVer) {
        outMinor = outMinor + 1;
        outPatch = 0;
      }
      version = fmt(outMajor, outMinor, outPatch);
      break;
    }
    case "hotfix": {
      // If branch said hotfix/x.y(.z), we already used it as base → use that exact version.
      // Otherwise, bump patch from base.
      if (!branchVer) {
        outPatch = outPatch + 1;
      }
      version = fmt(outMajor, outMinor, outPatch);
      break;
    }
    default: {
      version = fmt(outMajor, outMinor, outPatch);
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
  };
}
