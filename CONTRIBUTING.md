# Contributing

Thanks for considering contributing to GitVersionJS.

This is a small tool with a very specific job. Please keep that in mind.

## Ground rules

- Be respectful (see CODE_OF_CONDUCT.md)
- Keep changes focused
- Don’t bikeshed unless there’s an actual bike on fire

If you’re unsure whether a change makes sense, open an issue first.

## Setup

### Requirements

- Node.js 20+
- npm
- A Git repository with actual tags (this tool cares a lot about tags)

Install

```bash
npm ci

Run tests
npm test
```

Build

```bash
npm run build
```

## How this project works (important)

GitVersionJS derives versions from:

- Git tags
- Branch names
- Commit counts

That means context matters.

If you change versioning logic, please include:

- the branch name you tested on
- the tags present in the repo
- the expected version output

“I ran it and it seemed fine” is not sufficient.

## Packaging rules (very important)

The published npm package must only include:

- dist/
- README.md
- LICENSE

Tests, configs, and random artifacts do not belong in the published tarball.

Before submitting changes that affect build or packaging, run:
npm pack --dry-run

If you see test files or anything surprising in the output, something is wrong.

## Pull requests

When opening a PR, please include:

- What changed
- Why it changed
- How you tested it (commands + environment)

If your PR changes behavior:

- Say so explicitly
- Mention whether it’s a breaking change

Small, boring PRs get merged faster than clever ones.

## CI & releases (maintainer notes)

- CI runs on every push to main
- Publishing to npm is done manually via GitHub Actions
- Not every commit is a release, and that is intentional

If you’re not a maintainer, you don’t need to worry about this part.

## Final note

This project is intentionally minimal.
If your proposal makes it significantly more complex, expect questions.
