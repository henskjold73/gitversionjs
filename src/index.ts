// src/index.ts

import { loadConfig } from "./config.js";
import { getGitInfo } from "./git.js";
import { calculateVersion, GitVersionInfo } from "./version.js";

export async function gitversion(): Promise<GitVersionInfo> {
  const config = await loadConfig();
  const gitInfo = await getGitInfo(config);
  const version = calculateVersion(gitInfo, config);
  return version;
}
