// src/config.ts

import fs from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";

export interface GitVersionConfig {
  "tag-prefix"?: string;
  "branch-prefixes"?: Record<string, string>;
}

const defaultConfig: GitVersionConfig = {
  "tag-prefix": "v",
  "branch-prefixes": {
    feature: "feature/",
    release: "release/",
    hotfix: "hotfix/",
  },
};

export async function loadConfig(): Promise<GitVersionConfig> {
  const configPath = path.resolve(process.cwd(), ".gitversion.config.js");

  try {
    await fs.access(configPath);
    const configModule = await import(pathToFileURL(configPath).href);
    return {
      ...defaultConfig,
      ...configModule.default,
    };
  } catch (err) {
    // File doesn't exist or failed to load
    return defaultConfig;
  }
}
