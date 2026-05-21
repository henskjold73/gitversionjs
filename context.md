# Repository Context

## Purpose

`gitversionjs` is a small TypeScript package that derives a SemVer-like version from Git state.

It supports two entrypoints:

- Library API via `src/index.ts`
- CLI via `src/cli.ts`

The computed version format is currently `major.minor.patch.build`, where `build` is the count of commits since the latest matching tag.

## Layout

- `src/`: core library, CLI, and tests
- `scripts/`: repo maintenance helpers used by CI
- `docs/`: maintainer documentation for architecture, versioning, development, and GitHub project state
- top-level `README.md`: user-facing behavior and examples

## Important Runtime Flow

1. `gitversion()` in `src/index.ts` loads config from `.gitversion.config.js`
2. `getGitInfo()` in `src/git.ts` reads current branch and matching tags
3. `calculateVersion()` in `src/version.ts` selects a base version and appends the build number
4. `src/cli.ts` prints either plain text or JSON

## Branch Rules In Code

- `main`: uses base version and appends commit count
- `develop`: bumps patch, appends commit count
- `feature/*`: same as `develop`, using an inferred versioned source branch as base when available
- `bugfix/*`: uses an inferred versioned source branch as base when available, otherwise keeps base version
- `release/*`: branch version wins if encoded in branch name, otherwise keeps base version
- `hotfix/*`: branch version wins if encoded in branch name, otherwise keeps base version and appends commit count
- `support/*`: branch version wins if encoded in branch name, otherwise uses an inferred versioned source branch as base when available

## Operational Notes

- Config is optional and loaded from `.gitversion.config.js` in the target repo root.
- Only tags matching the configured prefix and a numeric `X`, `X.Y`, or `X.Y.Z` shape are considered.
- CI and detached HEAD support depend partly on environment-variable fallback in `src/git.ts`.
- Source branch detection for `feature/*`, `bugfix/*`, and `support/*` depends on available local or remote refs.
- The package is intended to publish only `dist/`, `README.md`, and `LICENSE`.

## Current Friction To Keep In Mind

- `README.md` describes branch handling slightly more cleanly than the tests do; trust implementation over older assertions.
- `scripts/update-package-version.mjs` rewrites `package.json` from built CLI output, so build order matters in CI.
- A local `gitversionjs-1.1.0.tgz` exists and is currently untracked; do not assume it should be committed.
- Project has moved from Azure DevOps to GitHub. The old Azure pipeline files were removed.
- npm deployment still needs a dedicated GitHub runbook/workflow covering token setup, approval ownership, version/tag expectations, and release verification.

## Documentation Added

- `docs/architecture.md`
- `docs/versioning-rules.md`
- `docs/development.md`
- `docs/github.md`
- `docs/context.md`

Keep these docs, the README, and tests aligned when behavior changes.

## Useful Commands

```bash
npm test
npm run build
npm pack --dry-run
node dist/cli.js --output json --no-include-commits
```
