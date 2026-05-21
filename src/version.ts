import { execSync } from "child_process";

import {
  BranchRule,
  BranchRuleBase,
  BranchRuleIncrement,
  BranchRuleMatch,
  GitVersionConfig,
} from "./config.js";
import { GitInfo } from "./git.js";

export type GitVersionInfo = {
  version: string;
  major: number;
  minor: number;
  patch: number;
  branch: string;
  sourceBranch: string | null;
  tag: string | null;
  branchType: string | null;
  strategy?: string;
  rule?: string | null;
  baseVersion?: string;
  baseSource?: BranchRuleBase;
  increment?: BranchRuleIncrement;
  timestamp: string;
  commits: string[]; // Include commits in the returned object
};

type ResolvedRule = Required<
  Pick<BranchRule, "name" | "match" | "increment" | "sourceAware">
> & {
  base: BranchRuleBase[];
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
//   release/2.2.0  -> 2.2.0
//   release/2.2    -> 2.2.0
//   release/2      -> 2.0.0
//   release/R2026-2.0 -> 26.2.0
// Same for hotfix/* and support/*.
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
    /^(?:release|hotfix|support)\/R20(\d{2})-(\d+)\.(\d+)$/
  );
  if (releaseYearMatch) {
    return [
      toVersionNumber(releaseYearMatch[1]),
      toVersionNumber(releaseYearMatch[2]),
      toVersionNumber(releaseYearMatch[3]),
    ];
  }

  const m = branch.match(
    /^(?:release|hotfix|support)\/(v?\d+)(?:\.(\d+))?(?:\.(\d+))?$/
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

function normalizeBase(base: BranchRule["base"]): BranchRuleBase[] {
  if (!base) return ["branch", "sourceBranch", "tag", "default"];
  return Array.isArray(base) ? base : [base];
}

function normalizeRule(rule: BranchRule): ResolvedRule {
  return {
    name: rule.name,
    match: rule.match,
    increment: rule.increment ?? "none",
    base: normalizeBase(rule.base),
    sourceAware: rule.sourceAware ?? false,
  };
}

function branchTypeRule(
  type: string,
  increment: BranchRuleIncrement
): BranchRule {
  return {
    name: type,
    match: { type },
    increment,
  };
}

function presetRules(strategy: GitVersionConfig["strategy"]): BranchRule[] {
  switch (strategy ?? "gitflow") {
    case "github-flow":
      return [
        branchTypeRule("main", "none"),
        { name: "feature", match: { prefix: "feature/" }, increment: "patch" },
        { name: "bugfix", match: { prefix: "bugfix/" }, increment: "patch" },
      ];
    case "trunk-based":
      return [
        branchTypeRule("main", "none"),
        {
          name: "short-lived",
          match: { regex: /^(feature|bugfix|chore)\// },
          increment: "patch",
        },
      ];
    case "gitlab-flow":
      return [
        branchTypeRule("main", "none"),
        branchTypeRule("develop", "patch"),
        {
          name: "environment",
          match: { regex: /^(production|staging|preprod)$/ },
          increment: "none",
        },
        { name: "release", match: { type: "release" }, increment: "none" },
        {
          name: "feature",
          match: { type: "feature" },
          increment: "patch",
          sourceAware: true,
        },
      ];
    case "release-train":
      return [
        branchTypeRule("main", "none"),
        {
          name: "release",
          match: { type: "release" },
          increment: "none",
          base: ["branch", "tag", "default"],
        },
        {
          name: "support",
          match: { type: "support" },
          increment: "none",
          base: ["branch", "sourceBranch", "tag", "default"],
        },
        {
          name: "train-work",
          match: { regex: /^(feature|bugfix|hotfix)\// },
          increment: "patch",
          sourceAware: true,
        },
      ];
    case "gitflow":
    default:
      return [
        branchTypeRule("main", "none"),
        branchTypeRule("develop", "none"),
        {
          name: "feature",
          match: { type: "feature" },
          increment: "none",
          sourceAware: true,
        },
        {
          name: "bugfix",
          match: { type: "bugfix" },
          increment: "none",
          sourceAware: true,
        },
        { name: "release", match: { type: "release" }, increment: "none" },
        { name: "hotfix", match: { type: "hotfix" }, increment: "none" },
        {
          name: "support",
          match: { type: "support" },
          increment: "none",
          sourceAware: true,
        },
      ];
  }
}

function bumpRule(entry: string): BranchRule {
  return {
    name: `bump:${entry}`,
    match: entry,
    increment: "patch",
  };
}

function defaultRules(config: GitVersionConfig): ResolvedRule[] {
  const rules = [
    ...(config.branchRules ?? []),
    ...((config.bump ?? ["develop", "feature"]).map(bumpRule)),
    ...presetRules(config.strategy),
  ];

  return rules.map(normalizeRule);
}

function regexFromMatch(regex: string | RegExp): RegExp {
  if (typeof regex === "string") return new RegExp(regex);
  return new RegExp(regex.source, regex.flags.replace(/[gy]/g, ""));
}

function stringMatchBranch(
  branch: string,
  branchType: string | null,
  value: string
): boolean {
  if (branchType === value) return true;
  if (branch === value) return true;
  if (value.endsWith("/")) return branch.startsWith(value);
  return branch.startsWith(`${value}/`);
}

function ruleMatchBranch(
  match: BranchRuleMatch,
  branch: string,
  branchType: string | null
): boolean {
  if (typeof match === "string") {
    return stringMatchBranch(branch, branchType, match);
  }

  if (match.type !== undefined && branchType !== match.type) return false;
  if (match.exact !== undefined && branch !== match.exact) return false;
  if (match.prefix !== undefined && !branch.startsWith(match.prefix)) {
    return false;
  }
  if (match.regex !== undefined && !regexFromMatch(match.regex).test(branch)) {
    return false;
  }

  return true;
}

function findRule(
  rules: ResolvedRule[],
  branch: string,
  branchType: string | null
): ResolvedRule {
  return (
    rules.find((rule) => ruleMatchBranch(rule.match, branch, branchType)) ?? {
      name: "unknown",
      match: "*",
      increment: "none",
      base: ["branch", "sourceBranch", "tag", "default"],
      sourceAware: false,
    }
  );
}

function applyIncrement(
  version: [number, number, number],
  increment: BranchRuleIncrement
): [number, number, number] {
  const [major, minor, patch] = version;
  switch (increment) {
    case "major":
      return [major + 1, 0, 0];
    case "minor":
      return [major, minor + 1, 0];
    case "patch":
      return [major, minor, patch + 1];
    case "none":
    default:
      return version;
  }
}

function chooseBaseVersion(
  baseOrder: BranchRuleBase[],
  versions: {
    branch: [number, number, number] | null;
    sourceBranch: [number, number, number] | null;
    tag: [number, number, number] | null;
    default: [number, number, number];
  }
): { version: [number, number, number]; source: BranchRuleBase } {
  for (const base of baseOrder) {
    const version = versions[base];
    if (version) return { version, source: base };
  }

  return { version: versions.default, source: "default" };
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
  const { tags, branchType, currentBranch, sourceBranch = null } = gitInfo;
  const { tagPrefix = "v", branchRegex, strategy = "gitflow" } = config;
  const { cwd = process.cwd(), includeCommits = true } = options;

  const rule = findRule(defaultRules(config), currentBranch, branchType);
  const branchVer = parseVersionFromBranch(currentBranch, branchRegex);
  const sourceBranchVer = sourceBranch
    ? parseVersionFromBranch(sourceBranch, branchRegex)
    : null;
  const latestTag = sortTagsDesc(tags, tagPrefix)[0] ?? null;
  const tagged = latestTag ? parseVersionFromTag(latestTag, tagPrefix) : null;
  const base = chooseBaseVersion(rule.base, {
    branch: branchVer,
    sourceBranch: sourceBranchVer,
    tag: tagged,
    default: [0, 1, 0],
  });

  // Get commits since the last tag
  const { commits, count: commitCount } = latestTag
    ? getCommitsSinceLatestTag(latestTag, cwd, includeCommits)
    : { commits: [], count: 0 };

  const [outMajor, outMinor, outPatch] = applyIncrement(
    base.version,
    rule.increment
  );
  const version = fmt(outMajor, outMinor, outPatch, commitCount);

  return {
    version,
    major: outMajor,
    minor: outMinor,
    patch: outPatch,
    branch: currentBranch,
    sourceBranch,
    tag: latestTag || null,
    branchType,
    strategy,
    rule: rule.name,
    baseVersion: fmt(base.version[0], base.version[1], base.version[2]),
    baseSource: base.source,
    increment: rule.increment,
    timestamp: new Date().toISOString(),
    commits, // Include commits in the returned object
  };
}
