# Code Style

## Naming Conventions
| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `file-watcher.ts` |
| Test files | `.test.ts` suffix | `file-watcher.test.ts` |
| Classes/Interfaces/Types | PascalCase | `Library`, `CSLItem` |
| Functions/Variables | camelCase | `generateId` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |

## Formatting (biome.json)
- Indent: 2 spaces
- Line width: 100 characters
- Quote style: Double quotes
- Semicolons: Always

## ESM Imports
- Use `.js` extension for project imports
- Use `node:` protocol for Node.js built-ins

```typescript
import { Library } from "./library.js";
import { readFile } from "node:fs/promises";
```

## TypeScript Rules
- Always specify return types for functions
- No `any` - use `unknown` for unknown types
- No non-null assertions (`!`)
