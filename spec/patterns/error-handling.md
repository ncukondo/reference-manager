# Error Handling Patterns

Standard patterns for error handling across the codebase.

## Basic Principles

1. **Use custom error classes** for domain errors
2. **Include context** in error messages
3. **Distinguish** recoverable vs fatal errors
4. **Layer-specific handling**:
   - Core/Features: Throw typed errors
   - CLI: Catch and format for users
   - Server: Catch and return HTTP status codes

## Error Class Hierarchy

### Domain Errors

Create custom error classes for domain-specific errors:

```typescript
// src/core/errors.ts
export class ReferenceManagerError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ReferenceManagerError';
  }
}

export class DuplicateReferenceError extends ReferenceManagerError {
  constructor(
    public readonly existingId: string,
    public readonly duplicateField: 'doi' | 'pmid' | 'title',
    message?: string
  ) {
    super(
      message || `Duplicate reference found (${duplicateField}): ${existingId}`
    );
    this.name = 'DuplicateReferenceError';
  }
}

export class LibraryFileError extends ReferenceManagerError {
  constructor(
    public readonly filePath: string,
    public readonly operation: 'read' | 'write' | 'parse',
    cause?: Error
  ) {
    super(`Failed to ${operation} library file: ${filePath}`, { cause });
    this.name = 'LibraryFileError';
  }
}

export class ValidationError extends ReferenceManagerError {
  constructor(
    public readonly field: string,
    public readonly value: unknown,
    public readonly reason: string
  ) {
    super(`Validation failed for ${field}: ${reason}`);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends ReferenceManagerError {
  constructor(
    public readonly referenceId: string,
    message?: string
  ) {
    super(message || `Conflict detected for reference: ${referenceId}`);
    this.name = 'ConflictError';
  }
}
```

## Layer-Specific Patterns

### Core/Features Layer

**Pattern**: Throw typed errors with context

```typescript
// src/features/duplicate/detector.ts
import { DuplicateReferenceError } from '../../core/errors.js';

export function detectDuplicate(
  reference: CSLItem,
  library: Library
): void {
  const existing = library.findByDOI(reference.DOI);
  if (existing) {
    throw new DuplicateReferenceError(existing.id, 'doi');
  }
}
```

```typescript
// src/core/library.ts
import { LibraryFileError, ValidationError } from './errors.js';

export class Library {
  async load(filePath: string): Promise<void> {
    try {
      const content = await readFile(filePath, 'utf-8');
      this.items = JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new LibraryFileError(filePath, 'parse', error);
      }
      throw new LibraryFileError(filePath, 'read', error as Error);
    }
  }

  addReference(reference: CSLItem): void {
    if (!reference.id) {
      throw new ValidationError('id', reference.id, 'id is required');
    }
    // ...
  }
}
```

### CLI Layer

**Pattern**: Catch typed errors, format for users, exit with code

```typescript
// src/cli/commands/add.ts
import {
  DuplicateReferenceError,
  LibraryFileError,
  ValidationError,
} from '../../core/errors.js';
import { logger } from '../../utils/logger.js';

export async function addCommand(
  reference: CSLItem,
  options: AddOptions
): Promise<void> {
  try {
    await library.addReference(reference);
    logger.info(`Added reference: ${reference.id}`);
  } catch (error) {
    if (error instanceof DuplicateReferenceError) {
      logger.error(
        `Duplicate reference found (${error.duplicateField}): ${error.existingId}`
      );
      logger.info('Use --force to override or --merge to merge metadata');
      process.exit(1);
    }

    if (error instanceof ValidationError) {
      logger.error(`Invalid ${error.field}: ${error.reason}`);
      process.exit(1);
    }

    if (error instanceof LibraryFileError) {
      logger.error(`Failed to ${error.operation} library: ${error.filePath}`);
      if (error.cause) {
        logger.debug(error.cause.message);
      }
      process.exit(4); // I/O error
    }

    // Unexpected error
    logger.error('Unexpected error:', error);
    process.exit(1);
  }
}
```

### Server Layer

**Pattern**: Catch errors, return HTTP status

