# Code Style

Coding conventions and style guidelines.

## Tools

- **Linter & Formatter**: Biome
- **Type Checker**: TypeScript
- **Configuration**: `biome.json`, `tsconfig.json`

## Formatting (Automated by Biome)

Configuration in `biome.json`:

- Indent: 2 spaces
- Line width: 100 characters
- Quote style: Double quotes (`"`)
- Semicolons: Always
- Trailing commas: ES5 (objects, arrays)

Run formatting:
```bash
npm run format
```

## Naming Conventions

### Files and Directories

| Type | Convention | Example |
|------|------------|---------|
| Source files | kebab-case | `file-watcher.ts` |
| Test files | kebab-case + `.test.ts` | `file-watcher.test.ts` |
| Type definition files | `types.ts` | `types.ts` |
| Directories | kebab-case | `csl-json/`, `file-watcher/` |

### Code Elements

| Element | Convention | Example |
|---------|------------|---------|
| Classes | PascalCase | `Library`, `Reference` |
| Interfaces | PascalCase | `SearchOptions`, `CSLItem` |
| Type aliases | PascalCase | `CSLDate`, `IdentifierType` |
| Functions | camelCase | `generateId`, `parseJson` |
| Variables | camelCase | `userId`, `itemCount` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `DEFAULT_PORT` |
| Private fields | camelCase (no `_` prefix) | `private items: Item[]` |
| Parameters | camelCase | `function load(filePath: string)` |

```typescript
// Constants
const MAX_RETRY_COUNT = 10;
const DEFAULT_TIMEOUT_MS = 5000;

// Classes
class LibraryManager {
  private items: CSLItem[]; // No underscore prefix

  constructor() {
    this.items = [];
  }

  getItemCount(): number {
    return this.items.length;
  }
}

// Functions
function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

// Interfaces/Types
interface SearchOptions {
  limit?: number;
  offset?: number;
}

type CSLDate = {
  "date-parts": number[][];
};
```

## TypeScript Guidelines

### Explicit Types

Always specify return types for functions:

```typescript
// ✅ Good
function getId(): string {
  return this.id;
}

async function loadFile(path: string): Promise<CSLItem[]> {
  const content = await readFile(path);
  return JSON.parse(content);
}

// ❌ Bad
function getId() {
  return this.id; // Return type not explicit
}
```

### No `any`

Never use `any`. Use `unknown` for truly unknown types:

```typescript
// ✅ Good
function parseJson(text: string): unknown {
  return JSON.parse(text);
}

function handleError(error: unknown): void {
  if (error instanceof Error) {
    console.error(error.message);
  }
}

// ❌ Bad
function parseJson(text: string): any {
  return JSON.parse(text);
}
```

Configured in `biome.json`:
```json
{
  "suspicious": {
    "noExplicitAny": "error"
  }
}
```

### Type vs Interface

- Use `type` for unions, intersections, primitives
- Use `interface` for object shapes that may be extended

```typescript
// ✅ Types
type Identifier = string;
type Status = 'pending' | 'completed' | 'failed';
type CSLItem = CSLArticle | CSLBook | CSLChapter;

// ✅ Interfaces
interface SearchOptions {
  query: string;
  limit?: number;
}

interface Reference {
  id: string;
  title: string;
}
```

### Null and Undefined

Use optional properties (`?`) or union types (`| undefined` or `| null`):

```typescript
// ✅ Good
interface Config {
  port?: number; // Optional
  host: string | undefined; // Explicit undefined
}

function findReference(id: string): Reference | undefined {
  return this.index.get(id);
}

// ❌ Bad
interface Config {
  port: number; // Not clear if required
}

function findReference(id: string): Reference {
  return this.index.get(id)!; // Non-null assertion
}
```

### No Non-Null Assertions

Avoid `!` operator. Handle nullability explicitly:

```typescript
// ✅ Good
const ref = this.index.get(id);
if (!ref) {
  throw new Error(`Reference not found: ${id}`);
}
return ref;

// ❌ Bad
return this.index.get(id)!; // Non-null assertion
```

Configured in `biome.json`:
```json
{
  "style": {
    "noNonNullAssertion": "error"
  }
}
```

## File Structure

Standard order for file contents:

