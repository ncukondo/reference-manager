# Error Handling Patterns

## Principles

1. Use custom error classes for domain errors
2. Include context in error messages
3. Distinguish recoverable vs fatal errors
4. Layer-specific handling:
   - Core/Features: Throw typed errors
   - CLI: Catch and format for users
   - Server: Catch and return HTTP status codes

## Error Classes

Define in `src/core/errors.ts`:

| Class | Purpose |
|-------|---------|
| `ReferenceManagerError` | Base class for all domain errors |
| `DuplicateReferenceError` | Duplicate detected (DOI/PMID/title match) |
| `LibraryFileError` | File read/write/parse failure |
| `ValidationError` | Invalid field value |
| `ConflictError` | Merge conflict |

## Layer-Specific Handling

### Core/Features

Throw typed errors with context:

```typescript
throw new DuplicateReferenceError(existingId, 'doi');
throw new LibraryFileError(filePath, 'read', cause);
```

### CLI

Catch and format for users, exit with appropriate code:

```typescript
if (error instanceof DuplicateReferenceError) {
  logger.error(`Duplicate: ${error.existingId}`);
  process.exit(1);
}
```

### Server

Catch and return HTTP status:

```typescript
if (error instanceof DuplicateReferenceError) {
  return c.json({ error: 'Duplicate' }, 409);
}
```

## Exit Codes (CLI)

| Code | Error Type |
|------|------------|
| `0` | Success |
| `1` | General error |
| `2` | Conflict |
| `3` | Parse error |
| `4` | I/O error |

## Guidelines

### Do

- Create custom error classes for domain errors
- Include context (IDs, file paths, field names)
- Use `cause` to preserve error chain
- Test error conditions explicitly

### Don't

- Use generic `throw new Error()`
- Catch and ignore errors silently
- Lose error context
- Expose internal errors to users
