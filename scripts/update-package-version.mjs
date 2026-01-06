import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const rawPackage = readFileSync(new URL("../package.json", import.meta.url), "utf8");
const pkg = JSON.parse(rawPackage);

const stdout = execFileSync(
  "node",
  ["dist/cli.js", "--output", "json", "--no-include-commits"],
  {
    encoding: "utf8",
  }
);
const info = JSON.parse(stdout);

if (!info?.version) {
  throw new Error("gitversionjs did not return a version.");
}

pkg.version = info.version;
writeFileSync(
  new URL("../package.json", import.meta.url),
  `${JSON.stringify(pkg, null, 2)}\n`
);
