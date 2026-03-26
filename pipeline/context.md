# Pipeline Context

## Purpose

`azure-pipelines.yml` defines the package build, validation, and publish flow.

## Stage Flow

### `BuildAndPack`

- checkout with full history
- install Node 20
- run `npm ci`
- run tests
- build TypeScript
- fetch tags explicitly
- run `scripts/update-package-version.mjs`
- verify `npm pack --dry-run`
- fail if packed output includes test files or `release/`
- create tarball and publish it as a pipeline artifact

### `Approve`

Manual validation gate before publish when `PUBLISH=true`.

### `Publish`

Downloads the tarball artifact and publishes it to npm using `NPM_TOKEN`.

## Important Assumptions

- tags must be present locally for version calculation
- the tarball is the thing being approved and published
- `package.json` version is rewritten during CI, not precommitted as part of release prep

## Editing Risks

- changing packed file layout can silently publish unwanted files unless the guard checks stay aligned
- changing CLI or script behavior can break version stamping before publish
- approval logic currently depends on pipeline variable `PUBLISH`
