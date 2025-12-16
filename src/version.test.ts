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

const tags = [
  "16.0.2150",
  "16.22.10",
  "16.23.00",
  "17.00.45",
  "17.13.36",
  "17.19.06",
  "17.19.10",
  "17.19.20",
  "17.22.05",
  "17.22.10",
  "17.22.55",
  "17.23.15",
  "19.4.1",
  "19.5.0",
  "19.6.0",
  "19.6.1",
  "19.7.0",
  "19.7.1",
  "19.7.2",
  "20.1.0",
  "20.2.0",
  "20.3.0",
  "20.4.0",
  "20.4.3",
  "20.5.0",
  "20.7.1",
  "21.1.0",
  "21.2.1",
  "21.3.0",
  "21.5.0",
  "22.1.2",
  "24.3.1",
  "25.2.3",
  "25.3.0",
  "In_production_2017.01.09_22.05",
  "R2000-Test",
  "R2024-5.0",
  "R2024-5.0-test",
  "R2024-5.0.0",
  "R2024test",
  "R2025-1.0.0",
  "R2025-1.2.0",
  "R2025-2.0.0",
  "R20fff",
  "dashboard",
  "v0.1",
];

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
    expect(version.version).toBe("1.2.3.1"); // Includes build number
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

  it("handles a lot of different tags (main)", () => {
    const gitInfo: GitInfo = {
      currentBranch: "main",
      tags,
      branchType: null,
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("25.3.0.1");
  });

  it("handles a lot of different tags (release)", () => {
    const config: GitVersionConfig = {
      tagPrefix: "",
      branchPrefixes: {
        main: "main",
        develop: "develop",
        feature: "feature/",
        release: "release/",
        hotfix: "hotfix/",
      },
    };

    const gitInfo: GitInfo = {
      currentBranch: "release/R2025-3.0",
      tags,
      branchType: null,
    };
    const version = calculateVersion(gitInfo, config);
    expect(version.version).toBe("25.3.0.1");
  });
});