```typescript
// src/server/routes/references.ts
import {
  DuplicateReferenceError,
  ValidationError,
  ConflictError,
} from '../../core/errors.js';
import type { Context } from 'hono';

app.post('/references', async (c: Context) => {
  try {
    const reference = await c.req.json();
    await library.addReference(reference);
    return c.json({ id: reference.id }, 201);
  } catch (error) {
    if (error instanceof DuplicateReferenceError) {
      return c.json(
        {
          error: 'Duplicate reference',
          field: error.duplicateField,
          existingId: error.existingId,
        },
        409
      );
    }

    if (error instanceof ValidationError) {
      return c.json(
        {
          error: 'Validation failed',
          field: error.field,
          reason: error.reason,
        },
        400
      );
    }

    if (error instanceof ConflictError) {
      return c.json(
        {
          error: 'Conflict',
          referenceId: error.referenceId,
        },
        409
      );
    }

    // Unexpected error
    console.error('Unexpected error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});
```

## Exit Codes (CLI)

Standard exit codes for CLI commands:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | Conflict detected |
| 3 | Parse error |
| 4 | I/O error |

```typescript
// src/cli/exit-codes.ts
export const EXIT_SUCCESS = 0;
export const EXIT_ERROR = 1;
export const EXIT_CONFLICT = 2;
export const EXIT_PARSE_ERROR = 3;
export const EXIT_IO_ERROR = 4;
```

## Async Error Handling

**Pattern**: Always use try-catch for async operations

```typescript
// ✅ Good
async function loadLibrary(path: string): Promise<Library> {
  try {
    const content = await readFile(path, 'utf-8');
    return parseLibrary(content);
  } catch (error) {
    throw new LibraryFileError(path, 'read', error as Error);
  }
}

// ❌ Bad: Unhandled promise rejection
async function loadLibrary(path: string): Promise<Library> {
  const content = await readFile(path, 'utf-8'); // Might throw
  return parseLibrary(content);
}
```

## Error Context

**Pattern**: Include relevant context in errors

```typescript
// ✅ Good: Context included
throw new ValidationError(
  'DOI',
  reference.DOI,
  'DOI must start with "10."'
);

// ❌ Bad: No context
throw new Error('Invalid DOI');
```

## Error Cause Chain

**Pattern**: Use `cause` to preserve error chain

```typescript
// ✅ Good: Preserve cause
try {
  await fs.readFile(path);
} catch (error) {
  throw new LibraryFileError(path, 'read', error as Error);
}

// ❌ Bad: Original error lost
try {
  await fs.readFile(path);
} catch (error) {
  throw new LibraryFileError(path, 'read');
}
```

## Testing Errors

**Pattern**: Test error conditions explicitly

```typescript
// tests/core/library.test.ts
import { describe, it, expect } from 'vitest';
import { DuplicateReferenceError } from '../errors.js';

describe('Library.addReference', () => {
  it('should throw DuplicateReferenceError for duplicate DOI', () => {
    const library = new Library();
    library.addReference({ id: 'ref1', DOI: '10.1234/test' });

    expect(() => {
      library.addReference({ id: 'ref2', DOI: '10.1234/test' });
    }).toThrow(DuplicateReferenceError);
  });

  it('should include context in error', () => {
    const library = new Library();
    library.addReference({ id: 'ref1', DOI: '10.1234/test' });

    try {
      library.addReference({ id: 'ref2', DOI: '10.1234/test' });
      expect.fail('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(DuplicateReferenceError);
      expect((error as DuplicateReferenceError).duplicateField).toBe('doi');
      expect((error as DuplicateReferenceError).existingId).toBe('ref1');
    }
  });
});
```

## Guidelines

### Do's
- ✅ Create custom error classes for domain errors
- ✅ Include context (IDs, file paths, field names)
- ✅ Use `cause` to preserve error chain
- ✅ Catch errors at appropriate layer (CLI, server)
- ✅ Test error conditions explicitly
- ✅ Use specific error types (not generic `Error`)

### Don'ts
- ❌ Don't use generic `throw new Error()`
- ❌ Don't catch and ignore errors silently
- ❌ Don't lose error context
- ❌ Don't mix error handling patterns
- ❌ Don't expose internal errors to users
- ❌ Don't use error codes instead of types