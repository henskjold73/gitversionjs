# Docs Context

## Purpose

This folder contains maintainer-facing project documentation. It is not part of
the current published npm package because `package.json` only includes `dist`,
`README.md`, and `LICENSE`.

## Files

- `architecture.md`: code flow, module responsibilities, public return shape
- `versioning-rules.md`: exact branch/tag/build-number behavior
- `development.md`: setup, validation, tests, and local packaging checks
- `github.md`: current GitHub project state and release documentation gap

## Keep In Sync

When implementation changes, update the relevant docs plus:

- `README.md`
- root `context.md`
- folder-specific `context.md` files
- tests for changed behavior

## Next Documentation Gap

The npm deployment runbook still needs to be written. It should cover:

- npm token creation and GitHub secret setup
- required tag and branch state before publishing
- how `scripts/update-package-version.mjs` affects `package.json`
- approval checklist ownership
- how to inspect the tarball that will be published
- how to verify the published npm package after release
