# ADR-009: ILibraryOperations Pattern for CLI Unification

Date: 2024-12-24

## Status

Accepted

## Context

The CLI currently uses an `ExecutionContext` pattern with discriminated union types (`ServerExecutionContext | LocalExecutionContext`) to handle two modes of operation:

1. **Local mode**: Direct file access via `Library` class
2. **Server mode**: HTTP API access via `ServerClient` class

This results in branching logic in every CLI command:

```typescript
if (context.type === "server") {
  return context.client.search({ query, format });
}
return searchReferences(context.library, { query, format });
```

### Problems with Current Approach

1. **Code duplication**: Every command has similar if/else branching
2. **Maintenance burden**: New operations require updates in multiple places
3. **Type safety gaps**: Commands must handle two different code paths

### Constraints

1. **Dependency direction**: `core/` cannot import from `features/` (see ADR architecture rules)
2. **Performance**: `ServerClient` must use direct HTTP endpoints for efficiency (not `getAll()` + client-side filtering)
3. **ILibrary location**: `ILibrary` is defined in `core/` and cannot reference `features/` types like `SearchResult`

## Decision

Introduce `ILibraryOperations` interface in the `features/operations/` layer that extends `ILibrary` with high-level operations.

### Architecture

```
cli/
  └── ServerClient implements ILibraryOperations
        → Direct HTTP requests for all operations

features/operations/
  └── ILibraryOperations extends ILibrary
        → Defines: search, list, cite, addFromInputs
  └── OperationsLibrary implements ILibraryOperations
        → Wraps Library, delegates to operation functions

core/
  └── ILibrary (unchanged)
  └── Library implements ILibrary (unchanged)
```

### Interface Definition

```typescript
// features/operations/library-operations.ts
import type { ILibrary } from '../../core/library-interface.js';
import type { SearchResult, SearchOperationOptions } from './search.js';
import type { ListResult, ListOptions } from './list.js';
import type { CiteResult, CiteOperationOptions } from './cite.js';
import type { AddReferencesResult, AddReferencesOptions } from './add.js';

export interface ILibraryOperations extends ILibrary {
  search(options: SearchOperationOptions): Promise<SearchResult>;
  list(options: ListOptions): Promise<ListResult>;
  cite(options: CiteOperationOptions): Promise<CiteResult>;
  import(inputs: string[], options?: ImportOptions): Promise<ImportResult>;
}
```

### Simplified ExecutionContext

```typescript
// cli/execution-context.ts
export type ExecutionMode = "local" | "server";

export interface ExecutionContext {
  mode: ExecutionMode;
  library: ILibraryOperations;
}

export async function createExecutionContext(...): Promise<ExecutionContext> {
  if (server) {
    return {
      mode: "server",
      library: new ServerClient(server.baseUrl)
    };
  }
  const library = await loadLibrary(config.library);
  return {
    mode: "local",
    library: new OperationsLibrary(library)
  };
}
```

The `mode` field is preserved for:
- Status/diagnostic commands that display current mode
- Future MCP integration (could add "mcp" mode)
- Debugging and logging purposes

### Unified CLI Commands

```typescript
// cli/commands/search.ts - no branching needed
export async function executeSearch(options, context: ExecutionContext) {
  return context.library.search({ query: options.query, format });
}
```

## Rationale

1. **Respects dependency rules**: `ILibraryOperations` is in `features/` layer, which can import from `core/`. `cli/` imports from `features/`, maintaining correct dependency direction.

2. **Preserves performance**: `ServerClient` continues to make direct HTTP calls to server endpoints (`POST /api/search`), not inefficient `getAll()` + client filtering.

3. **Eliminates branching**: CLI commands use a single interface, removing all `context.type === "server"` checks.

4. **Type safety**: Both `ServerClient` and `OperationsLibrary` implement the same interface, ensuring consistency.

5. **Minimal changes to core**: `ILibrary` and `Library` remain unchanged.

## Consequences

### Positive

- CLI commands become simpler and more maintainable
- Single interface for both local and server modes
- Clear separation between low-level (`ILibrary`) and high-level (`ILibraryOperations`) operations
- Easier to add new operations in the future

### Negative

- Additional abstraction layer (`OperationsLibrary`)
- `ServerClient` implementation must be kept in sync with `ILibraryOperations`
- MCP remains unchanged (uses `Library` directly), creating slight inconsistency

### Neutral

- Test files need updates to use new `ExecutionContext` type
- `isServerContext`, `isLocalContext`, `getLibrary` helpers become unnecessary

## Alternatives Considered

### Option A: Extend ILibrary in core/ with high-level methods

- **Description**: Add `search()`, `list()`, etc. directly to `ILibrary`
- **Why rejected**: Violates dependency rules (`core/` cannot import `SearchResult` from `features/`)

### Option B: Keep current branching pattern

- **Description**: Maintain status quo with `context.type` checks
- **Why rejected**: Increases maintenance burden, code duplication, and complexity

### Option C: Move result types to core/

- **Description**: Move `SearchResult`, `ListResult`, etc. to `core/` layer
- **Why rejected**: These types represent formatted output, not core business logic. Conceptually belongs in `features/`.

## Implementation Notes

- MCP continues to use `Library` + operation functions directly (no change needed)
- Existing operation functions (`searchReferences`, `listReferences`, etc.) remain unchanged
- `OperationsLibrary` is a thin wrapper that delegates to these functions
