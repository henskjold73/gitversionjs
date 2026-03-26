import { beforeEach, describe, expect, it, vi } from "vitest";

import * as configModule from "./config.js";
import * as gitModule from "./git.js";
import { gitversion } from "./index.js";
import * as versionModule from "./version.js";

type Mock<T extends (...args: any[]) => any> = ReturnType<typeof vi.fn<T>>;

vi.mock("./config.js");
vi.mock("./git.js");
vi.mock("./version.js");

const mockLoadConfig = configModule.loadConfig as Mock<() => Promise<any>>;
const mockGetGitInfo = gitModule.getGitInfo as Mock<
  (config: any) => Promise<any>
>;
const mockCalculateVersion = versionModule.calculateVersion as unknown as Mock<
  (info: any, config: any) => any
>;

describe("gitversion (integration)", () => {
  beforeEach(() => {
    mockLoadConfig.mockReset();
    mockGetGitInfo.mockReset();
    mockCalculateVersion.mockReset();
  });

  it("returns version from full pipeline", async () => {
    const mockConfig = { tagPrefix: "v" };
    const mockGitInfo = {
      currentBranch: "feature/add-login",
      tags: ["v1.0.0"],
      branchType: "feature",
    };
    const mockVersion = {
      version: "1.1.0.123",
      major: 1,
      minor: 1,
      patch: 0,
      branch: "feature/add-login",
      tag: "v1.0.0",
      branchType: "feature",
      timestamp: "2026-01-01T00:00:00.000Z",
      commits: ["abc123 test commit"],
    };

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue(mockVersion);

    const result = await gitversion();
    expect(result).toEqual(mockVersion);
  });

  it("handles empty tags gracefully", async () => {
    const mockConfig = { tagPrefix: "v" };
    const mockGitInfo = {
      currentBranch: "main",
      tags: [],
      branchType: null,
    };
    const mockVersion = {
      version: "0.1.0.0",
      major: 0,
      minor: 1,
      patch: 0,
      branch: "main",
      tag: null,
      branchType: null,
      timestamp: "2026-01-01T00:00:00.000Z",
      commits: [],
    };

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue(mockVersion);

    const result = await gitversion();
    expect(result).toEqual(mockVersion);
  });

  it("handles hotfix branch correctly", async () => {
    const mockConfig = { tagPrefix: "v" };
    const mockGitInfo = {
      currentBranch: "hotfix/fix-crash",
      tags: ["v1.2.3"],
      branchType: "hotfix",
    };
    const mockVersion = {
      version: "1.2.3.1",
      major: 1,
      minor: 2,
      patch: 3,
      branch: "hotfix/fix-crash",
      tag: "v1.2.3",
      branchType: "hotfix",
      timestamp: "2026-01-01T00:00:00.000Z",
      commits: ["abc123 fix crash"],
    };

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue(mockVersion);

    const result = await gitversion();
    expect(result).toEqual(mockVersion);
  });

  it("handles release branch correctly", async () => {
    const mockConfig = { tagPrefix: "v" };
    const mockGitInfo = {
      currentBranch: "release/1.3.0",
      tags: ["v1.2.3"],
      branchType: "release",
    };
    const mockVersion = {
      version: "1.3.0.1",
      major: 1,
      minor: 3,
      patch: 0,
      branch: "release/1.3.0",
      tag: "v1.2.3",
      branchType: "release",
      timestamp: "2026-01-01T00:00:00.000Z",
      commits: ["abc123 release prep"],
    };

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue(mockVersion);

    const result = await gitversion();
    expect(result).toEqual(mockVersion);
  });

  it("handles unknown branch type as stable", async () => {
    const mockConfig = { tagPrefix: "v" };
    const mockGitInfo = {
      currentBranch: "main",
      tags: ["v1.2.3"],
      branchType: null,
    };
    const mockVersion = {
      version: "1.2.3.1",
      major: 1,
      minor: 2,
      patch: 3,
      branch: "main",
      tag: "v1.2.3",
      branchType: null,
      timestamp: "2026-01-01T00:00:00.000Z",
      commits: ["abc123 stable"],
    };

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue(mockVersion);

    const result = await gitversion();
    expect(result).toEqual(mockVersion);
  });

  it("passes through develop branch output from the version calculator", async () => {
    const mockConfig = { tagPrefix: "v" };
    const mockGitInfo = {
      currentBranch: "develop",
      tags: ["v1.2.3"],
      branchType: "develop",
    };
    const mockVersion = {
      version: "1.3.0.2",
      major: 1,
      minor: 3,
      patch: 0,
      branch: "develop",
      tag: "v1.2.3",
      branchType: "develop",
      timestamp: "2026-01-01T00:00:00.000Z",
      commits: ["abc123 develop"],
    };

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue(mockVersion);

    const result = await gitversion();
    expect(result).toEqual(mockVersion);
  });

  it("passes develop branch to the version calculator", async () => {
    const mockConfig = { tagPrefix: "" };
    const mockGitInfo = {
      currentBranch: "develop",
      tags: ["1.2.3"],
      branchType: "develop",
    };

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue({
      version: "1.3.0.1",
      major: 1,
      minor: 3,
      patch: 0,
      branch: "develop",
      tag: "1.2.3",
      branchType: "develop",
      timestamp: "2026-01-01T00:00:00.000Z",
      commits: ["abc123 develop"],
    });

    const result = await gitversion();

    expect(mockCalculateVersion).toHaveBeenCalledWith(mockGitInfo, mockConfig);
    expect(result.version).toBe("1.3.0.1");
  });
});
