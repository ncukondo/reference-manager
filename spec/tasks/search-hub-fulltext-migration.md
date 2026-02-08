# Migration Plan: search-hub fulltext module to @ncukondo/academic-fulltext

## 1. Overview

Replace `src/fulltext/` in search-hub with a dependency on `@ncukondo/academic-fulltext` (published from reference-manager repo). The integration layer and CLI commands remain in search-hub since they are specific to search-hub's session/review workflow.

### Goals

- Eliminate code duplication between search-hub and reference-manager
- Enable both projects to share the same fulltext infrastructure
- Maintain all existing search-hub CLI commands and integration behavior

### Non-Goals

- Changing any CLI command behavior or output format
- Modifying the session/review data model
- Changing the `src/integration/` layer (ref-cli, register, etc.)

## 2. Module Boundary Analysis

### What `@ncukondo/academic-fulltext` provides

These are the modules extracted from search-hub's `src/fulltext/` into the shared package:

| Module | search-hub path | Package export |
|--------|----------------|----------------|
| Types | `src/fulltext/types.ts` | `@ncukondo/academic-fulltext` (FulltextMeta, FileInfo, OALocation, OAStatus, ArticleFulltextRef) |
| Citation key | `src/fulltext/citation-key.ts` | `@ncukondo/academic-fulltext` (generateCitationKey, generateDirName) |
| Meta management | `src/fulltext/meta.ts` | `@ncukondo/academic-fulltext` (createMeta, loadMeta, saveMeta, updateMetaFiles) |
| Paths | `src/fulltext/paths.ts` | `@ncukondo/academic-fulltext` (getFulltextDir, getArticleDir, getMetaPath, getReadmePath) |
| README generation | `src/fulltext/readme.ts` | `@ncukondo/academic-fulltext` (generateReadme) |
| OA discovery | `src/fulltext/discovery/` | `@ncukondo/academic-fulltext` (discoverOA, checkUnpaywall, checkPmc, checkArxiv, checkCore) |
| PDF download | `src/fulltext/download/downloader.ts` | `@ncukondo/academic-fulltext` (downloadPdf) |
| PMC XML download | `src/fulltext/download/pmc-xml.ts` | `@ncukondo/academic-fulltext` (downloadPmcXml) |
| Download orchestrator | `src/fulltext/download/orchestrator.ts` | `@ncukondo/academic-fulltext` (fetchFulltext, fetchAllFulltexts) |
| JATS conversion | `src/fulltext/convert/` | `@ncukondo/academic-fulltext` (convertPmcXmlToMarkdown, parseJatsMetadata, parseJatsBody, parseJatsReferences, parseJatsBackMatter, writeMarkdown) |
| Convert types | `src/fulltext/convert/types.ts` | `@ncukondo/academic-fulltext` (JatsDocument, JatsMetadata, JatsSection, etc.) |

### What stays in search-hub

| File | Reason |
|------|--------|
| `src/fulltext/attach-shared.ts` | Bridges fulltext data with search-hub's session model and ref-cli integration |
| `src/cli/commands/fulltext/*.ts` | CLI commands specific to search-hub's session/review workflow |
| `src/integration/fulltext-attach.ts` | Uses `attach-shared.ts` + `ref-cli.ts` to connect sessions to reference-manager |
| `src/integration/register.ts` | Session registration flow including fulltext attach step |

## 3. Concrete Import Changes

### 3.1. `src/cli/commands/fulltext/init.ts`

Current imports from `src/fulltext/`:
```typescript
import type { ArticleFulltextRef } from '../../../fulltext/types.js';
import { generateCitationKey, generateDirName } from '../../../fulltext/citation-key.js';
import { createMeta, saveMeta } from '../../../fulltext/meta.js';
import { generateReadme } from '../../../fulltext/readme.js';
import { getFulltextDir, getArticleDir, getMetaPath, getReadmePath } from '../../../fulltext/paths.js';
```

New imports:
```typescript
import type { ArticleFulltextRef } from '@ncukondo/academic-fulltext';
import { generateCitationKey, generateDirName } from '@ncukondo/academic-fulltext';
import { createMeta, saveMeta } from '@ncukondo/academic-fulltext';
import { generateReadme } from '@ncukondo/academic-fulltext';
import { getFulltextDir, getArticleDir, getMetaPath, getReadmePath } from '@ncukondo/academic-fulltext';
```

