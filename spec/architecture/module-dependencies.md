# Module Dependencies

Module dependency rules and architecture layers.

## Dependency Hierarchy

```
┌─────────────────────────────────────────────────┐
│                  cli/                           │  ← Top layer
│  (User interface)                               │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│                 server/                         │
│  (HTTP API)                                     │
└────────────────────┬────────────────────────────┘
                     │
                     ├──────────────────────────┐
                     │                          │
┌────────────────────▼────────────┐  ┌──────────▼─────────┐
│           features/             │  │     config/        │
│  (Domain features)              │  │  (Configuration)   │
│  - search/                      │  └────────────────────┘
│  - duplicate/                   │
│  - merge/                       │
│  - file-watcher/                │
└────────────────────┬────────────┘
                     │
┌────────────────────▼────────────┐
│              core/              │  ← Foundation
│  (Business logic)               │
│  - library.ts                   │
│  - reference.ts                 │
│  - csl-json/                    │
│  - identifier/                  │
└────────────────────┬────────────┘
                     │
┌────────────────────▼────────────┐
│             utils/              │  ← Shared utilities
│  - logger.ts                    │
│  - file.ts                      │
│  - hash.ts                      │
│  - backup.ts                    │
└─────────────────────────────────┘
```

## Dependency Rules

### Rule 1: Lower Layers Cannot Import Upper Layers

**Strict hierarchy**:
- `utils/` cannot import from any other layer
- `config/` cannot import from any other layer (except utils)
- `core/` cannot import from `features/`, `server/`, or `cli/`
- `features/` cannot import from `server/` or `cli/`
- `server/` and `cli/` can import from any lower layer

### Rule 2: Horizontal Dependencies Within Same Layer

Modules within the same layer can import from each other, but **avoid circular dependencies**.

**Good pattern** (tree structure):
```
features/search/index.ts
  ├─ imports features/search/normalizer.ts
  └─ imports features/search/matcher.ts
```

**Bad pattern** (circular):
```
features/search/normalizer.ts ──┐
  └─ imports matcher.ts         │
                                │
features/search/matcher.ts ─────┘
  └─ imports normalizer.ts
```

### Rule 3: Type-Only Imports Are Allowed

Type imports don't create runtime dependencies and are allowed across layers for type definitions:

```typescript
// core/library.ts
import type { LogLevel } from '../utils/logger.js';  // Type-only import: OK
```

However, prefer keeping types in the same layer when possible.

## Layer Responsibilities

### utils/

**Purpose**: Shared utility functions with no business logic

**Exports**:
- `logger.ts`: Logging functions
- `file.ts`: File system operations
- `hash.ts`: File hashing (SHA-256)
- `backup.ts`: Backup file management

**Dependencies**: None (may use Node.js built-ins only)

**Example**:
```typescript
// utils/hash.ts
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

export async function computeFileHash(filePath: string): Promise<string> {
  const content = await readFile(filePath);
  return createHash('sha256').update(content).digest('hex');
}
```

### config/

**Purpose**: Configuration loading and schema

**Exports**:
- `loader.ts`: Load configuration from files
- `schema.ts`: Configuration schema (zod)
- `defaults.ts`: Default configuration values

**Dependencies**: `utils/` only

**Example**:
```typescript
// config/loader.ts
import { readFile } from 'node:fs/promises';
import { logger } from '../utils/logger.js';

export async function loadConfig(path: string): Promise<Config> {
  // Implementation
}
```

### core/

**Purpose**: Business logic and domain models

**Exports**:
- `library.ts`: Library management (CRUD operations)
- `reference.ts`: Single reference entity
- `csl-json/`: CSL-JSON parsing, serialization, validation
- `identifier/`: ID generation, normalization, UUID management

**Dependencies**: `utils/`, `config/`

**Cannot import from**: `features/`, `server/`, `cli/`

**Example**:
```typescript
// core/library.ts
import { computeFileHash } from '../utils/hash.js';
import { parseCslJson } from './csl-json/parser.js';
import { Reference } from './reference.js';

export class Library {
  // Business logic only, no feature-specific code
}
```

### features/

**Purpose**: Domain features built on top of core

**Modules**:
- `search/`: Search functionality (tokenize, match, sort)
- `duplicate/`: Duplicate detection
- `merge/`: 3-way merge conflict resolution
- `file-watcher/`: File monitoring and reload
- `import/`: Multi-format import (BibTeX, RIS, PMID, DOI)
- `operations/`: Unified library operations (add, remove, list, etc.)

**Dependencies**: `core/`, `utils/`, `config/`

**Cannot import from**: `server/`, `cli/`

#### Dependency Rule for operations/

`features/operations/` is a special aggregation module:

```
features/
├── search/
├── duplicate/
├── import/
├── ...
└── operations/     ← Aggregates other features
    ├── add.ts      (imports: import/, duplicate/, core/)
    ├── remove.ts   (imports: core/)
    ├── list.ts     (imports: search/, core/)
    └── ...
```

**Rule**: `operations/` can import from other `features/*`, but other `features/*` **cannot** import from `operations/`.

This prevents circular dependencies and keeps `operations/` as a top-level orchestration layer within features.

```typescript
// ✅ OK: operations/ imports from other features
// features/operations/add.ts
import { importFromInputs } from '../import/importer.js';
import { detectDuplicate } from '../duplicate/detector.js';

// ❌ WRONG: other features import from operations/
// features/search/matcher.ts
import { addReferences } from '../operations/add.js';  // NOT ALLOWED
```

#### Integration Functions Pattern

`operations/` exposes **integration functions** that provide a unified interface for both CLI and Server:

