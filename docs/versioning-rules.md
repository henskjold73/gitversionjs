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

`calculateVersion()` chooses the base version in this order:

1. branch-encoded version from `release/*` or `hotfix/*`
2. latest valid reachable tag
3. default base `0.1.0`

Branch-encoded versions support:

- `release/2` -> `2.0.0`
- `release/2.1` -> `2.1.0`
- `release/2.1.3` -> `2.1.3`
- `hotfix/2` -> `2.0.0`
- `hotfix/2.1` -> `2.1.0`
- `hotfix/2.1.3` -> `2.1.3`

The parser also allows a leading `v` in those branch versions.

## Tag Sorting

Tags are sorted numerically, not lexically. For example, `v1.10.0` is newer
than `v1.2.10`.

Only tags returned by Git discovery and accepted by the configured prefix are
considered.

## Branch Behavior

### `main`

Uses the base version and appends the build number.

Example:

```text
latest tag: v1.2.3
commits since tag: 5
version: 1.2.3.5
```

### `develop`

Bumps minor, resets patch to `0`, and appends the build number.

Example:

```text
latest tag: v1.2.3
commits since tag: 5
version: 1.3.0.5
```

### `feature/*`

Same behavior as `develop`: bumps minor, resets patch to `0`, and appends the
build number.

### `release/*`

If the branch name contains a supported version, that version wins.

Example:

```text
branch: release/2.1
latest tag: v1.9.9
commits since tag: 3
version: 2.1.0.3
```

If the release branch does not contain a supported version, the latest tag is
used as the base, minor is bumped, patch is reset to `0`, and the build number
is appended.

### `hotfix/*`

If the branch name contains a supported version, that version wins.

If the hotfix branch does not contain a supported version, the latest tag is
used as the base unchanged and the build number is appended.

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
