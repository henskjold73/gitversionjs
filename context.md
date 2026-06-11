# Repository Context

## Purpose

`gitversionjs` is a small TypeScript package that derives a SemVer-like version from Git state.

It supports two entrypoints:

- Library API via `src/index.ts`
- CLI via `src/cli.ts`

The computed version format is usually `major.minor.patch.build`, where `build` is the count of commits since the latest matching tag. `feature/*` and `support/*` use SemVer build metadata instead: `major.minor.patch+branch-slug`.

## Layout

- `src/`: core library, CLI, and tests
- `scripts/`: repo maintenance helpers used by CI
- `docs/`: maintainer documentation for architecture, versioning, development, and GitHub project state
- top-level `README.md`: user-facing behavior and examples

## Important Runtime Flow

1. `gitversion()` in `src/index.ts` loads config from `.gitversion.config.js`
2. `getGitInfo()` in `src/git.ts` reads current branch and matching tags
3. `calculateVersion()` in `src/version.ts` resolves a branch rule, selects a base version, applies any increment, and appends either the build number or branch metadata slug
4. `src/cli.ts` prints either plain text or JSON

## Branch Rules In Code

- Branch behavior now goes through ordered rules: custom `branchRules`, compatibility `bump` rules, then a strategy preset.
- The default strategy is `gitflow` and preserves historical behavior.
- Built-in strategies are `gitflow`, `github-flow`, `trunk-based`, `gitlab-flow`, and `release-train`.
- Rules can match exact names, prefixes, regexes, or inferred branch types; increments are `none`, `patch`, `minor`, and `major`.
- Rule base priority can use branch-encoded versions, inferred source branch versions, tags, and the default `0.1.0`.

## Operational Notes

- Config is optional and loaded from `.gitversion.config.js` in the target repo root.
- Legacy `branchPrefixes`, `bump`, and `branchRegex` config remain supported.
- Only tags matching the configured prefix and a numeric `X`, `X.Y`, or `X.Y.Z` shape are considered.
- CI and detached HEAD support depend partly on environment-variable fallback in `src/git.ts`.
- Source branch detection for `feature/*`, `bugfix/*`, and `support/*` depends on available local or remote refs.
- Commit counts are bounded with `git rev-list --count --max-count=10001`; histories above 10,000 commits after the latest tag cap the build number at `9999`, skip commit collection, and warn in the CLI.
- Source branch inference only considers likely long-lived source branches and caps candidates to avoid spawning unbounded Git processes in large repos.
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