```typescript
// features/operations/add.ts
export async function addReferences(
  library: Library,
  items: CslItem[],
  options: AddOptions
): Promise<AddResult> {
  // Orchestrates: duplicate check, ID resolution, save
  // Returns: added/skipped/failed summary
}
```

**Benefits**:
- CLI and Server share the same business logic
- CLI only handles: routing (direct vs server API), output formatting, exit codes
- Server only handles: HTTP request/response
- Easy to test domain logic in isolation

**Example**:
```typescript
// features/search/matcher.ts
import type { CSLItem } from '../../core/csl-json/types.js';
import { normalizeText } from './normalizer.js';

export function matchReferences(
  references: CSLItem[],
  query: string
): CSLItem[] {
  // Feature logic using core types
}
```

### server/

**Purpose**: HTTP API server

**Exports**:
- `index.ts`: Server startup and lifecycle
- `routes/`: API route handlers
- `portfile.ts`: Port file management

**Dependencies**: `core/`, `features/`, `utils/`, `config/`

**Cannot import from**: `cli/`

**Example**:
```typescript
// server/routes/references.ts
import { Hono } from 'hono';
import type { Library } from '../../core/library.js';
import { search } from '../../features/search/index.js';

export function createReferencesRouter(library: Library) {
  const app = new Hono();

  app.get('/search', async (c) => {
    const query = c.req.query('q') || '';
    const results = search(library, query);
    return c.json(results);
  });

  return app;
}
```

### cli/

**Purpose**: Command-line interface

**Exports**:
- `index.ts`: CLI entry point (commander setup)
- `execution-context.ts`: ExecutionContext type and factory (`createExecutionContext`)
- `server-client.ts`: HTTP client for server mode communication
- `server-detection.ts`: Server availability detection
- `commands/`: Command implementations
- `output/`: Output formatters (JSON, BibTeX, pretty)

**Dependencies**: `core/`, `features/`, `server/` (for server commands), `utils/`, `config/`

#### ExecutionContext Pattern

The `ExecutionContext` type enables server mode optimization by eliminating redundant library loading:

```typescript
// cli/execution-context.ts
export type ExecutionContext =
  | { type: "server"; client: ServerClient }
  | { type: "local"; library: Library };

export async function createExecutionContext(config: Config): Promise<ExecutionContext>
```

**Benefits**:
- In server mode, commands communicate via HTTP API (library stays loaded in server process)
- In local mode, library is loaded once and passed to commands
- Discriminated union pattern enables type-safe mode-specific logic

**Usage in commands**:
```typescript
// cli/commands/list.ts
export async function executeList(
  options: ListOptions,
  context: ExecutionContext
): Promise<ListResult> {
  if (context.type === "server") {
    return context.client.list(options);
  }
  // Local mode: use library directly
  return listReferences(context.library, options);
}
```

**Example**:
```typescript
// cli/commands/search.ts
import { Command } from 'commander';
import type { Library } from '../../core/library.js';
import { search } from '../../features/search/index.js';
import { formatPretty } from '../output/pretty.js';

export function createSearchCommand(library: Library): Command {
  // CLI logic using core and features
}
```

## Import Path Guidelines

### Relative Imports

Use relative imports for files within the same module:

```typescript
// features/search/matcher.ts
import { normalizeText } from './normalizer.js';  // Same directory
import type { Token } from './types.js';          // Same directory
```

### Cross-Module Imports

Use relative imports for cross-module imports:

```typescript
// features/search/matcher.ts
import type { CSLItem } from '../../core/csl-json/types.js';
import { logger } from '../../utils/logger.js';
```

### Index Files

Use index files for clean public API:

```typescript
// features/search/index.ts
export { search } from './matcher.js';
export { normalizeQuery } from './normalizer.js';
export type { SearchOptions, SearchResult } from './types.js';

// Usage in other modules
import { search } from '../../features/search/index.js';
```

## Validation

### Allowed Import Patterns

```typescript
// ✅ core/ importing from utils/
// core/library.ts
import { computeFileHash } from '../utils/hash.js';

// ✅ features/ importing from core/
// features/search/matcher.ts
import type { CSLItem } from '../../core/csl-json/types.js';

// ✅ cli/ importing from features/
// cli/commands/search.ts
import { search } from '../../features/search/index.js';

// ✅ Type-only import (no runtime dependency)
// core/library.ts
import type { LogLevel } from '../utils/logger.js';
```

### Forbidden Import Patterns

```typescript
// ❌ core/ importing from features/
// core/library.ts
import { detectDuplicate } from '../features/duplicate/detector.js';  // WRONG

// ❌ core/ importing from cli/
// core/library.ts
import { logger } from '../cli/helpers.js';  // WRONG

// ❌ features/ importing from cli/
// features/search/matcher.ts
import { formatOutput } from '../../cli/output/pretty.js';  // WRONG

// ❌ Circular dependency within same layer
// features/search/normalizer.ts imports matcher.ts
// features/search/matcher.ts imports normalizer.ts  // WRONG
```

## Testing Imports

Test files follow the same import rules as their corresponding source files:

```typescript
// features/search/matcher.test.ts
import { describe, it, expect } from 'vitest';
import { matchReferences } from './matcher.js';
import type { CSLItem } from '../../core/csl-json/types.js';  // OK: same as matcher.ts
```

## Dependency Checking

Currently no automated dependency checking. **Manual review required.**

Future: Consider tools like `dependency-cruiser` or `eslint-plugin-import` to enforce rules automatically.

## Summary

**Key principles**:
1. ✅ Import from same or lower layers only
2. ✅ Core is foundation, depends on nothing (except utils/config)
3. ✅ Features build on core
4. ✅ CLI and Server are top layers
5. ✅ Avoid circular dependencies
6. ✅ Type-only imports are allowed