Or consolidated:
```typescript
import {
  type ArticleFulltextRef,
  generateCitationKey, generateDirName,
  createMeta, saveMeta,
  generateReadme,
  getFulltextDir, getArticleDir, getMetaPath, getReadmePath,
} from '@ncukondo/academic-fulltext';
```

### 3.2. `src/cli/commands/fulltext/sync.ts`

Current:
```typescript
import type { FulltextMeta, FileInfo } from '../../../fulltext/types.js';
import { loadMeta, saveMeta, updateMetaFiles } from '../../../fulltext/meta.js';
import { getFulltextDir } from '../../../fulltext/paths.js';
```

New:
```typescript
import {
  type FulltextMeta, type FileInfo,
  loadMeta, saveMeta, updateMetaFiles,
  getFulltextDir,
} from '@ncukondo/academic-fulltext';
```

### 3.3. `src/cli/commands/fulltext/convert.ts`

Current:
```typescript
import { getFulltextDir, getArticleDir, getMetaPath } from '../../../fulltext/paths.js';
import { convertPmcXmlToMarkdown } from '../../../fulltext/convert/index.js';
```

New:
```typescript
import {
  getFulltextDir, getArticleDir, getMetaPath,
  convertPmcXmlToMarkdown,
} from '@ncukondo/academic-fulltext';
```

### 3.4. `src/cli/commands/fulltext/check.ts`

Current:
```typescript
import { discoverOA, type DiscoveryConfig, type DiscoveryArticle } from '../../../fulltext/discovery/index';
import { loadMeta, saveMeta } from '../../../fulltext/meta';
import type { OAStatus } from '../../../fulltext/types';
```

New:
```typescript
import {
  discoverOA, type DiscoveryConfig, type DiscoveryArticle,
  loadMeta, saveMeta,
  type OAStatus,
} from '@ncukondo/academic-fulltext';
```

### 3.5. `src/cli/commands/fulltext/fetch.ts`

Current:
```typescript
import type { FulltextMeta } from '../../../fulltext/types.js';
import { loadMeta } from '../../../fulltext/meta.js';
import { fetchAllFulltexts, type FetchArticle } from '../../../fulltext/download/orchestrator.js';
```

New:
```typescript
import {
  type FulltextMeta,
  loadMeta,
  fetchAllFulltexts, type FetchArticle,
} from '@ncukondo/academic-fulltext';
```

### 3.6. `src/cli/commands/fulltext/status.ts`

Current:
```typescript
import { loadMeta } from '../../../fulltext/meta.js';
import { getMetaPath } from '../../../fulltext/paths.js';
```

New:
```typescript
import { loadMeta, getMetaPath } from '@ncukondo/academic-fulltext';
```

### 3.7. `src/cli/commands/fulltext/pending.ts`

Current:
```typescript
import { loadMeta } from '../../../fulltext/meta.js';
import { getMetaPath } from '../../../fulltext/paths.js';
import type { OALocation } from '../../../fulltext/types.js';
```

New:
```typescript
import { loadMeta, getMetaPath, type OALocation } from '@ncukondo/academic-fulltext';
```

### 3.8. `src/fulltext/attach-shared.ts` (stays in search-hub)

Current:
```typescript
import type { FulltextMeta } from './types.js';
```

New:
```typescript
import type { FulltextMeta } from '@ncukondo/academic-fulltext';
```

Note: This file also imports from `../integration/types.js` which stays in search-hub -- no change needed for that import.

### 3.9. `src/integration/fulltext-attach.ts`

Current:
```typescript
import { processFulltextEntries } from '../fulltext/attach-shared.js';
```

No change needed -- `attach-shared.ts` stays in search-hub.

### 3.10. `src/fulltext/convert/index.ts` (conversion orchestrator)

This file imports from `./jats-parser.js`, `./markdown-writer.js`, `./types.js`, and `../types.js`. It is entirely extracted into `@ncukondo/academic-fulltext`, so no import changes are needed in search-hub -- this file is removed.

## 4. Complete File Inventory

### 4.1. Files to Remove from search-hub

These files move entirely to `@ncukondo/academic-fulltext`:

