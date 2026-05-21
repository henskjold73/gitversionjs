# Versioning Rules

GitVersionJS computes a SemVer-like version from Git tags, branch names, and
commit count.

The output format is:

```text
major.minor.patch.build
```

The first three numbers come from a branch-encoded version, a tag, or the
default base. The fourth number is the number of commits since the latest valid
tag.

## Valid Tags

Tags are filtered by `tagPrefix` and numeric version shape.

With the default `tagPrefix: "v"`, these are valid:

- `v1`
- `v1.2`
- `v1.2.3`

These are ignored:

- `1.2.3`
- `release-1.2.3`
- `v1.2.3-beta`
- `dashboard`

With `tagPrefix: ""`, unprefixed numeric tags such as `1.2.3` are valid.

## Base Version Priority

By default, `calculateVersion()` chooses the base version in this order:

1. branch-encoded version from `release/*`, `hotfix/*`, or `support/*`
2. source branch-encoded version, when a source branch is inferred
3. latest valid reachable tag
4. default base `0.1.0`

Custom `branchRules` can override this priority with a `base` list containing
`branch`, `sourceBranch`, `tag`, and `default`.

Branch-encoded versions support:

- `release/2` -> `2.0.0`
- `release/2.1` -> `2.1.0`
- `release/2.1.3` -> `2.1.3`
- `release/R2026-2.0` -> `26.2.0`
- `hotfix/2` -> `2.0.0`
- `hotfix/2.1` -> `2.1.0`
- `hotfix/2.1.3` -> `2.1.3`
- `hotfix/R2026-2.0` -> `26.2.0`

The parser also allows a leading `v` in numeric branch versions.

Config can also provide `branchRegex` as a `RegExp` or string pattern. When it
matches the current branch, numeric captures are interpreted as `major`,
`minor`, and `patch`. Named captures `major`, `minor`, and `patch` are also
supported.

Examples:

- `branchRegex: /^(?:hotfix|release)\/R(\d+)-(\d+)\.(\d+)$/` with
  `hotfix/R2026-1.5` or `release/R2026-1.5` -> `2026.1.5`
- `branchRegex: "^(?:hotfix|release)/R\\d+-(?<major>\\d+)\\.(?<minor>\\d+)$"`
  with `release/R2026-1.5` -> `1.5.0`

## Tag Sorting

Tags are sorted numerically, not lexically. For example, `v1.10.0` is newer
than `v1.2.10`.

Only tags returned by Git discovery and accepted by the configured prefix are
considered.

## Branch Behavior

Branch behavior is resolved through ordered rules. Custom `branchRules` match
first, then compatibility `bump` rules, then the selected strategy preset. The
default strategy is `gitflow`, which preserves the historical behavior below.

Rules can match by exact branch name, branch prefix, regex, or discovered branch
type:

```js
export default {
  branchRules: [
    { name: "next", match: { exact: "next" }, increment: "minor" },
    { name: "breaking", match: { prefix: "breaking/" }, increment: "major" },
    { name: "preview", match: { regex: "^preview/" }, increment: "patch" },
    { name: "release", match: { type: "release" }, increment: "none" },
  ],
};
```

Supported increments are `none`, `patch`, `minor`, and `major`. A major
increment resets minor and patch to `0`; a minor increment resets patch to `0`.

Built-in strategies are `gitflow`, `github-flow`, `trunk-based`,
`gitlab-flow`, and `release-train`.

### `main`

Uses the base version and appends the build number.

Example:

```text
latest tag: v1.2.3
commits since tag: 5
version: 1.2.3.5
```

### `develop`

Bumps patch and appends the build number.

Example:

```text
latest tag: v1.2.3
commits since tag: 5
version: 1.2.4.5
```

### `feature/*`

Same behavior as `develop`: bumps patch and appends the build number. If Git
can infer that the feature branch was taken from a versioned source branch such
as `release/2.1`, that source branch version is used as the base first.

### `release/*`

If the branch name contains a supported version, that version wins.

Example:

```text
branch: release/2.1
latest tag: v1.9.9
commits since tag: 3
version: 2.1.0.3
```

If the release branch does not contain a supported version, the base version is
used unchanged and the build number is appended.

### `bugfix/*`

The base version is used unchanged and the build number is appended. If Git can
infer that the bugfix branch was taken from a versioned source branch such as
`release/2.1`, that source branch version is used as the base first.

### `hotfix/*`

If the branch name contains a supported version, that version wins.

If the hotfix branch does not contain a supported version, the latest tag is
used as the base unchanged and the build number is appended.

### `support/*`

If the support branch name contains a supported version, that version wins.
Otherwise, the base version is used unchanged and the build number is appended.
When Git can infer a versioned source branch, that source branch version is used
as the base.

### Unknown Branches

Unknown branch types use the base version unchanged and append the build number.

## Build Number

When a valid latest tag exists:

- with commits included, the tool runs
  `git log <latestTag>..HEAD --pretty=format:"%h %s"` and counts returned lines
- with commits excluded, the tool runs
  `git rev-list --count <latestTag>..HEAD`

When no valid tag exists, the build number is `0` and the commit list is empty.

`includeCommits` only controls whether commit messages are returned. It does not
remove the build number from the version string.
