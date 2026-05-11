# Development

## Requirements

- Node.js 20+
- npm
- Git with local tags when validating real version output

Install dependencies:

```bash
npm ci
```

Run tests:

```bash
npm test
```

Build:

```bash
npm run build
```

## Useful Commands

Print a computed version from source through the CLI test path:

```bash
npm test -- src/cli.test.ts
```

Build and run the compiled CLI:

```bash
npm run build
node dist/cli.js --output json --no-include-commits
```

Check what would be published:

```bash
npm pack --dry-run
```

Create a local tarball:

```bash
npm pack
```

## Test Coverage

Tests live next to source files in `src/`.

- `config.test.ts`: config loading, defaults, and validation
- `git.test.ts`: Git command behavior and branch/tag inference
- `version.test.ts`: version calculation rules
- `index.test.ts`: public API wiring
- `cli.test.ts`: CLI output shape through `ts-node/esm`

When changing version behavior, update both tests and user-facing docs.

## Packaging Expectations

`package.json` publishes only:

- `dist`
- `README.md`
- `LICENSE`

Before changing build, package, or CI behavior, run:

```bash
npm pack --dry-run
```

The packed output should not include source tests, local artifacts, generated
release folders, or context files.

## Local Artifacts

The repository may contain local `*.tgz` files from `npm pack`. Those are not
part of the intended package source and should not be committed unless there is
a deliberate release-artifact reason.

## Code Notes

- The package is ESM-only (`"type": "module"`).
- TypeScript outputs declarations to `dist/`.
- Tests are excluded from `tsc` output by `tsconfig.json`.
- `commander` is the only runtime dependency.
