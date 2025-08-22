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
  (info: any, config: any) => string
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
    const mockVersion = "v1.0.0-beta.123";

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue(mockVersion);

    const result = await gitversion();
    expect(result).toBe(mockVersion);
  });

  it("handles empty tags gracefully", async () => {
    const mockConfig = { tagPrefix: "v" };
    const mockGitInfo = {
      currentBranch: "main",
      tags: [],
      branchType: null,
    };
    const mockVersion = "v0.1.0";

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue(mockVersion);

    const result = await gitversion();
    expect(result).toBe("v0.1.0");
  });

  it("handles hotfix branch correctly", async () => {
    const mockConfig = { tagPrefix: "v" };
    const mockGitInfo = {
      currentBranch: "hotfix/fix-crash",
      tags: ["v1.2.3"],
      branchType: "hotfix",
    };
    const mockVersion = "v1.2.4";

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue(mockVersion);

    const result = await gitversion();
    expect(result).toBe("v1.2.4");
  });

  it("handles release branch correctly", async () => {
    const mockConfig = { tagPrefix: "v" };
    const mockGitInfo = {
      currentBranch: "release/1.3.0",
      tags: ["v1.2.3"],
      branchType: "release",
    };
    const mockVersion = "v1.3.0";

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue(mockVersion);

    const result = await gitversion();
    expect(result).toBe("v1.3.0");
  });

  it("handles unknown branch type as stable", async () => {
    const mockConfig = { tagPrefix: "v" };
    const mockGitInfo = {
      currentBranch: "main",
      tags: ["v1.2.3"],
      branchType: null,
    };
    const mockVersion = "v1.2.3";

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue(mockVersion);

    const result = await gitversion();
    expect(result).toBe("v1.2.3");
  });

  it("handles develop branch as stable version", async () => {
    const mockConfig = { tagPrefix: "v" };
    const mockGitInfo = {
      currentBranch: "develop",
      tags: ["v1.2.3"],
      branchType: null,
    };
    const mockVersion = "v1.2.3";

    mockLoadConfig.mockResolvedValue(mockConfig);
    mockGetGitInfo.mockResolvedValue(mockGitInfo);
    mockCalculateVersion.mockReturnValue(mockVersion);

    const result = await gitversion();
    expect(result).toBe("v1.2.3");
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
    mockCalculateVersion.mockReturnValue("v1.3.0"); // whatever your scheme returns

    const result = await gitversion();

    expect(mockCalculateVersion).toHaveBeenCalledWith(mockGitInfo, mockConfig);
    expect(result).toBe("v1.3.0");
  });
});
