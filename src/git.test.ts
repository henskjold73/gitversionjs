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

  it("returns correct branch and tags", async () => {
    mockExec.mockImplementation((cmd, callback) => {
      if (cmd.includes("rev-parse")) {
        callback(null, { stdout: "feature/add-login\n" });
      } else if (cmd.includes("git tag")) {
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
      } else if (cmd.includes("git tag")) {
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
      } else if (cmd.includes("git tag")) {
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
      } else if (cmd.includes("git tag")) {
        callback(null, { stdout: "\n" });
      }
    });

    const info = await getGitInfo(defaultConfig);
    expect(info.tags).toEqual([]);
    expect(info.branchType).toBe("hotfix");
  });
});
