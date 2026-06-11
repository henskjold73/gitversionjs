#!/usr/bin/env node
import { Command } from "commander";
import { encode } from "@toon-format/toon";

import { gitversion } from "./index.js";

const program = new Command();
const outputFormats = ["text", "json", "toon"] as const;
type OutputFormat = (typeof outputFormats)[number];

program
  .name("gitversionjs")
  .description("Generate semantic version from Git tags and branches")
  .option("--output <format>", "Output format: text, json, or toon", "text")
  .option("--cwd <path>", "Path to repository root")
  .option(
    "--no-include-commits",
    "Exclude commit list from JSON and TOON output"
  )
  .parse(process.argv);

const options = program.opts();
const red = (message: string) => `\u001b[31m${message}\u001b[0m`;
const isOutputFormat = (value: unknown): value is OutputFormat =>
  typeof value === "string" &&
  outputFormats.includes(value as OutputFormat);

(async () => {
  try {
    if (!isOutputFormat(options.output)) {
      throw new Error(
        `Unsupported output format "${options.output}". Use text, json, or toon.`
      );
    }

    const includeCommits =
      options.output === "json" || options.output === "toon"
        ? options.includeCommits
        : false;
    const version = await gitversion({
      cwd: options.cwd,
      includeCommits,
    });

    for (const warning of version.warnings ?? []) {
      console.error(red(warning));
    }

    if (options.output === "json") {
      console.log(JSON.stringify(version, null, 2));
    } else if (options.output === "toon") {
      console.log(encode(version));
    } else {
      console.log(version.version);
    }
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
