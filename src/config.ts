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

export async function loadConfig(
  configFilePath?: string
): Promise<GitVersionConfig> {
  const configPath =
    configFilePath ?? path.resolve(process.cwd(), ".gitversion.config.js");

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
