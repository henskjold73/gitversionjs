import { spawn } from "child_process";
import path from "path";
import { describe, expect, it } from "vitest";

function runCli(
  args: string[] = []
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const cliPath = path.resolve(__dirname, "cli.ts");
    const proc = spawn("node", [
      "--no-warnings",
      "--loader",
      "ts-node/esm",
      cliPath,
      ...args,
    ]);

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", () => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
    });

    proc.on("error", reject);
  });
}

describe("CLI", () => {
  it("prints version in text format by default", async () => {
    const result = await runCli();
    expect(result.stdout).toMatch(/^\d+\.\d+\.\d+\.\d+$/); // Includes build number
    expect(result.stderr).toBe("");
  });

  it("prints version in JSON format with --output json", async () => {
    const result = await runCli(["--output", "json"]);
    const parsed = JSON.parse(result.stdout);

    expect(parsed).toHaveProperty("version");
    expect(parsed.version).toMatch(/^\d+\.\d+\.\d+\.\d+$/); // Includes build number

    expect(parsed).toHaveProperty("major", 0);
    expect(parsed).toHaveProperty("minor", 1);
    expect(parsed).toHaveProperty("patch", 0);
    expect(parsed).toHaveProperty("branch");
    expect(parsed.branch).toEqual(expect.any(String));

    expect(parsed).toHaveProperty("tag", null);
    const branchPrefixes = {
      main: "main",
      develop: "develop",
      feature: "feature/",
      release: "release/",
      hotfix: "hotfix/",
    };
    const expectedBranchType =
      Object.entries(branchPrefixes).find(([, prefix]) =>
        parsed.branch.startsWith(prefix)
      )?.[0] ?? null;
    expect(parsed).toHaveProperty("branchType", expectedBranchType);
    expect(parsed).toHaveProperty("timestamp");

    expect(result.stderr).toBe("");
  });
});
