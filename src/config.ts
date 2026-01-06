// src/config.ts

import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

export interface GitVersionConfig {
  tagPrefix?: string;
  branchPrefixes?: Record<string, string>;
}

const defaultConfig: GitVersionConfig = {
  tagPrefix: "v",
  branchPrefixes: {
    main: "main",
    develop: "develop",
    feature: "feature/",
    release: "release/",
    hotfix: "hotfix/",
  },
};

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

    if (
      typeof rawConfig.branchPrefixes === "object" &&
      rawConfig.branchPrefixes !== null &&
      !Array.isArray(rawConfig.branchPrefixes)
    ) {
      validatedConfig.branchPrefixes = rawConfig.branchPrefixes;
    }

    return {
      ...defaultConfig,
      ...validatedConfig,
    };
  } catch {
    return defaultConfig;
  }
}
