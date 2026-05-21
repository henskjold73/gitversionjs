// src/config.ts

import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

export interface GitVersionConfig {
  tagPrefix?: string;
  branchPrefixes?: Record<string, string>;
  branchRegex?: string | RegExp;
  bump?: string[];
  strategy?: BranchingStrategy;
  branchRules?: BranchRule[];
}

export type BranchingStrategy =
  | "gitflow"
  | "github-flow"
  | "trunk-based"
  | "gitlab-flow"
  | "release-train";

export type BranchRuleIncrement = "none" | "patch" | "minor" | "major";

export type BranchRuleBase = "branch" | "sourceBranch" | "tag" | "default";

export type BranchRuleMatch =
  | string
  | {
      exact?: string;
      prefix?: string;
      regex?: string | RegExp;
      type?: string;
    };

export interface BranchRule {
  name: string;
  match: BranchRuleMatch;
  increment?: BranchRuleIncrement;
  base?: BranchRuleBase | BranchRuleBase[];
  sourceAware?: boolean;
}

const defaultConfig: GitVersionConfig = {
  tagPrefix: "v",
  strategy: "gitflow",
  bump: ["develop", "feature"],
  branchPrefixes: {
    main: "main",
    develop: "develop",
    feature: "feature/",
    bugfix: "bugfix/",
    release: "release/",
    hotfix: "hotfix/",
    support: "support/",
  },
};

const validStrategies = new Set<BranchingStrategy>([
  "gitflow",
  "github-flow",
  "trunk-based",
  "gitlab-flow",
  "release-train",
]);

const validIncrements = new Set<BranchRuleIncrement>([
  "none",
  "patch",
  "minor",
  "major",
]);

const validBases = new Set<BranchRuleBase>([
  "branch",
  "sourceBranch",
  "tag",
  "default",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    isRecord(value) &&
    Object.values(value).every((entry) => typeof entry === "string")
  );
}

function isValidRuleMatch(value: unknown): value is BranchRuleMatch {
  if (typeof value === "string") return true;
  if (!isRecord(value)) return false;

  return (
    (value.exact === undefined || typeof value.exact === "string") &&
    (value.prefix === undefined || typeof value.prefix === "string") &&
    (value.regex === undefined ||
      typeof value.regex === "string" ||
      value.regex instanceof RegExp) &&
    (value.type === undefined || typeof value.type === "string") &&
    ["exact", "prefix", "regex", "type"].some((key) => value[key] !== undefined)
  );
}

function isValidRuleBase(
  value: unknown
): value is BranchRuleBase | BranchRuleBase[] {
  if (typeof value === "string") return validBases.has(value as BranchRuleBase);
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => validBases.has(entry as BranchRuleBase))
  );
}

function isValidBranchRule(value: unknown): value is BranchRule {
  if (!isRecord(value)) return false;
  if (typeof value.name !== "string" || !value.name) return false;
  if (!isValidRuleMatch(value.match)) return false;
  if (
    value.increment !== undefined &&
    !validIncrements.has(value.increment as BranchRuleIncrement)
  ) {
    return false;
  }
  if (value.base !== undefined && !isValidRuleBase(value.base)) return false;
  if (
    value.sourceAware !== undefined &&
    typeof value.sourceAware !== "boolean"
  ) {
    return false;
  }
  return true;
}

export type LoadConfigOptions = {
  configFilePath?: string;
  cwd?: string;
};

export async function loadConfig(
  options: LoadConfigOptions | string = {}
): Promise<GitVersionConfig> {
  const resolvedOptions =
    typeof options === "string" ? { configFilePath: options } : options;
  const { configFilePath, cwd = process.cwd() } = resolvedOptions;
  const configPath =
    configFilePath ?? path.resolve(cwd, ".gitversion.config.js");

  try {
    await fs.access(configPath);
    const configModule = await import(pathToFileURL(configPath).href);
    const rawConfig = configModule.default;

    const validatedConfig: GitVersionConfig = {};

    if (typeof rawConfig.tagPrefix === "string") {
      validatedConfig.tagPrefix = rawConfig.tagPrefix;
    }

    if (isStringRecord(rawConfig.branchPrefixes)) {
      validatedConfig.branchPrefixes = rawConfig.branchPrefixes;
    }

    if (
      typeof rawConfig.branchRegex === "string" ||
      rawConfig.branchRegex instanceof RegExp
    ) {
      validatedConfig.branchRegex = rawConfig.branchRegex;
    }

    if (
      Array.isArray(rawConfig.bump) &&
      rawConfig.bump.every((entry: unknown) => typeof entry === "string")
    ) {
      validatedConfig.bump = rawConfig.bump;
    }

    if (validStrategies.has(rawConfig.strategy)) {
      validatedConfig.strategy = rawConfig.strategy;
    }

    if (
      Array.isArray(rawConfig.branchRules) &&
      rawConfig.branchRules.every(isValidBranchRule)
    ) {
      validatedConfig.branchRules = rawConfig.branchRules;
    }

    return {
      ...defaultConfig,
      ...validatedConfig,
    };
  } catch {
    return defaultConfig;
  }
}
