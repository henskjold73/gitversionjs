import { execSync } from "child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GitVersionConfig } from "./config.js";
import { GitInfo } from "./git.js";
import { calculateVersion } from "./version.js";

const defaultConfig: GitVersionConfig = {
  tagPrefix: "v",
  branchPrefixes: {
    feature: "feature/",
    bugfix: "bugfix/",
    release: "release/",
    hotfix: "hotfix/",
    support: "support/",
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

const mockExecSync = vi.mocked(execSync);

describe("calculateVersion", () => {
  beforeEach(() => {
    mockExecSync.mockReset();
    mockExecSync.mockImplementation((command) => {
      if (String(command).startsWith("git rev-list --count ")) {
        return "1\n" as any;
      }

      return "abc123 Commit 1\n" as any;
    });
  });

  it("returns build metadata slug for feature branch", () => {
    const gitInfo: GitInfo = {
      currentBranch: "feature/add-login",
      tags: ["v1.2.3"],
      branchType: "feature",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.2.3+add-login");
  });

  it("sanitizes feature branch names for SemVer build metadata", () => {
    const gitInfo: GitInfo = {
      currentBranch: "feature/Jira_123/Add login!",
      tags: ["v1.2.3"],
      branchType: "feature",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.2.3+jira-123-add-login");
  });

  it("uses the default bump config when bump is not set", () => {
    const config: GitVersionConfig = {
      tagPrefix: "v",
      branchPrefixes: defaultConfig.branchPrefixes,
    };
    const gitInfo: GitInfo = {
      currentBranch: "develop",
      tags: ["v1.2.3"],
      branchType: "develop",
    };

    const version = calculateVersion(gitInfo, config);

    expect(version.version).toBe("1.2.4.1");
  });

  it("only bumps configured branch types", () => {
    const config: GitVersionConfig = {
      ...defaultConfig,
      bump: ["hotfix"],
    };

    const developVersion = calculateVersion(
      {
        currentBranch: "develop",
        tags: ["v1.2.3"],
        branchType: "develop",
      },
      config
    );
    const hotfixVersion = calculateVersion(
      {
        currentBranch: "hotfix/fix-crash",
        tags: ["v1.2.3"],
        branchType: "hotfix",
      },
      config
    );

    expect(developVersion.version).toBe("1.2.3.1");
    expect(hotfixVersion.version).toBe("1.2.4.1");
  });

  it("bumps branches by configured branch name prefix", () => {
    const config: GitVersionConfig = {
      ...defaultConfig,
      bump: ["dev", "feature/"],
    };

    const devVersion = calculateVersion(
      {
        currentBranch: "dev",
        tags: ["v1.2.3"],
        branchType: null,
      },
      config
    );
    const featureVersion = calculateVersion(
      {
        currentBranch: "feature/add-login",
        tags: ["v1.2.3"],
        branchType: null,
      },
      config
    );
    const hotfixVersion = calculateVersion(
      {
        currentBranch: "hotfix/fix-crash",
        tags: ["v1.2.3"],
        branchType: null,
      },
      config
    );

    expect(devVersion.version).toBe("1.2.4.1");
    expect(featureVersion.version).toBe("1.2.4+add-login");
    expect(hotfixVersion.version).toBe("1.2.3.1");
  });

  it("uses custom branch rules before compatibility bump rules", () => {
    const config: GitVersionConfig = {
      ...defaultConfig,
      branchRules: [
        {
          name: "develop-minor",
          match: { type: "develop" },
          increment: "minor",
        },
      ],
    };
    const gitInfo: GitInfo = {
      currentBranch: "develop",
      tags: ["v1.2.3"],
      branchType: "develop",
    };

    const version = calculateVersion(gitInfo, config);

    expect(version.version).toBe("1.3.0.1");
    expect(version.rule).toBe("develop-minor");
    expect(version.increment).toBe("minor");
    expect(version.baseVersion).toBe("1.2.3");
    expect(version.baseSource).toBe("tag");
  });

  it("supports major and minor increments from branch rules", () => {
    const minorVersion = calculateVersion(
      {
        currentBranch: "next",
        tags: ["v1.2.3"],
        branchType: null,
      },
      {
        ...defaultConfig,
        branchRules: [
          { name: "next", match: { exact: "next" }, increment: "minor" },
        ],
      }
    );
    const majorVersion = calculateVersion(
      {
        currentBranch: "breaking/api",
        tags: ["v1.2.3"],
        branchType: null,
      },
      {
        ...defaultConfig,
        branchRules: [
          { name: "breaking", match: { prefix: "breaking/" }, increment: "major" },
        ],
      }
    );

    expect(minorVersion.version).toBe("1.3.0.1");
    expect(majorVersion.version).toBe("2.0.0.1");
  });

  it("lets branch rules choose base version priority", () => {
    const config: GitVersionConfig = {
      ...defaultConfig,
      branchRules: [
        {
          name: "release-from-tag",
          match: { type: "release" },
          base: ["tag", "default"],
          increment: "patch",
        },
      ],
    };
    const gitInfo: GitInfo = {
      currentBranch: "release/9.0.0",
      tags: ["v1.2.3"],
      branchType: "release",
    };

    const version = calculateVersion(gitInfo, config);

    expect(version.version).toBe("1.2.4.1");
    expect(version.baseSource).toBe("tag");
  });

  it("supports named strategy presets", () => {
    const gitInfo: GitInfo = {
      currentBranch: "bugfix/fix-crash",
      tags: ["v1.2.3"],
      branchType: "bugfix",
    };

    const gitflowVersion = calculateVersion(gitInfo, {
      ...defaultConfig,
      strategy: "gitflow",
      bump: [],
    });
    const githubFlowVersion = calculateVersion(gitInfo, {
      ...defaultConfig,
      strategy: "github-flow",
      bump: [],
    });

    expect(gitflowVersion.version).toBe("1.2.3.1");
    expect(githubFlowVersion.version).toBe("1.2.4.1");
    expect(githubFlowVersion.strategy).toBe("github-flow");
    expect(githubFlowVersion.rule).toBe("bugfix");
  });

  it("uses branch encoded version for release branch", () => {
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
    expect(version.version).toBe("1.2.3.1"); // Includes build number, no bump
  });

  it("returns latest tag for main branch", () => {
    const gitInfo: GitInfo = {
      currentBranch: "main",
      tags: ["v1.2.3"],
      branchType: "main",
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
        bugfix: "bugfix/",
        release: "release/",
        hotfix: "hotfix/",
        support: "support/",
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

  it("keeps base version for hotfix branches without an encoded version", () => {
    const gitInfo: GitInfo = {
      currentBranch: "hotfix/fix-crash",
      tags: ["v1.2.3"],
      branchType: "hotfix",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.2.3.1");
  });

  it("uses branch-encoded version for hotfix branches when present", () => {
    const gitInfo: GitInfo = {
      currentBranch: "hotfix/2.0.1",
      tags: ["v1.2.3"],
      branchType: "hotfix",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("2.0.1.1");
  });

  it("uses default release-year branch names as branch-encoded versions", () => {
    const gitInfo: GitInfo = {
      currentBranch: "release/R2026-2.0",
      tags: ["26.2.0"],
      branchType: "release",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("26.2.0.1");
    expect([version.major, version.minor, version.patch]).toEqual([26, 2, 0]);
  });

  it("uses configured branch regex when no tags exist", () => {
    const config: GitVersionConfig = {
      ...defaultConfig,
      tagPrefix: "",
      branchRegex: /^(?:hotfix|release)\/R(\d+)-(\d+)\.(\d+)$/,
    };

    for (const branchType of ["hotfix", "release"] as const) {
      const gitInfo: GitInfo = {
        currentBranch: `${branchType}/R2026-1.5`,
        tags: [],
        branchType,
      };
      const version = calculateVersion(gitInfo, config);
      expect(version.version).toBe("2026.1.5.0");
      expect(version.tag).toBeNull();
    }
  });

  it("uses configured branch regex with named version groups", () => {
    const config: GitVersionConfig = {
      ...defaultConfig,
      tagPrefix: "",
      branchRegex: "^(?:hotfix|release)/R\\d+-(?<major>\\d+)\\.(?<minor>\\d+)$",
    };
    const gitInfo: GitInfo = {
      currentBranch: "release/R2026-1.5",
      tags: [],
      branchType: "release",
    };
    const version = calculateVersion(gitInfo, config);
    expect(version.version).toBe("1.5.0.0");
  });

  it("can extract a two-digit year version from hotfix branch names", () => {
    const config: GitVersionConfig = {
      ...defaultConfig,
      tagPrefix: "",
      branchRegex: /^(?:hotfix|release)\/R20(\d+)-(\d+)\.(\d+)$/,
    };

    for (const branchType of ["hotfix", "release"] as const) {
      const gitInfo: GitInfo = {
        currentBranch: `${branchType}/R2026-1.5`,
        tags: [],
        branchType,
      };
      const version = calculateVersion(gitInfo, config);
      expect(version.version).toBe("26.1.5.0");
      expect([version.major, version.minor, version.patch]).toEqual([26, 1, 5]);
    }
  });

  it("uses branch-encoded version for release branches with partial versions", () => {
    const gitInfo: GitInfo = {
      currentBranch: "release/2.1",
      tags: ["v1.9.9"],
      branchType: "release",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("2.1.0.1");
    expect(version.major).toBe(2);
    expect(version.minor).toBe(1);
    expect(version.patch).toBe(0);
  });

  it("keeps base version for release branches without an encoded version", () => {
    const gitInfo: GitInfo = {
      currentBranch: "release/stabilize",
      tags: ["v1.2.3"],
      branchType: "release",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.2.3.1");
  });

  it("uses source branch version before bumping feature patch", () => {
    const gitInfo: GitInfo = {
      currentBranch: "feature/invoice-filter",
      sourceBranch: "release/2.1",
      tags: ["v1.9.9"],
      branchType: "feature",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("2.1.0+invoice-filter");
  });

  it("keeps source branch version for bugfix branches", () => {
    const gitInfo: GitInfo = {
      currentBranch: "bugfix/invoice-rounding",
      sourceBranch: "release/2.1",
      tags: ["v1.9.9"],
      branchType: "bugfix",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("2.1.0.1");
  });

  it("uses support branch encoded versions without bumping", () => {
    const gitInfo: GitInfo = {
      currentBranch: "support/1.2",
      tags: ["v1.9.9"],
      branchType: "support",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.2.0+1-2");
  });

  it("counts commits without returning the commit list when includeCommits is false", () => {
    mockExecSync.mockReturnValue("7\n" as any);

    const gitInfo: GitInfo = {
      currentBranch: "feature/add-login",
      tags: ["v1.2.3"],
      branchType: "feature",
    };
    const version = calculateVersion(gitInfo, defaultConfig, {
      includeCommits: false,
      cwd: "/repo",
    });

    expect(version.version).toBe("1.2.3+add-login");
    expect(version.commits).toEqual([]);
    expect(mockExecSync).toHaveBeenCalledWith(
      "git rev-list --count --max-count=10001 v1.2.3..HEAD",
      {
        cwd: "/repo",
        encoding: "utf-8",
      }
    );
  });

  it("collects commits in pages when the commit log is large", () => {
    mockExecSync.mockImplementation((command) => {
      const commandText = String(command);

      if (commandText.startsWith("git rev-list --count ")) {
        return "1001\n" as any;
      }

      if (commandText.includes("--skip=0")) {
        return "abc123 Commit 1\n" as any;
      }

      if (commandText.includes("--skip=1000")) {
        return "def456 Commit 1001\n" as any;
      }

      return "" as any;
    });

    const gitInfo: GitInfo = {
      currentBranch: "feature/add-login",
      tags: ["v1.2.3"],
      branchType: "feature",
    };
    const version = calculateVersion(gitInfo, defaultConfig, { cwd: "/repo" });

    expect(version.version).toBe("1.2.3+add-login");
    expect(version.commits).toEqual(["abc123 Commit 1", "def456 Commit 1001"]);
    expect(mockExecSync).toHaveBeenCalledWith(
      "git rev-list --count --max-count=10001 v1.2.3..HEAD",
      {
        cwd: "/repo",
        encoding: "utf-8",
      }
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      'git log v1.2.3..HEAD --pretty=format:"%h %s" --max-count=1000 --skip=0',
      { cwd: "/repo", encoding: "utf-8" }
    );
    expect(mockExecSync).toHaveBeenCalledWith(
      'git log v1.2.3..HEAD --pretty=format:"%h %s" --max-count=1000 --skip=1000',
      { cwd: "/repo", encoding: "utf-8" }
    );
  });

  it("caps build number and skips commit collection after 10000 commits", () => {
    mockExecSync.mockImplementation((command) => {
      const commandText = String(command);

      if (commandText.startsWith("git rev-list --count ")) {
        return "10001\n" as any;
      }

      return "abc123 Commit 1\n" as any;
    });

    const gitInfo: GitInfo = {
      currentBranch: "main",
      tags: ["v1.2.3"],
      branchType: "main",
    };
    const version = calculateVersion(gitInfo, defaultConfig, { cwd: "/repo" });

    expect(version.version).toBe("1.2.3.9999");
    expect(version.commits).toEqual([]);
    expect(version.warnings).toEqual([
      "More than 10000 commits were found after the latest tag. Build number was capped at 9999. Add a new tag soon to avoid slow version calculation.",
    ]);
    expect(mockExecSync).not.toHaveBeenCalledWith(
      expect.stringContaining("git log"),
      expect.anything()
    );
  });

  it("returns branch metadata and empty commits when no tags exist", () => {
    const gitInfo: GitInfo = {
      currentBranch: "develop",
      tags: [],
      branchType: "develop",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("0.1.1.0");
    expect(version.branch).toBe("develop");
    expect(version.tag).toBeNull();
    expect(version.branchType).toBe("develop");
    expect(version.commits).toEqual([]);
  });

  it("sorts tags numerically instead of lexically", () => {
    const gitInfo: GitInfo = {
      currentBranch: "main",
      tags: ["v1.2.9", "v1.2.10", "v1.10.0"],
      branchType: "main",
    };
    const version = calculateVersion(gitInfo, defaultConfig);
    expect(version.version).toBe("1.10.0.1");
    expect(version.tag).toBe("v1.10.0");
  });
});
