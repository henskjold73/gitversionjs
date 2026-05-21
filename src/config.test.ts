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

  it("loads full custom config", async () => {
    const customConfig: GitVersionConfig = {
      tagPrefix: "custom-",
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
