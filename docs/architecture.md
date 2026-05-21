# Architecture

GitVersionJS is a small ESM TypeScript package with two public entrypoints:

- library API: `gitversion()` from `src/index.ts`
- CLI: `gitversionjs` from `src/cli.ts`

The package is intentionally thin. Most behavior is direct composition of Git
commands, optional config, and version calculation.

## Runtime Flow

1. `gitversion()` receives optional `cwd`, `configFilePath`, and
   `includeCommits` options.
2. `loadConfig()` reads `.gitversion.config.js` from the target repo root unless
   a config path is provided.
3. `getGitInfo()` runs Git commands in `cwd` to discover the current branch and
   reachable SemVer-like tags.
4. `calculateVersion()` chooses the base version, applies branch rules, counts
   commits since the latest tag, and returns a `GitVersionInfo` object.
5. The CLI prints either `version.version` as text or the whole object as JSON.

## Module Map

### `src/index.ts`

Public library facade. It loads config, collects Git info, and delegates version
calculation. Keep this layer small and predictable.

### `src/config.ts`

Defines `GitVersionConfig` and `loadConfig()`.

Default config:

```ts
{
  tagPrefix: "v",
  strategy: "gitflow",
  bump: ["develop", "feature"],
  branchPrefixes: {
    main: "main",
    develop: "develop",
    feature: "feature/",
    bugfix: "bugfix/",
    release: "release/",
    hotfix: "hotfix/",
    support: "support/",
  },
  branchRules: undefined,
  branchRegex: undefined,
}
```

Config files are loaded as ESM with dynamic `import()`. Missing, malformed, or
invalid config falls back to defaults. Unknown keys are ignored.

### `src/git.ts`

Collects Git state:

- `currentBranch`
- reachable valid tags
- inferred `branchType`
- inferred `sourceBranch` for `feature/*`, `bugfix/*`, and `support/*`

It first asks Git for `git rev-parse --abbrev-ref HEAD`. If that returns
`HEAD`, it tries common CI environment variables, then falls back to
`git name-rev --name-only HEAD`.

Tag discovery prefers `git tag --merged HEAD --list` so only tags reachable from
the current commit are considered. If that command fails, it falls back to all
tags from `git tag --list`.

### `src/version.ts`

Owns the version rules. It parses tags, parses branch-encoded versions for
`release/*`, `hotfix/*`, and `support/*`, applies optional configured branch
regex captures, sorts tags numerically, resolves the first matching branch rule,
applies source branch context when available, and builds the final
`GitVersionInfo`.

Branch rules are resolved in this order:

1. custom `branchRules`
2. compatibility rules generated from `bump`
3. built-in strategy preset rules

The current version format is:

```text
major.minor.patch.build
```

`build` is the number of commits from the latest valid tag to `HEAD`. If there
is no valid tag, the build number is `0`.

### `src/cli.ts`

Commander-based CLI wrapper. It supports:

- `--output text`
- `--output json`
- `--cwd <path>`
- `--no-include-commits`

For text output, commit messages are not collected. For JSON output, commit
messages are included unless `--no-include-commits` is passed.

## Public Return Shape

`gitversion()` returns:

```ts
type GitVersionInfo = {
  version: string;
  major: number;
  minor: number;
  patch: number;
  branch: string;
  sourceBranch: string | null;
  tag: string | null;
  branchType: string | null;
  strategy?: string;
  rule?: string | null;
  baseVersion?: string;
  baseSource?: "branch" | "sourceBranch" | "tag" | "default";
  increment?: "none" | "patch" | "minor" | "major";
  timestamp: string;
  commits: string[];
};
```

## Design Constraints

- Runtime behavior should stay dependency-light.
- Git remains the source of truth for branch, tag, and build metadata.
- Versioning behavior, tests, README examples, and docs should be updated
  together.
- The npm package should ship only `dist/`, `README.md`, and `LICENSE`.
