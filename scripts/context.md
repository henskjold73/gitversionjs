# Scripts Context

## Purpose

This folder holds repository maintenance scripts rather than public runtime code.

## `update-package-version.mjs`

This script:

1. reads the root `package.json`
2. runs `node dist/cli.js --output json --no-include-commits`
3. parses the computed version
4. rewrites `package.json` with that version

## Assumptions

- `dist/cli.js` already exists, so CI must build before running this script
- the current checkout has Git tags available locally
- the CLI returns valid JSON with a `version` field
- it rewrites the root `package.json`; this is expected in CI but should be handled carefully in local worktrees

## Why It Exists

The package version published to npm is aligned with the computed Git-derived version instead of being manually maintained in source control.

## Editing Risks

- If CLI output shape changes, this script breaks
- If build artifacts are missing, CI publish flow breaks
- If the computed version format changes, npm package versioning behavior changes too
- If npm ever rejects the four-part version format, this script/release flow will be the place where that failure appears
