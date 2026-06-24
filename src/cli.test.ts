import { spawn } from "child_process";
import path from "path";
import { decode } from "@toon-format/toon";
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

function expectVersionInfoPayload(parsed: Record<string, unknown>) {
  expect(parsed).toHaveProperty("version");
  expect(String(parsed.version)).toMatch(/^\d+\.\d+\.\d+\.\d+$/);

  expect(typeof parsed.major).toBe("number");
  expect(typeof parsed.minor).toBe("number");
  expect(typeof parsed.patch).toBe("number");
  expect(typeof parsed.branch).toBe("string");
  expect(String(parsed.branch).length).toBeGreaterThan(0);

  expect(parsed.tag === null || typeof parsed.tag === "string").toBe(true);
  expect(
    parsed.branchType === null || typeof parsed.branchType === "string"
  ).toBe(true);

  expect(parsed).toHaveProperty("timestamp");
  expect(Array.isArray(parsed.commits)).toBe(true);
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

    expectVersionInfoPayload(parsed);
    expect(result.stderr).toBe("");
  });

  it("prints version in TOON format with --output toon", async () => {
    const jsonResult = await runCli(["--output", "json"]);
    const jsonParsed = JSON.parse(jsonResult.stdout) as Record<
      string,
      unknown
    >;
    const result = await runCli(["--output", "toon"]);
    const parsed = decode(result.stdout) as Record<string, unknown>;

    expectVersionInfoPayload(parsed);
    expect(Object.keys(parsed).sort()).toEqual(Object.keys(jsonParsed).sort());
    expect(result.stdout).toContain("version:");
    expect(result.stdout).toContain("commits[");
    expect(jsonResult.stderr).toBe("");
    expect(result.stderr).toBe("");
  });

  it("reports unsupported output formats", async () => {
    const result = await runCli(["--output", "xml"]);

    expect(result.stdout).toBe("");
    expect(result.stderr).toContain(
      'Unsupported output format "xml". Use text, json, or toon.'
    );
  });
});
