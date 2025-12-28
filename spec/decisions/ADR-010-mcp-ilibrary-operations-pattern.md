# ADR-010: MCP ILibraryOperations Pattern

Date: 2025-12-28

## Status

Accepted

## Context

ADR-009 introduced the `ILibraryOperations` pattern for CLI to unify local and server modes. Currently:

### CLI Implementation
- Uses `ExecutionContext` with `ILibraryOperations` interface
- Local mode: `OperationsLibrary` wraps `Library`
- Server mode: `ServerClient` communicates via HTTP API
- Unified interface eliminates branching logic in commands

### MCP Implementation (Current)
- `McpContext` holds `library: Library` directly
- Each MCP tool imports and calls operation functions directly:
  ```typescript
  import { searchReferences } from "../../features/operations/search.js";
  const result = await searchReferences(library, options);
  ```
- No abstraction layer between MCP tools and operation functions

### Problems with Current MCP Approach

1. **Inconsistency**: CLI uses `ILibraryOperations`, MCP uses raw `Library` + direct function calls
2. **Code pattern divergence**: MCP tools have different import patterns than CLI commands
3. **Future HTTP support**: If MCP needs to connect via HTTP server (for performance with large libraries), significant refactoring would be required
4. **Testing**: Harder to mock dependencies in MCP tool tests

### Constraints

1. **External interface unchanged**: MCP tool names and parameters must remain the same
2. **Resource access**: MCP resources need `ILibrary` methods (`getAll()`, `find()`) which `ILibraryOperations` inherits
3. **Backward compatibility**: Existing MCP behavior must be preserved

## Decision

Extend the `ILibraryOperations` pattern to MCP by:

1. Change `McpContext.library` type from `Library` to `ILibraryOperations`
2. Create `OperationsLibrary` instance in `createMcpContext()`
3. Update MCP tools to use `ILibraryOperations` interface methods
4. Keep resources using `ILibrary` methods (inherited by `ILibraryOperations`)

### Architecture After Change

```
mcp/
  └── McpContext
        └── libraryOperations: ILibraryOperations
              ├── Local mode: OperationsLibrary (wraps Library)
              └── Future: ServerClient (HTTP API)

mcp/tools/
  └── Each tool uses libraryOperations.search(), .list(), .cite(), .import()

mcp/resources/
  └── Each resource uses libraryOperations.getAll(), .find()
      (ILibraryOperations extends ILibrary)
```

### McpContext Changes

```typescript
// Before
export interface McpContext {
  library: Library;
  config: Config;
  fileWatcher: FileWatcher;
  dispose: () => Promise<void>;
}

// After
export interface McpContext {
  libraryOperations: ILibraryOperations;
  config: Config;
  fileWatcher: FileWatcher;
  dispose: () => Promise<void>;
}
```

### Tool Implementation Changes

```typescript
// Before (search.ts)
import { searchReferences } from "../../features/operations/search.js";

export function registerSearchTool(server: McpServer, getLibrary: () => Library): void {
  // ...
  const library = getLibrary();
  const result = await searchReferences(library, options);
}

// After (search.ts)
export function registerSearchTool(
  server: McpServer,
  getLibraryOperations: () => ILibraryOperations
): void {
  // ...
  const libraryOperations = getLibraryOperations();
  const result = await libraryOperations.search(options);
}
```

## Rationale

1. **Consistency with CLI**: MCP follows the same pattern as CLI (ADR-009)
2. **Simplified imports**: Tools no longer need to import individual operation functions
3. **Future extensibility**: Easy to add HTTP server mode for MCP (same as CLI)
4. **Better testability**: Can mock `ILibraryOperations` in tests
5. **Minimal external impact**: MCP protocol interface unchanged

## Consequences

### Positive

- Unified pattern across CLI and MCP
- Cleaner MCP tool implementations
- Foundation for future HTTP-based MCP mode
- Easier to test MCP tools in isolation
- Reduced import statements in tool files

### Negative

- Changes to ~20 files (context, tools, resources, tests)
- Slight increase in abstraction layer
- Minor learning curve for contributors

### Neutral

- `ILibraryOperations` extends `ILibrary`, so resource handlers continue to work
- No changes to MCP protocol or tool specifications
- Performance impact negligible (thin wrapper)

## Alternatives Considered

### Option A: Keep Current Pattern

**Description**: Leave MCP using `Library` + direct function calls

**Pros**:
- No changes required
- Slightly fewer abstractions

**Cons**:
- Inconsistent with CLI pattern
- Harder to add HTTP mode later
- Different testing patterns needed

**Why rejected**: Inconsistency makes codebase harder to maintain

### Option B: Create Separate McpLibraryOperations

**Description**: Create MCP-specific interface different from CLI's `ILibraryOperations`

**Pros**:
- MCP-specific optimizations possible

**Cons**:
- Code duplication
- Two similar but different interfaces to maintain

**Why rejected**: No compelling reason for MCP-specific interface; reuse is better

### Option C: Add Optional HTTP Mode Immediately

**Description**: Implement both local and HTTP modes for MCP at once

**Pros**:
- Complete solution

**Cons**:
- Larger scope
- HTTP mode may not be needed for MCP
- More complex initial implementation

**Why rejected**: Premature optimization; can add HTTP mode later if needed

## Implementation Notes

### Phase 1: Core Changes
1. Update `McpContext` interface and `createMcpContext()`
2. Update `createMcpServer()` to pass `ILibraryOperations`

### Phase 2: Tool Updates
3. Update each tool registration function signature
4. Replace direct function calls with interface methods

### Phase 3: Resource Updates
5. Update resource handlers (use inherited `ILibrary` methods)

### Phase 4: Test Updates
6. Update all MCP-related test files

## References

- ADR-009: ILibraryOperations Pattern for CLI Unification
- ADR-008: MCP stdio Server
- `spec/architecture/mcp-server.md`: MCP server specification
- `spec/architecture/module-dependencies.md`: Module dependency rules
