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

function fmt(maj: number, min: number, pat: number) {
  return `${maj}.${min}.${pat}`;
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

  // Output (these are returned)
  let outMajor = baseMajor;
  let outMinor = baseMinor;
  let outPatch = basePatch;

  let version = "";

  switch (branchType) {
    case "main": {
      // Exactly the base
      version = fmt(outMajor, outMinor, outPatch);
      break;
    }
    case "develop": {
      // Bump MINOR → reset PATCH
      outMinor = outMinor + 1;
      outPatch = 0;
      version = `${outMajor}.${outMinor}.${outPatch}.${Date.now()}`;
      break;
    }
    case "feature": {
      // Same policy as develop (minor prebuild). If you prefer patch prebuilds, change below.
      outMinor = outMinor + 1;
      outPatch = 0;
      version = `${outMajor}.${outMinor}.${outPatch}.${Date.now()}`;
      break;
    }
    case "release": {
      // If branch encodes version → authoritative (already normalized e.g. 2 -> 2.0.0, 2.2 -> 2.2.0)
      if (!branchVer) {
        // Bump MINOR → reset PATCH
        outMinor = outMinor + 1;
        outPatch = 0;
      }
      version = fmt(outMajor, outMinor, outPatch);
      break;
    }
    case "hotfix": {
      // If branch encodes version → authoritative; else bump PATCH
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