**Core modules:**
- `src/fulltext/types.ts`
- `src/fulltext/citation-key.ts`
- `src/fulltext/citation-key.test.ts`
- `src/fulltext/meta.ts`
- `src/fulltext/meta.test.ts`
- `src/fulltext/paths.ts`
- `src/fulltext/paths.test.ts`
- `src/fulltext/readme.ts`
- `src/fulltext/readme.test.ts`
- `src/fulltext/foundation.test.ts` (integration test covering above modules)

**Discovery:**
- `src/fulltext/discovery/index.ts`
- `src/fulltext/discovery/index.test.ts`
- `src/fulltext/discovery/unpaywall.ts`
- `src/fulltext/discovery/unpaywall.test.ts`
- `src/fulltext/discovery/pmc.ts`
- `src/fulltext/discovery/pmc.test.ts`
- `src/fulltext/discovery/arxiv.ts`
- `src/fulltext/discovery/arxiv.test.ts`
- `src/fulltext/discovery/core.ts`
- `src/fulltext/discovery/core.test.ts`

**Download:**
- `src/fulltext/download/downloader.ts`
- `src/fulltext/download/downloader.test.ts`
- `src/fulltext/download/orchestrator.ts`
- `src/fulltext/download/orchestrator.test.ts`
- `src/fulltext/download/pmc-xml.ts`
- `src/fulltext/download/pmc-xml.test.ts`

**Conversion:**
- `src/fulltext/convert/index.ts`
- `src/fulltext/convert/index.test.ts`
- `src/fulltext/convert/jats-parser.ts`
- `src/fulltext/convert/jats-parser.test.ts`
- `src/fulltext/convert/markdown-writer.ts`
- `src/fulltext/convert/markdown-writer.test.ts`
- `src/fulltext/convert/types.ts`
- `src/fulltext/convert/convert.e2e.test.ts`

**Total: 28 files removed**

### 4.2. Files to Keep in search-hub (modified)

These files stay but get import path updates:

- `src/fulltext/attach-shared.ts` -- update `./types.js` import
- `src/cli/commands/fulltext/init.ts` -- update 5 import lines
- `src/cli/commands/fulltext/sync.ts` -- update 3 import lines
- `src/cli/commands/fulltext/convert.ts` -- update 2 import lines
- `src/cli/commands/fulltext/check.ts` -- update 3 import lines
- `src/cli/commands/fulltext/fetch.ts` -- update 3 import lines
- `src/cli/commands/fulltext/status.ts` -- update 2 import lines
- `src/cli/commands/fulltext/pending.ts` -- update 3 import lines

**Total: 8 files modified (import paths only)**

### 4.3. Files to Keep in search-hub (unchanged)

These files have no direct imports from `src/fulltext/` extracted modules:

- `src/cli/commands/fulltext/index.ts` -- imports only from sibling CLI command files
- `src/cli/commands/fulltext/format.ts` -- imports only from sibling `./init.js` and `./sync.js`
- `src/cli/commands/fulltext/attach.ts` -- imports from `../../../integration/types.js` and `../../../integration/ref-cli.js` and `../../../fulltext/attach-shared.js` (which stays)
- `src/integration/fulltext-attach.ts` -- imports from `../fulltext/attach-shared.js` (which stays)
- `src/integration/register.ts` -- imports from `./fulltext-attach.js` (which stays)

**Test files to keep:**
- `src/cli/commands/fulltext/init.test.ts`
- `src/cli/commands/fulltext/sync.test.ts`
- `src/cli/commands/fulltext/convert.test.ts`
- `src/cli/commands/fulltext/check.test.ts`
- `src/cli/commands/fulltext/fetch.test.ts`
- `src/cli/commands/fulltext/attach.test.ts`
- `src/cli/commands/fulltext/status.test.ts`
- `src/cli/commands/fulltext/pending.test.ts`
- `src/cli/commands/fulltext/init-sync.test.ts`
- `src/cli/commands/fulltext/status-pending.test.ts`
- `src/cli/commands/fulltext/format.test.ts`
- `src/integration/fulltext-attach.test.ts`

These tests exercise the CLI command logic and integration layer which remain in search-hub. They will likely need minor import adjustments if they directly import from the removed modules for test setup.

## 5. Package Dependency Changes

### 5.1. Add to search-hub `package.json` dependencies

