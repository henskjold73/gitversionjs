// src/index.ts

import { LoadConfigOptions, loadConfig } from "./config.js";
import { getGitInfo } from "./git.js";
import { calculateVersion, GitVersionInfo } from "./version.js";

export type GitVersionOptions = LoadConfigOptions & {
  includeCommits?: boolean;
};

export async function gitversion(
  options: GitVersionOptions = {}
): Promise<GitVersionInfo> {
  const config = await loadConfig(options);
  const gitInfo = await getGitInfo(config, { cwd: options.cwd });
  const needsOptions =
    options.cwd !== undefined || options.includeCommits !== undefined;
  const version = needsOptions
    ? calculateVersion(gitInfo, config, options)
    : calculateVersion(gitInfo, config);
  return version;
}
