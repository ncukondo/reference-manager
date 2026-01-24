# Cross-Platform Path Handling

## Principle

| Purpose | Path Format | Method |
|---------|-------------|--------|
| File operations | Native path | Use `path.join()` as-is |
| User output | Normalized (`/`) | `normalizePathForOutput()` |

## Rules

1. **Required**: Use `normalizePathForOutput()` for user-facing output
2. **Prohibited**: Inline `.replace(/\\/g, "/")` in production code
3. **Prohibited**: Defining local `normalizePath` functions

## Import

```typescript
import { normalizePathForOutput } from "../../utils/path.js";
```

## Examples

```typescript
// GOOD - File operations (use native path)
await fs.readFile(path.join(baseDir, filename));

// GOOD - User output (normalize for consistency)
return { success: true, path: normalizePathForOutput(filePath) };

// BAD - Inline normalization
return { path: filePath.replace(/\\/g, "/") };

// BAD - Local normalization function
function normalizePath(p: string): string {
  return p.replace(/\\/g, "/");
}
```

## Testing

Test assertions for output paths should use `normalizePathForOutput()`:

```typescript
expect(result.path).toBe(normalizePathForOutput(expectedPath));
```

## Why?

Windows uses backslashes (`\`) as path separators, while Linux/macOS use forward slashes (`/`).
For consistent user-facing output across platforms, we normalize all output paths to use forward slashes.

File system APIs on Windows accept both separators, so native paths work correctly for file operations.

## See Also

- [Platform Support](./platform.md)
