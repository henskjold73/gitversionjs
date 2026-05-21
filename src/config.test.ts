import fs from "fs/promises";
import path from "path";
import { describe, expect, it } from "vitest";

import { GitVersionConfig, loadConfig } from "./config.js";

const fixturesDir = path.resolve(process.cwd(), "__tests__/fixtures");

async function writeTempConfig(
  filename: string,
  content: string
): Promise<string> {
  const filePath = path.join(fixturesDir, filename);
  await fs.mkdir(fixturesDir, { recursive: true });
  await fs.writeFile(filePath, content);
  return filePath;
}

describe("loadConfig", () => {
  it("returns default config when file is missing", async () => {
    const config = await loadConfig("nonexistent.js");
    expect(config.tagPrefix).toBe("v");
    expect(config.strategy).toBe("gitflow");
    expect(config.bump).toEqual(["develop", "feature"]);
    expect(config.branchPrefixes).toEqual({
      main: "main",
      develop: "develop",
      feature: "feature/",
      bugfix: "bugfix/",
      release: "release/",
      hotfix: "hotfix/",
      support: "support/",
    });
  });

  it("loads branch rules and strategy", async () => {
    const filePath = await writeTempConfig(
      "branch-rules-config.js",
      `export default {
        strategy: "github-flow",
        branchRules: [
          { name: "main", match: { exact: "main" }, increment: "none" },
          { name: "feature", match: { prefix: "feature/" }, increment: "minor", base: ["tag", "default"], sourceAware: true },
          { name: "maintenance", match: { regex: /^support\\// }, increment: "patch" }
        ]
      };`
    );

    const config = await loadConfig(filePath);

    expect(config.strategy).toBe("github-flow");
    expect(config.branchRules).toHaveLength(3);
    expect(config.branchRules?.[1]).toMatchObject({
      name: "feature",
      increment: "minor",
      base: ["tag", "default"],
      sourceAware: true,
    });
    expect(
      typeof config.branchRules?.[2].match === "object" &&
        config.branchRules[2].match.regex
    ).toBeInstanceOf(RegExp);
  });

  it("ignores invalid branch rules and strategy", async () => {
    const filePath = await writeTempConfig(
      "invalid-branch-rules-config.js",
      `export default {
        strategy: "unknown",
        branchRules: [
          { name: "feature", match: { prefix: "feature/" }, increment: "banana" }
        ]
      };`
    );

    const config = await loadConfig(filePath);

    expect(config.strategy).toBe("gitflow");
    expect(config.branchRules).toBeUndefined();
  });

  it("loads full custom config", async () => {
    const customConfig: GitVersionConfig = {
      tagPrefix: "custom-",
      bump: ["dev", "feature/", "hotfix"],
      branchPrefixes: {
        feature: "feat/",
        release: "rel/",
        hotfix: "fix/",
      },
    };
    const filePath = await writeTempConfig(
      "custom-config.js",
      `export default ${JSON.stringify(customConfig)};`
    );
    const config = await loadConfig(filePath);
    expect(config.tagPrefix).toBe("custom-");
    expect(config.bump).toEqual(customConfig.bump);
    expect(config.branchPrefixes).toEqual(customConfig.branchPrefixes);
  });

  it("loads custom branch regex", async () => {
    const filePath = await writeTempConfig(
      "branch-regex-config.js",
      `export default { branchRegex: /^(?:hotfix|release)\\/R(\\d+)-(\\d+)\\.(\\d+)$/ };`
    );
    const config = await loadConfig(filePath);
    expect(config.branchRegex).toBeInstanceOf(RegExp);
    expect("release/R2026-1.5".match(config.branchRegex as RegExp)?.slice(1)).toEqual([
      "2026",
      "1",
      "5",
    ]);
  });

  it("merges partial config with defaults", async () => {
    const partialConfig = { tagPrefix: "partial-" };
    const filePath = await writeTempConfig(
      "partial-config.js",
      `export default ${JSON.stringify(partialConfig)};`
    );
    const config = await loadConfig(filePath);
    expect(config.tagPrefix).toBe("partial-");
    expect(config.branchPrefixes).toEqual({
      main: "main",
      develop: "develop",
      feature: "feature/",
      bugfix: "bugfix/",
      release: "release/",
      hotfix: "hotfix/",
      support: "support/",
    });
  });

  it("falls back to default config if file is malformed", async () => {
    const filePath = await writeTempConfig(
      "malformed-config.js",
      `export default { tagPrefix: "v", branchPrefixes: "not-an-object" };`
    );
    const config = await loadConfig(filePath);
    expect(config.tagPrefix).toBe("v");
    expect(config.branchPrefixes).toEqual({
      main: "main",
      develop: "develop",
      feature: "feature/",
      bugfix: "bugfix/",
      release: "release/",
      hotfix: "hotfix/",
      support: "support/",
    });
  });

  it("ignores unknown keys in config", async () => {
    const extendedConfig = {
      tagPrefix: "custom-",
      unknownKey: "shouldBeIgnored",
    };
    const filePath = await writeTempConfig(
      "extended-config.js",
      `export default ${JSON.stringify(extendedConfig)};`
    );
    const config = await loadConfig(filePath);
    expect(config.tagPrefix).toBe("custom-");
    expect((config as any).unknownKey).toBeUndefined();
  });
});
