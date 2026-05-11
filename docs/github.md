# GitHub Project Notes

The project has moved from Azure DevOps to GitHub.

The old Azure Pipelines configuration has been removed from the repository. No
GitHub Actions workflow is currently checked in.

## Current Repository State

- Source, tests, docs, and package metadata are maintained in GitHub.
- The package repository metadata in `package.json` points at
  `https://github.com/henskjold73/gitversionjs`.
- npm publishing still needs a dedicated GitHub-based runbook or workflow.

## Expected Validation Before Release

Until a GitHub Actions workflow exists, use the same local validation steps:

```bash
npm ci
npm test
npm run build
npm pack --dry-run
```

The packed package should only include:

- `dist/`
- `README.md`
- `LICENSE`

## npm Deployment Documentation Gap

The next documentation pass should define the GitHub npm deployment process:

- whether release publishing is manual, workflow-dispatched, tag-triggered, or
  main-branch triggered
- where `NPM_TOKEN` is stored in GitHub secrets
- who approves a release
- required tag state before publishing
- how `scripts/update-package-version.mjs` is used
- how the tarball is inspected before publish
- how the published npm package is verified afterward