```json
{
  "dependencies": {
    "@ncukondo/academic-fulltext": "^0.1.0"
  }
}
```

### 5.2. Dependencies that become transitive (review for removal)

These are currently direct dependencies of search-hub but will become transitive through `@ncukondo/academic-fulltext`:

| Package | Used in extracted code | Used elsewhere in search-hub | Action |
|---------|----------------------|------------------------------|--------|
| `fast-xml-parser` | `src/fulltext/convert/jats-parser.ts` | **Not used elsewhere** | **Remove** from direct dependencies |
| `any-ascii` | `src/fulltext/citation-key.ts` | **Not used elsewhere** | **Remove** from direct dependencies |

Note: `yaml`, `commander`, `zod`, `dotenv`, `env-paths`, `cli-progress`, `ora` are all used by other parts of search-hub and must remain as direct dependencies.

### 5.3. Verify with search

Before removing direct dependencies, verify no other file imports them:

```bash
# In search-hub repo, after removing src/fulltext/ extracted files:
grep -r "fast-xml-parser" src/ --include="*.ts" -l
grep -r "any-ascii" src/ --include="*.ts" -l
```

If both return empty, safe to remove.

## 6. `@ncukondo/academic-fulltext` Package API Design

The package should export all symbols from a single entry point. Based on the search-hub imports analysis:

### Required exports (types)

```typescript
// Types
export type { FulltextMeta, FileInfo, OALocation, OAStatus, ArticleFulltextRef } from './types.js';
export type { DiscoveryArticle, DiscoveryConfig, DiscoveryResult } from './discovery/index.js';
export type { FetchArticle, FetchOptions, FetchResult } from './download/orchestrator.js';
export type { DownloadOptions, DownloadResult } from './download/downloader.js';
export type { PmcXmlResult } from './download/pmc-xml.js';
export type { ConvertResult } from './convert/index.js';
export type { CreateMetaOptions } from './meta.js';
// JATS types (if consumers need them)
export type { JatsDocument, JatsMetadata, JatsSection, JatsReference, JatsFootnote, JatsAuthor, ... } from './convert/types.js';
```

### Required exports (values/functions)

```typescript
// Citation key
export { generateCitationKey, generateDirName } from './citation-key.js';

// Meta management
export { createMeta, loadMeta, saveMeta, updateMetaFiles } from './meta.js';

// Path resolution
export { getFulltextDir, getArticleDir, getMetaPath, getReadmePath } from './paths.js';

// README generation
export { generateReadme } from './readme.js';

// OA Discovery
export { discoverOA } from './discovery/index.js';
export { checkUnpaywall } from './discovery/unpaywall.js';
export { checkPmc, getPmcUrls } from './discovery/pmc.js';
export { checkArxiv } from './discovery/arxiv.js';
export { checkCore } from './discovery/core.js';

// Download
export { downloadPdf } from './download/downloader.js';
export { downloadPmcXml } from './download/pmc-xml.js';
export { fetchFulltext, fetchAllFulltexts } from './download/orchestrator.js';

// Conversion
export { convertPmcXmlToMarkdown } from './convert/index.js';
export { parseJatsMetadata, parseJatsBody, parseJatsReferences, parseJatsBackMatter } from './convert/jats-parser.js';
export { writeMarkdown } from './convert/markdown-writer.js';
```

## 7. Migration Steps (Ordered)

### Step 1: Publish `@ncukondo/academic-fulltext` v0.1.0

This is done from the reference-manager repo. The package must export all symbols listed in Section 6. Verify the package works by importing it in a test script.

**Prerequisite**: The package source code must already exist in the reference-manager repo (it may need to be extracted/created there first).

### Step 2: Create a branch in search-hub

```bash
git checkout -b feat/migrate-fulltext-to-package
```

### Step 3: Add `@ncukondo/academic-fulltext` dependency

```bash
npm install @ncukondo/academic-fulltext@^0.1.0
```

### Step 4: Update imports in CLI commands (8 files)

Update all files listed in Section 3, changing `../../../fulltext/...` imports to `@ncukondo/academic-fulltext`.

### Step 5: Update imports in `attach-shared.ts`

Change `./types.js` import to `@ncukondo/academic-fulltext`.

### Step 6: Run typecheck to verify import correctness

```bash
npm run typecheck
```

Fix any type mismatches. The package must export identical types to the original source.