```typescript
// 1. Type imports (from external packages)
import type { Context } from "hono";

// 2. Value imports (from external packages)
import { Hono } from "hono";
import { readFile } from "node:fs/promises";

// 3. Type imports (from project)
import type { CSLItem } from "./types.js";

// 4. Value imports (from project)
import { Library } from "./library.js";
import { logger } from "../utils/logger.js";

// 5. Constants
const MAX_RESULTS = 100;
const DEFAULT_TIMEOUT = 5000;

// 6. Type definitions
export interface SearchOptions {
  limit?: number;
}

type InternalState = {
  loaded: boolean;
};

// 7. Helper functions (non-exported)
function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

// 8. Exported functions/classes
export class Library {
  // Implementation
}

export function search(query: string, options?: SearchOptions): CSLItem[] {
  // Implementation
}
```

## Import/Export Patterns

### ESM Extensions

Always use `.js` extension for imports (required for ESM):

```typescript
// ✅ Good
import { Library } from "./library.js";
import { parseJson } from "../utils/parser.js";

// ❌ Bad
import { Library } from "./library";
import { parseJson } from "../utils/parser.ts";
```

### Node.js Built-ins

Use `node:` protocol for Node.js built-in modules:

```typescript
// ✅ Good
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";

// ❌ Bad (works but less explicit)
import { readFile } from "fs/promises";
import { createHash } from "crypto";
```

### Index Files

Use index files for clean public API:

```typescript
// src/features/search/index.ts
export { search } from "./search.js";
export { normalizeQuery } from "./normalizer.js";
export type { SearchOptions, SearchResult } from "./types.js";

// Usage
import { search } from "./features/search/index.js";
```

## Comments and Documentation

### JSDoc for Public API

Use JSDoc for public functions and classes:

```typescript
/**
 * Load library from CSL-JSON file
 *
 * @param filePath - Path to CSL-JSON file
 * @returns Loaded library instance
 * @throws {LibraryFileError} If file cannot be read or parsed
 */
static async load(filePath: string): Promise<Library> {
  // Implementation
}
```

### Inline Comments

Use inline comments sparingly, only for non-obvious logic:

```typescript
// ✅ Good (explains non-obvious logic)
// Use Set for O(1) lookup instead of Array.includes()
const existingIds = new Set(this.references.map(ref => ref.getId()));

// ❌ Bad (states the obvious)
// Increment counter
counter++;
```

### No Commented-Out Code

Remove commented-out code. Use version control instead:

```typescript
// ❌ Bad
function search(query: string): Result[] {
  // const oldResults = legacySearch(query);
  return newSearch(query);
}

// ✅ Good
function search(query: string): Result[] {
  return newSearch(query);
}
```

## Error Handling

See `spec/patterns/error-handling.md` for complete patterns.

Key points:
- Use custom error classes
- Include context in errors
- No silent catch blocks
- Use `cause` to preserve error chain

## Testing File Structure

See `spec/guidelines/testing.md` for complete testing guidelines.

File structure:
```typescript
// module.test.ts
import { describe, it, expect } from "vitest";
import { functionUnderTest } from "./module.js";

describe("functionUnderTest", () => {
  describe("normal cases", () => {
    it("should handle valid input", () => {
      expect(functionUnderTest("valid")).toBe("expected");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(functionUnderTest("")).toBe("");
    });
  });

  describe("error cases", () => {
    it("should throw for invalid input", () => {
      expect(() => functionUnderTest(null)).toThrow();
    });
  });
});
```

## Variables and Constants

### Const Preference

Always use `const` when variable won't be reassigned:

```typescript
// ✅ Good
const items = await loadItems();
const count = items.length;

// ❌ Bad
let items = await loadItems(); // Never reassigned
let count = items.length; // Never reassigned
```

Configured in `biome.json`:
```json
{
  "style": {
    "useConst": "error"
  }
}
```

### Template Strings

Use template strings instead of concatenation:

```typescript
// ✅ Good
const message = `Found ${count} references in ${filePath}`;

// ❌ Bad
const message = "Found " + count + " references in " + filePath;
```

Configured in `biome.json`:
```json
{
  "style": {
    "useTemplate": "error"
  }
}
```

## Module Organization

Group related functionality:

```
src/features/search/
├── index.ts           # Public API exports
├── types.ts           # Type definitions
├── search.ts          # Main search logic
├── search.test.ts     # Tests
├── normalizer.ts      # Helper: text normalization
├── normalizer.test.ts
├── matcher.ts         # Helper: matching logic
└── matcher.test.ts
```

## Quality Checks

Before committing, ensure all checks pass:

```bash
npm run typecheck  # TypeScript type checking
npm run lint       # Biome linting
npm run format     # Biome formatting
npm test           # All tests
```

Configured in CI (`.github/workflows/ci.yml`).