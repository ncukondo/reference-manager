# Code Style

## Tools

- **Linter & Formatter**: Biome (see `biome.json`)
- **Type Checker**: TypeScript (see `tsconfig.json`)

## Formatting

Configured in `biome.json`:
- Indent: 2 spaces
- Line width: 100 characters
- Quote style: Double quotes
- Semicolons: Always

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `file-watcher.ts` |
| Test files | `.test.ts` suffix | `file-watcher.test.ts` |
| Classes/Interfaces/Types | PascalCase | `Library`, `CSLItem` |
| Functions/Variables | camelCase | `generateId`, `userId` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |

## TypeScript Rules

### Explicit Types

Always specify return types for functions.

### No `any`

Use `unknown` for truly unknown types. Configured in `biome.json`.

### No Non-Null Assertions

Handle nullability explicitly instead of using `!`.

## ESM

- Use `.js` extension for imports
- Use `node:` protocol for Node.js built-ins

```typescript
import { Library } from "./library.js";
import { readFile } from "node:fs/promises";
```

## File Structure

Standard order:
1. Type imports (external)
2. Value imports (external)
3. Type imports (project)
4. Value imports (project)
5. Constants
6. Type definitions
7. Helper functions (non-exported)
8. Exported functions/classes

## Quality Checks

```bash
npm run typecheck  # TypeScript
npm run lint       # Biome linting
npm run format     # Biome formatting
npm test           # All tests
```
