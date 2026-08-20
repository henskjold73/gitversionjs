# Graph Report - gitversionjs  (2026-08-20)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 167 nodes · 249 edges · 12 communities
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- version.ts
- package.json
- config.ts
- keywords
- compilerOptions
- git.ts
- index.test.ts
- scripts
- update-package-version.mjs
- version.test.ts

## God Nodes (most connected - your core abstractions)
1. `calculateVersion()` - 15 edges
2. `compilerOptions` - 12 edges
3. `getGitInfo()` - 10 edges
4. `keywords` - 10 edges
5. `GitVersionConfig` - 7 edges
6. `scripts` - 7 edges
7. `loadConfig()` - 6 edges
8. `inferSourceBranch()` - 6 edges
9. `gitversion()` - 6 edges
10. `defaultRules()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `gitversion()` --calls--> `calculateVersion()`  [EXTRACTED]
  src/index.ts → src/version.ts
- `gitversion()` --calls--> `loadConfig()`  [EXTRACTED]
  src/index.ts → src/config.ts
- `gitversion()` --calls--> `getGitInfo()`  [EXTRACTED]
  src/index.ts → src/git.ts

## Import Cycles
- None detected.

## Communities (12 total, 0 thin omitted)

### Community 0 - "version.ts"
Cohesion: 0.14
Nodes (28): applyIncrement(), branchTypeRule(), branchUsesBuildMetadataSlug(), bumpRule(), calculateVersion(), chooseBaseVersion(), CommitInfo, defaultRules() (+20 more)

### Community 1 - "package.json"
Cohesion: 0.08
Nodes (25): commander, author, bin, gitversionjs, bugs, url, dependencies, commander (+17 more)

### Community 2 - "config.ts"
Cohesion: 0.14
Nodes (20): BranchingStrategy, BranchRule, BranchRuleBase, BranchRuleIncrement, BranchRuleMatch, defaultConfig, GitVersionConfig, isRecord() (+12 more)

### Community 3 - "keywords"
Cohesion: 0.10
Nodes (20): devDependencies, ts-node, @types/commander, @types/node, typescript, vitest, node, keywords (+12 more)

### Community 4 - "compilerOptions"
Cohesion: 0.11
Nodes (18): src/**/*.test.ts, src/**/__tests__/**, src/**/*.ts, compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, module (+10 more)

### Community 5 - "git.ts"
Cohesion: 0.27
Nodes (13): branchNameMatchesPrefix(), execAsync, getGitInfo(), GitInfoOptions, inferBranchFromCiEnv(), inferSourceBranch(), isValidSemverTag(), normalizeBranchName() (+5 more)

### Community 6 - "index.test.ts"
Cohesion: 0.15
Nodes (9): options, OutputFormat, outputFormats, program, gitversion(), Mock, mockCalculateVersion, mockGetGitInfo (+1 more)

### Community 7 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, lint, lint:fix, start, test, test:watch

### Community 8 - "update-package-version.mjs"
Cohesion: 0.40
Nodes (4): info, pkg, rawPackage, stdout

### Community 9 - "version.test.ts"
Cohesion: 0.40
Nodes (4): GitInfo, defaultConfig, mockExecSync, tags

## Knowledge Gaps
- **76 isolated node(s):** `CommitInfo`, `ResolvedRule`, `GitVersionOptions`, `GitInfoOptions`, `OutputFormat` (+71 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `keywords` connect `keywords` to `package.json`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `keywords` to `package.json`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `CommitInfo`, `ResolvedRule`, `GitVersionOptions` to the rest of the system?**
  _76 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `version.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13793103448275862 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `config.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._