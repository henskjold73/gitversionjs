import { describe, expect, it } from "vitest";

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

describe("calculateVersion", () => {
  it("returns prerelease version for feature branch", () => {
    const gitInfo: GitInfo = {
      currentBranch: "feature/add-login",
      tags: ["v1.2.3"],
      branchType: "feature",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toMatch(/^1\.2\.3-beta\.\d+$/);
  });

  it("returns next minor version for release branch", () => {
    const gitInfo: GitInfo = {
      currentBranch: "release/1.3.0",
      tags: ["v1.2.3"],
      branchType: "release",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.3.0");
  });

  it("returns patch bump for hotfix branch", () => {
    const gitInfo: GitInfo = {
      currentBranch: "hotfix/fix-crash",
      tags: ["v1.2.3"],
      branchType: "hotfix",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.2.4");
  });

  it("returns latest tag for main branch", () => {
    const gitInfo: GitInfo = {
      currentBranch: "main",
      tags: ["v1.2.3"],
      branchType: null,
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.2.3");
  });

  it("returns default version when no tags exist", () => {
    const gitInfo: GitInfo = {
      currentBranch: "main",
      tags: [],
      branchType: null,
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("0.1.0");
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
    expect(version.version).toBe("1.3.0");
  });
});
