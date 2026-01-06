#!/usr/bin/env node
import { Command } from "commander";

import { gitversion } from "./index.js";

const program = new Command();

program
  .name("gitversionjs")
  .description("Generate semantic version from Git tags and branches")
  .option("--output <format>", "Output format: text or json", "text")
  .option("--cwd <path>", "Path to repository root")
  .option(
    "--no-include-commits",
    "Exclude commit list from JSON output"
  )
  .parse(process.argv);

const options = program.opts();

(async () => {
  try {
    const includeCommits =
      options.output === "json" ? options.includeCommits : false;
    const version = await gitversion({
      cwd: options.cwd,
      includeCommits,
    });

    if (options.output === "json") {
      console.log(JSON.stringify(version, null, 2));
    } else {
      console.log(version.version);
    }
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
})();