### Step 7: Run tests

```bash
npm run test:unit
npm run test:e2e
```

All CLI command tests and integration tests should pass without changes (they test behavior, not import paths). If tests import directly from `src/fulltext/` for test fixtures, update those imports too.

### Step 8: Remove extracted source files (28 files)

Remove all files listed in Section 4.1. This is safe because:
- All imports have been redirected (Step 4-5)
- Tests pass (Step 7)

### Step 9: Remove transitive dependencies

```bash
npm uninstall fast-xml-parser any-ascii
```

Only do this after verifying they're not imported anywhere else (Step 5.3).

### Step 10: Final verification

```bash
npm run typecheck
npm run test:unit
npm run test:e2e
npm run build
```

### Step 11: Update `src/index.ts` exports if needed

Current `src/index.ts` does **not** re-export anything from `src/fulltext/`:
```typescript
export * from './query/index.js';
export * from './config/index.js';
export * from './session/index.js';
export * from './providers/base/index.js';
```

No changes needed. If fulltext types were ever exported from the library entry point, they would need to be re-exported from `@ncukondo/academic-fulltext` instead.

### Step 12: Update documentation

- Update `docs/fulltext.md` to mention the extracted package
- Update `spec/fulltext/overview.md` architecture section

## 8. Risk Assessment

### Low Risk

| Risk | Mitigation |
|------|-----------|
| Import path typos | TypeScript compiler catches these immediately |
| Missing exports from package | Caught by typecheck in Step 6 |
| Test files importing removed modules | Search-and-replace in test files |

### Medium Risk

| Risk | Mitigation |
|------|-----------|
| Type incompatibility between package and search-hub | Package types are copied verbatim from search-hub; pin exact version |
| Test fixtures that directly construct internal types | Update test imports to use package types |
| CLI command tests that mock internal modules | Update mock paths; may need to mock `@ncukondo/academic-fulltext` instead |

### Low Likelihood but High Impact

| Risk | Mitigation |
|------|-----------|
| Package not published before migration starts | Step 1 must complete before Step 3 |
| Breaking change in package after migration | Use exact version pin, coordinate releases |

## 9. Test Migration Notes

### Tests that move to `@ncukondo/academic-fulltext`

All test files co-located with the extracted source modules (listed in Section 4.1) should exist in the package's own test suite. These tests validate the core library behavior independent of search-hub.

### Tests that stay in search-hub

CLI command tests (`src/cli/commands/fulltext/*.test.ts`) remain because they test:
- Session/review workflow logic
- CLI output formatting
- Integration with `ref-cli.ts`
- Reviews.yaml updates

These tests may need mock/fixture updates if they directly import from removed paths.

### Test adjustment checklist

For each test file staying in search-hub, check:
1. Does it import from `src/fulltext/` paths? If so, update to `@ncukondo/academic-fulltext`.
2. Does it mock `src/fulltext/` modules? If so, update mock targets.
3. Does it construct types defined in `src/fulltext/types.ts`? The types come from the package now, but constructing objects shouldn't change.

## 10. Directory Structure After Migration

```
src/
├── fulltext/
│   └── attach-shared.ts          # Only remaining file in this directory
├── cli/
│   └── commands/
│       └── fulltext/
│           ├── index.ts           # Command registration
│           ├── init.ts            # Import from @ncukondo/academic-fulltext
│           ├── sync.ts            # Import from @ncukondo/academic-fulltext
│           ├── convert.ts         # Import from @ncukondo/academic-fulltext
│           ├── check.ts           # Import from @ncukondo/academic-fulltext
│           ├── fetch.ts           # Import from @ncukondo/academic-fulltext
│           ├── attach.ts          # Imports from attach-shared + integration
│           ├── status.ts          # Import from @ncukondo/academic-fulltext
│           ├── pending.ts         # Import from @ncukondo/academic-fulltext
│           └── format.ts          # No fulltext imports
├── integration/
│   ├── fulltext-attach.ts         # Imports from attach-shared (unchanged)
│   ├── register.ts                # Imports from fulltext-attach (unchanged)
│   ├── ref-cli.ts                 # No fulltext imports
│   ├── csl-json.ts                # No fulltext imports
│   └── types.ts                   # FulltextAttachResult stays here
└── index.ts                       # No changes needed
```
