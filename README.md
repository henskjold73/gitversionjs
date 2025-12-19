# GitVersionJS

GitVersionJS is a tiny tool that turns your Git tags & branches into a semantic version. Use it as a **global CLI** or as a **library**.

## Features

- Infers version from Git:
  - Uses the latest tag (e.g. `v1.2.3` or `1.2.3`)
  - Applies branch rules (e.g. `develop`, `feature/*`, `release/*`, `hotfix/*`)
- Configurable tag prefix & branch naming
- Works locally and in CI
- Zero runtime deps for consumers
- Includes a `.build` number (commit count) in the version string.

---

## Quick start (CLI – global)

```bash
# install globally
npm install -g gitversionjs

# print a version for the current repo
gitversionjs

# JSON output (machine-friendly)
gitversionjs --output json

# run against another repository directory
gitversionjs --cwd /path/to/repo --output json
```

> Tip: you can also run without installing globally:
>
> ```bash
> npx gitversionjs --output json
> ```

---

## Library usage (Node ESM)

```ts
import { gitversion } from "gitversionjs";

const info = await gitversion(); // { version, major, minor, patch, build, ... }
console.log(info.version); // e.g. "1.2.0.5", "1.3.0.1724329999"

/// optional: target a specific repo directory
const infoFromOtherRepo = await gitversion({ cwd: "/path/to/repo" });
```

---

## Configuration

Create a `.gitversion.config.js` in your repo root (ESM):

```js
/** @type {import('gitversionjs').GitVersionConfig} */
export default {
  tagPrefix: "v", // e.g. "v1.2.3" → strip "v"
  branchPrefixes: {
    main: "main",
    develop: "develop",
    feature: "feature/",
    release: "release/",
    hotfix: "hotfix/",
  },
};
```

### How versions are determined (default rules)

- **Tags**: latest semver tag (prefix optional) is the base (e.g. `v1.2.3` or `1.2.3`)
- **main**: exactly the base tag, with `.build` appended (e.g., `1.2.3.5`).
- **develop**/**feature/**: bump **minor**, reset **patch → 0**, append `.build` (commit count)  
  (e.g. `1.2.3` → `1.3.0.5`).
- **release/X[.Y[.Z]]**: branch name is authoritative if it contains a version  
  (`release/2` → `2.0.0`, `release/2.1` → `2.1.0`, `release/2.1.3` → `2.1.3`).  
  If not encoded, bump **minor** and reset **patch → 0** from base.
- **hotfix/X.Y.Z**: branch name is authoritative; otherwise bump **patch**.

> In all cases: bumping **major** resets **minor** & **patch** to `0`; bumping **minor** resets **patch** to `0`.

---

## Requirements & CI tips

- Your repo must have tags locally. In CI, make sure to fetch them:
  - **GitHub Actions**
    ```yaml
    - uses: actions/checkout@v4
      with:
        fetch-depth: 0
        fetch-tags: true
    - run: git fetch --tags --force --prune
    ```
- If you’re in a workspace/monorepo, point `--cwd` (or pass `{ cwd }` in code) at the repo root.

---

## Typical workflows

### Update `package.json` to computed version

```ts
import fs from "fs";
import path from "path";
import { gitversion } from "gitversionjs";

const info = await gitversion();
const pkgPath = path.resolve("package.json");
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.version = info.version; // or `${info.major}.${info.minor}.${info.patch}.${info.build}` if you want to include the build number
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
```

### Write a public version file for your app

```ts
import fs from "fs";
fs.mkdirSync("public", { recursive: true });
fs.writeFileSync(
  "public/version.json",
  JSON.stringify({ version: info.version }, null, 2)
);
```

---

## Install options

- **Global CLI**:
  ```bash
  npm i -g gitversionjs
  ```
- **Project dev dep**:
  ```bash
  npm i -D gitversionjs
  ```
  Then:
  ```json
  // package.json
  {
    "scripts": {
      "version:print": "gitversionjs --output json"
    }
  }
  ```

---

## License

This project is licensed under **MIT-0 (MIT No Attribution)**.

In legal terms: do whatever you want.

### License (for humans)

Copyright (c) 2025 Whoever found this

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to do
absolutely whatever they want with it.

This includes, but is not limited to:

- using it
- copying it
- modifying it
- merging it
- publishing it
- distributing it
- sublicensing it
- selling it
- embedding it in something cursed
- rewriting it badly
- claiming it was obvious in hindsight

You do NOT need to:

- ask for permission
- credit the author
- send beer (though that would be nice)
- understand how it works

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE, OR SANITY.

IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES, LOSSES, BROKEN BUILDS, BROKEN CI PIPELINES, OR EXISTENTIAL CRISES,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

If this software breaks something important, that is unfortunate.
If it fixes something important, that was clearly intentional.

**Final note**

If you have read this far, you are either:

- a lawyer
- a compliance bot
- extremely bored
- or deeply suspicious of joy

Normal people do not read license files.
They copy code, run it, and move on with their lives.
