# Source Context

## What Lives Here

- `index.ts`: public API surface
- `config.ts`: loads and validates `.gitversion.config.js`
- `git.ts`: reads branch and tag data from Git plus CI env fallback
- `version.ts`: version calculation logic
- `cli.ts`: commander-based CLI wrapper
- `*.test.ts`: unit and light integration coverage

## Module Responsibilities

### `index.ts`

Thin composition layer. It should stay boring.

### `config.ts`

Loads user config with dynamic ESM import and merges valid keys onto defaults:

- `tagPrefix`
- `branchPrefixes`

Malformed or missing config falls back to defaults.

### `git.ts`

Collects:

- `currentBranch`
- filtered semver-like tags
- inferred `branchType`

Important details:

- Handles detached HEAD by checking common CI env vars first
- Falls back to `git name-rev --name-only HEAD`
- Branch type is inferred from configured prefixes, not hardcoded branch parsing

### `version.ts`

This is the real behavior center.

Important details:

- Base version priority is `release/hotfix` branch-encoded version, then latest valid tag, then `0.1.0`
- Tags are sorted numerically after stripping the configured prefix
- Commit count is computed from `latestTag..HEAD`
- `includeCommits` controls whether the commit list is collected, not whether the build count exists
- Branch-encoded versions are parsed only for `release/*` and `hotfix/*` shapes that contain numeric versions

If you change semantics, update tests and `README.md` together.

## Testing Notes

- `cli.test.ts` runs the TypeScript CLI through `ts-node/esm`
- `git.test.ts` mocks `child_process.exec`
- `version.test.ts` mocks `execSync` for commit lookup
- `index.test.ts` is effectively a wiring test and contains some stale type assumptions

## Editing Risks

- `version.ts` mixes pure version math with direct Git command execution for commit history
- `git.ts` branch normalization has CI-specific behavior that is easy to regress in detached HEAD builds
- `tsconfig.json` excludes tests from build output, so only source files in `src/` ship to `dist/`
- CLI text output deliberately avoids collecting commit messages; JSON output includes them unless `--no-include-commits` is passed
