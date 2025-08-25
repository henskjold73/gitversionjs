import { describe, expect, it, vi } from "vitest";

import { GitVersionConfig } from "./config.js";
import { GitInfo } from "./git.js";
import { calculateVersion } from "./version.js";

const defaultConfig: GitVersionConfig = {
  tagPrefix: "v",
  branchPrefixes: {
    feature: "feature/",
    release: "release/",
    hotfix: "hotfix/",
  },
};

vi.mock("child_process", () => ({
  execSync: vi.fn(() => "abc123 Commit 1\n"),
}));

describe("calculateVersion", () => {
  it("returns prerelease version for feature branch", () => {
    const gitInfo: GitInfo = {
      currentBranch: "feature/add-login",
      tags: ["v1.2.3"],
      branchType: "feature",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.3.0.1"); // Includes build number
  });

  it("returns next minor version for release branch", () => {
    const gitInfo: GitInfo = {
      currentBranch: "release/1.3.0",
      tags: ["v1.2.3"],
      branchType: "release",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.3.0.1"); // Includes build number
  });

  it("returns patch bump for hotfix branch", () => {
    const gitInfo: GitInfo = {
      currentBranch: "hotfix/fix-crash",
      tags: ["v1.2.3"],
      branchType: "hotfix",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.2.4.1"); // Includes build number
  });

  it("returns latest tag for main branch", () => {
    const gitInfo: GitInfo = {
      currentBranch: "main",
      tags: ["v1.2.3"],
      branchType: null,
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.2.3.1"); // Includes build number
  });

  it("returns default version when no tags exist", () => {
    const gitInfo: GitInfo = {
      currentBranch: "main",
      tags: [],
      branchType: null,
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("0.1.0.0"); // Includes build number (0 commits cuz no tags)
  });

  it("respects custom tag prefix", () => {
    const config: GitVersionConfig = {
      tagPrefix: "release-",
      branchPrefixes: defaultConfig.branchPrefixes,
    };
    const gitInfo: GitInfo = {
      currentBranch: "release/1.3.0",
      tags: ["release-1.2.3"],
      branchType: "release",
    };
    const version = calculateVersion(gitInfo, config);
    expect(version.version).toBe("1.3.0.1"); // Includes build number
  });
});
