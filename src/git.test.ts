import { exec } from "child_process";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { GitVersionConfig } from "./config.js";
import { getGitInfo } from "./git.js";

vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

const mockExec = exec as unknown as Mock;

const defaultConfig: GitVersionConfig = {
  tagPrefix: "v",
  branchPrefixes: {
    feature: "feature/",
    release: "release/",
    hotfix: "hotfix/",
  },
};

describe("getGitInfo", () => {
  beforeEach(() => {
    mockExec.mockReset();
  });

  it("prefers tags reachable from HEAD", async () => {
    mockExec.mockImplementation((cmd, callback) => {
      if (cmd.includes("rev-parse")) {
        callback(null, { stdout: "feature/add-login\n" });
      } else if (cmd.includes("git tag --merged HEAD --list")) {
        callback(null, { stdout: "v1.0.0\nv1.1.0\n" });
      }
    });

    const info = await getGitInfo(defaultConfig);
    expect(info.tags).toEqual(["v1.0.0", "v1.1.0"]);
    expect(info.branchType).toBe("feature");
  });

  it("returns correct branch and tags", async () => {
    mockExec.mockImplementation((cmd, callback) => {
      if (cmd.includes("rev-parse")) {
        callback(null, { stdout: "feature/add-login\n" });
      } else if (cmd.includes("git tag --merged HEAD --list")) {
        callback(null, { stdout: "v1.0.0\nv1.1.0\nnot-a-tag\n" });
      }
    });

    const info = await getGitInfo(defaultConfig);
    expect(info.currentBranch).toBe("feature/add-login");
    expect(info.tags).toEqual(["v1.0.0", "v1.1.0"]);
    expect(info.branchType).toBe("feature");
  });

  it("returns null branchType if no match", async () => {
    mockExec.mockImplementation((cmd, callback) => {
      if (cmd.includes("rev-parse")) {
        callback(null, { stdout: "main\n" });
      } else if (cmd.includes("git tag --merged HEAD --list")) {
        callback(null, { stdout: "v1.0.0\n" });
      }
    });

    const info = await getGitInfo(defaultConfig);
    expect(info.currentBranch).toBe("main");
    expect(info.branchType).toBeNull();
  });

  it("filters tags by custom prefix", async () => {
    const config: GitVersionConfig = {
      tagPrefix: "release-",
      branchPrefixes: defaultConfig.branchPrefixes,
    };

    mockExec.mockImplementation((cmd, callback) => {
      if (cmd.includes("rev-parse")) {
        callback(null, { stdout: "release/1.2.0\n" });
      } else if (cmd.includes("git tag --merged HEAD --list")) {
        callback(null, { stdout: "release-1.0.0\nrelease-1.1.0\nv1.0.0\n" });
      }
    });

    const info = await getGitInfo(config);
    expect(info.tags).toEqual(["release-1.0.0", "release-1.1.0"]);
    expect(info.branchType).toBe("release");
  });

  it("handles empty tag list", async () => {
    mockExec.mockImplementation((cmd, callback) => {
      if (cmd.includes("rev-parse")) {
        callback(null, { stdout: "hotfix/urgent-fix\n" });
      } else if (cmd.includes("git tag --merged HEAD --list")) {
        callback(null, { stdout: "\n" });
      }
    });

    const info = await getGitInfo(defaultConfig);
    expect(info.tags).toEqual([]);
    expect(info.branchType).toBe("hotfix");
  });

  it("falls back to all tags if merged-tag lookup fails", async () => {
    mockExec.mockImplementation((cmd, callback) => {
      if (cmd.includes("rev-parse")) {
        callback(null, { stdout: "main\n" });
      } else if (cmd.includes("git tag --merged HEAD --list")) {
        callback(new Error("unsupported"), null);
      } else if (cmd.includes("git tag --list")) {
        callback(null, { stdout: "v1.0.0\nv1.1.0\n" });
      }
    });

    const info = await getGitInfo(defaultConfig);
    expect(info.tags).toEqual(["v1.0.0", "v1.1.0"]);
  });

  it("uses CI environment branch name when git reports detached HEAD", async () => {
    const originalHeadRef = process.env.GITHUB_HEAD_REF;
    process.env.GITHUB_HEAD_REF = "feature/from-ci";

    mockExec.mockImplementation((cmd, callback) => {
      if (cmd.includes("rev-parse")) {
        callback(null, { stdout: "HEAD\n" });
      } else if (cmd.includes("git tag --merged HEAD --list")) {
        callback(null, { stdout: "v1.0.0\n" });
      }
    });

    const info = await getGitInfo(defaultConfig);
    expect(info.currentBranch).toBe("feature/from-ci");
    expect(info.branchType).toBe("feature");

    process.env.GITHUB_HEAD_REF = originalHeadRef;
  });

  it("falls back to git name-rev when detached HEAD has no CI branch env", async () => {
    const originalHeadRef = process.env.GITHUB_HEAD_REF;
    const originalRefName = process.env.GITHUB_REF_NAME;
    process.env.GITHUB_HEAD_REF = "";
    process.env.GITHUB_REF_NAME = "";

    mockExec.mockImplementation((cmd, callback) => {
      if (cmd.includes("rev-parse")) {
        callback(null, { stdout: "HEAD\n" });
      } else if (cmd.includes("name-rev")) {
        callback(null, { stdout: "remotes/origin/release/2.1\n" });
      } else if (cmd.includes("git tag --merged HEAD --list")) {
        callback(null, { stdout: "v2.0.0\n" });
      }
    });

    const info = await getGitInfo(defaultConfig);
    expect(info.currentBranch).toBe("release/2.1");
    expect(info.branchType).toBe("release");

    process.env.GITHUB_HEAD_REF = originalHeadRef;
    process.env.GITHUB_REF_NAME = originalRefName;
  });
});
