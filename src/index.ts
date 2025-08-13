// src/index.ts

import { loadConfig } from "./config";
import { getGitInfo } from "./git";
import { calculateVersion } from "./version";

export async function gitversion(): Promise<string> {
  const config = await loadConfig();
  const gitInfo = await getGitInfo(config);
  const version = calculateVersion(gitInfo, config);
  return version;
}
