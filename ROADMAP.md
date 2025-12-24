# ROADMAP

This document tracks future development plans for reference-manager.

For completed features and changes, see [CHANGELOG.md](./CHANGELOG.md).

For detailed specifications, see [spec/](./spec/).

## Before Implementation

**Always read [`spec/meta/development-process.md`](./spec/meta/development-process.md) before starting any implementation work.**

This document defines the workflow including TDD process, quality checks, and commit guidelines.

## Completed Phases

- ✅ **Phase 1-5**: Core functionality, CLI commands, Server, Build & Distribution
- ✅ **Phase 6**: Citation Generation (cite command)
- ✅ **Phase 7**: Multi-Format Import (add command with BibTeX, RIS, DOI, PMID support)
- ✅ **Phase 8**: Operation Integration (unified operations pattern)
- ✅ **Phase 9**: Server Mode Performance Optimization (ExecutionContext pattern)
- ✅ **Phase 10**: Full-text Management (attach, get, detach commands)
- ✅ **Phase 11**: Search Enhancements (uppercase matching, author given name, tags)

See [CHANGELOG.md](./CHANGELOG.md) for details on implemented features.

---

## Current Phase

### Phase 12: MCP Server

MCP (Model Context Protocol) stdio server for AI agent integration.

See: `spec/architecture/mcp-server.md`, `spec/decisions/ADR-008-mcp-stdio-server.md`

#### 12.1 Infrastructure (Unit)

Setup MCP SDK and core context.

- [x] **12.1.1**: Add `@modelcontextprotocol/sdk` dependency
  - File: `package.json`
  - Acceptance: SDK installed, peer dependency `zod` already present

- [x] **12.1.2**: Create MCP context type and factory
  - File: `src/mcp/context.ts`, `src/mcp/context.test.ts`
  - Acceptance: McpContext type with Library, Config, FileWatcher
  - Dependencies: None (uses existing types)

- [x] **12.1.3**: Create McpServer initialization
  - File: `src/mcp/index.ts`, `src/mcp/index.test.ts`
  - Acceptance: Server created with name/version, stdio transport connected
  - Dependencies: 12.1.1, 12.1.2

- [x] **12.1.4**: Add Library.reload() method for file watcher integration
  - File: `src/core/library.ts`, `src/core/library.test.ts`
  - Acceptance: Library can reload from file, MCP context uses it on file change
  - Dependencies: 12.1.3
  - Note: Implements spec/features/file-monitoring.md handleFileChange pattern

#### 12.2 Tools - MVP (Unit)

Core tools using existing operations layer.

- [x] **12.2.1**: Implement `search` tool
  - File: `src/mcp/tools/search.ts`, `src/mcp/tools/search.test.ts`
  - Acceptance: Calls searchOperation, returns formatted results
  - Dependencies: 12.1.3

- [x] **12.2.2**: Implement `list` tool
  - File: `src/mcp/tools/list.ts`, `src/mcp/tools/list.test.ts`
  - Acceptance: Calls listOperation, supports format option
  - Dependencies: 12.1.3

- [x] **12.2.3**: Implement `cite` tool
  - File: `src/mcp/tools/cite.ts`, `src/mcp/tools/cite.test.ts`
  - Acceptance: Calls citeOperation, supports style/format options
  - Dependencies: 12.1.3

- [x] **12.2.4**: Register MVP tools
  - File: `src/mcp/tools/index.ts`
  - Acceptance: All MVP tools registered with McpServer
  - Dependencies: 12.2.1, 12.2.2, 12.2.3

#### 12.3 Tools - Extended (Unit)

Write operation tools.

- [x] **12.3.1**: Implement `add` tool
  - File: `src/mcp/tools/add.ts`, `src/mcp/tools/add.test.ts`
  - Acceptance: Calls addOperation, accepts PMID/DOI/BibTeX/RIS
  - Dependencies: 12.2.4

- [x] **12.3.2**: Implement `remove` tool
  - File: `src/mcp/tools/remove.ts`, `src/mcp/tools/remove.test.ts`
  - Acceptance: Requires `force: true`, calls removeOperation
  - Dependencies: 12.2.4

#### 12.4 Resources (Unit)

MCP resources for library data access.

- [x] **12.4.1**: Implement `library://references` resource
  - File: `src/mcp/resources/library.ts`, `src/mcp/resources/library.test.ts`
  - Acceptance: Returns all references as CSL-JSON
  - Dependencies: 12.1.3

- [x] **12.4.2**: Implement `library://reference/{id}` resource
  - File: `src/mcp/resources/library.ts`
  - Acceptance: Returns single reference by ID
  - Dependencies: 12.4.1

- [x] **12.4.3**: Implement `library://styles` resource
  - File: `src/mcp/resources/library.ts`
  - Acceptance: Returns available citation styles
  - Dependencies: 12.4.1

- [x] **12.4.4**: Register all resources
  - File: `src/mcp/resources/index.ts`
  - Acceptance: All resources registered with McpServer
  - Dependencies: 12.4.1, 12.4.2, 12.4.3

#### 12.4.5 Fulltext Operations Refactor (Prerequisite for 12.5)

Refactor fulltext implementation to follow the same pattern as other operations.
Currently fulltext logic is in `cli/commands/fulltext.ts`. Move core logic to `features/operations/fulltext/` so MCP tools can use the same API as other tools (search, list, add, etc.).

- [x] **12.4.5.1**: Create `fulltextAttach` operation
  - File: `src/features/operations/fulltext/attach.ts`, `src/features/operations/fulltext/attach.test.ts`
  - Acceptance: Core attach logic moved from CLI, returns structured result
  - Dependencies: 12.4.4

- [x] **12.4.5.2**: Create `fulltextGet` operation
  - File: `src/features/operations/fulltext/get.ts`, `src/features/operations/fulltext/get.test.ts`
  - Acceptance: Core get logic moved from CLI, returns paths and/or content
  - Dependencies: 12.4.5.1

- [x] **12.4.5.3**: Create `fulltextDetach` operation
  - File: `src/features/operations/fulltext/detach.ts`, `src/features/operations/fulltext/detach.test.ts`
  - Acceptance: Core detach logic moved from CLI
  - Dependencies: 12.4.5.1

- [x] **12.4.5.4**: Update CLI to use new operations
  - File: `src/cli/commands/fulltext.ts`
  - Acceptance: CLI standalone mode uses operations, server mode preserved for 12.4.6
  - Dependencies: 12.4.5.1, 12.4.5.2, 12.4.5.3

- [x] **12.4.5.5**: Export fulltext operations from index
  - File: `src/features/operations/fulltext/index.ts`
  - Acceptance: All operations exported
  - Dependencies: 12.4.5.4

#### 12.4.6 ILibrary Interface (Prerequisite for unified operations)

Introduce `ILibrary` interface so that both `Library` (local) and `ServerClient` (HTTP) can be used interchangeably with operations. This eliminates duplicate logic in CLI commands.

Key design decisions:
- ILibrary methods return CslItem directly (not Reference)
- **All ILibrary methods are async** (to support HTTP-based ServerClient)
- Library internally still uses Reference for ID generation and indexing
- findByDoi/findByPmid remain Library-specific (still return Reference)

- [x] **12.4.6.1**: Define `ILibrary` interface (sync version)
  - File: `src/core/library-interface.ts`
  - Acceptance: Interface defines common methods (findById, findByUuid, getAll, add, updateById, save, etc.)
  - Dependencies: 12.4.5.5

- [x] **12.4.6.2**: Update `Library` to implement `ILibrary` (sync version)
  - File: `src/core/library.ts`
  - Acceptance: Library class implements ILibrary interface
  - Dependencies: 12.4.6.1

- [x] **12.4.6.2a**: Make `ILibrary` interface fully async
  - File: `src/core/library-interface.ts`
  - Acceptance: All methods return Promise (findById, findByUuid, getAll, add, updateById, etc.)
  - Dependencies: 12.4.6.2

- [x] **12.4.6.2b**: Update `Library` for async `ILibrary`
  - File: `src/core/library.ts`, `src/core/library.test.ts`
  - Acceptance: Library methods return Promises (wrap sync operations with Promise.resolve)
  - Dependencies: 12.4.6.2a

- [x] **12.4.6.2c**: Update operations for async `ILibrary`
  - Files: `src/features/operations/*.ts`, `src/features/operations/*.test.ts`
  - Acceptance: All operations await ILibrary method calls
  - Dependencies: 12.4.6.2b

- [x] **12.4.6.2d**: Update consumers for async `ILibrary`
  - Files: `src/cli/index.ts`, `src/server/routes/*.ts`, `src/mcp/*.ts`
  - Acceptance: All consumers await ILibrary method calls
  - Dependencies: 12.4.6.2c

- [x] **12.4.6.3**: Unified `update()` and `find()` methods, `ServerClient` ILibrary implementation
  - Dependencies: 12.4.6.2d
  - Note: Replaces updateById/updateByUuid with unified update(), replaces findById/findByUuid with unified find()
  - **Status**: Complete (update and find)
  - **Known issues**:
    - server-client.test.ts has failing tests for remove()/add()/list()/search() methods (not yet implemented)
    - src/cli/commands/remove.ts uses client.remove() which doesn't exist yet (typecheck fails, will be fixed in 12.4.6.3p-r)

  - [x] **12.4.6.3a**: Extend server PUT endpoints for onIdCollision option
    - File: `src/server/routes/references.ts`, `src/server/routes/references.test.ts`
    - Acceptance: PUT endpoints accept `{ updates, onIdCollision? }` body format

  - [x] **12.4.6.3b**: Add ILibrary methods to ServerClient
    - File: `src/cli/server-client.ts`
    - Acceptance: ServerClient has findById, findByUuid, update, removeById, removeByUuid, save
    - Note: updateById/updateByUuid replaced with unified update() method

  - [x] **12.4.6.3c**: Add `item` field to UpdateResult
    - File: `src/core/library-interface.ts`
    - Acceptance: UpdateResult includes `item?: CslItem` for returning updated item

  - [x] **12.4.6.3d**: Add unified `update()` to ILibrary interface
    - File: `src/core/library-interface.ts`
    - Acceptance: `update(idOrUuid, updates, options?: { byUuid?, onIdCollision? })` defined
    - Note: Replaces updateById/updateByUuid (breaking change, pre-release OK)
    - Dependencies: 12.4.6.3c

  - [x] **12.4.6.3e**: Implement Library.update() with TDD
    - File: `src/core/library.ts`, `src/core/library.test.ts`
    - Acceptance: Library.update() works with both id and uuid, returns item in UpdateResult
    - Dependencies: 12.4.6.3d

  - [x] **12.4.6.3f**: Remove Library.updateById/updateByUuid
    - File: `src/core/library.ts`
    - Acceptance: Old methods removed, update() is the only update method
    - Dependencies: 12.4.6.3e

  - [x] **12.4.6.3g**: Update server PUT endpoint to return updated item
    - File: `src/server/routes/references.ts`, `src/server/routes/references.test.ts`
    - Acceptance: PUT response includes updated CslItem in response body
    - Dependencies: 12.4.6.3c

  - [x] **12.4.6.3h**: Implement ServerClient.update()
    - File: `src/cli/server-client.ts`
    - Acceptance: ServerClient.update() uses single HTTP request, returns item
    - Dependencies: 12.4.6.3d, 12.4.6.3g
    - Note: Item currently not returned from server (pending 12.4.6.3g)

  - [x] **12.4.6.3i**: Remove ServerClient.updateById/updateByUuid
    - File: `src/cli/server-client.ts`
    - Acceptance: Old methods removed
    - Dependencies: 12.4.6.3h

  - [x] **12.4.6.3j**: Update updateReference operation for update()
    - File: `src/features/operations/update.ts`, `src/features/operations/update.test.ts`
    - Acceptance: Use library.update() directly, remove findById/findByUuid call
    - Dependencies: 12.4.6.3f, 12.4.6.3i

  - [x] **12.4.6.3k**: Update fulltext.ts to use update()
    - File: `src/cli/commands/fulltext.ts`
    - Acceptance: updateFulltextMetadataServer uses update() with byUuid option
    - Dependencies: 12.4.6.3j

  - [x] **12.4.6.3l**: Update server-client.test.ts for new API
    - File: `src/cli/server-client.test.ts`
    - Acceptance: Tests updated for update() method
    - Dependencies: 12.4.6.3k

  - [x] **12.4.6.3m**: Add unified find() to ILibrary interface
    - File: `src/core/library-interface.ts`
    - Acceptance: `find(identifier, options?: { byUuid? })` defined, findById/findByUuid marked deprecated
    - Dependencies: 12.4.6.3l

  - [x] **12.4.6.3n**: Implement Library.find() and ServerClient.find()
    - File: `src/core/library.ts`, `src/cli/server-client.ts`, tests
    - Acceptance: Both implementations work with id and uuid
    - Dependencies: 12.4.6.3m

  - [x] **12.4.6.3o**: Replace findById/findByUuid usages with find() (operations layer)
    - Files: `src/features/operations/*.ts`, `src/cli/commands/fulltext.ts`, `src/cli/index.ts`
    - Acceptance: Operations layer uses find(), tests updated
    - Dependencies: 12.4.6.3n
    - Note: mcp, server routes, library.test are updated in 12.4.6.3o2

  - [x] **12.4.6.3o2**: Replace findById/findByUuid usages with find() (remaining layers)
    - Files: `src/mcp/**/*.ts`, `src/server/routes/*.ts`, `src/core/library.test.ts`
    - Acceptance: All layers use find()
    - Dependencies: 12.4.6.3o

  - [x] **12.4.6.3o3**: Remove deprecated findById/findByUuid from ILibrary
    - Files: `src/core/library-interface.ts`, `src/core/library.ts`, `src/cli/server-client.ts`
    - Acceptance: Only find() remains, no deprecated methods
    - Dependencies: 12.4.6.3o2

  - [x] **12.4.6.3p**: Add unified remove() to ILibrary interface
    - File: `src/core/library-interface.ts`
    - Acceptance: `remove(identifier, options?: { byUuid? })` returns `RemoveResult` with `removed` and `removedItem?`
    - Dependencies: 12.4.6.3o

  - [x] **12.4.6.3q**: Implement Library.remove() and ServerClient.remove()
    - File: `src/core/library.ts`, `src/cli/server-client.ts`, tests
    - Acceptance: Both implementations work with id and uuid
    - Note: Library.remove() returns removedItem; ServerClient.remove() returns removedItem
    - Dependencies: 12.4.6.3p

  - [x] **12.4.6.3q2**: Update server DELETE API to return removedItem
    - File: `src/server/routes/references.ts`, `src/features/operations/remove.ts`, tests
    - Acceptance: DELETE endpoints return `{ removed, removedItem? }` and ServerClient.remove() returns removedItem
    - Dependencies: 12.4.6.3q

  - [x] **12.4.6.3r**: Replace removeById/removeByUuid usages with remove()
    - Files: operations, CLI commands
    - Acceptance: All operations use remove(), tests updated
    - Dependencies: 12.4.6.3q

  - [x] **12.4.6.3s**: Update ILibrary.add() to return CslItem
    - File: `src/core/library-interface.ts`, `src/core/library.ts`, `src/cli/server-client.ts`
    - Acceptance: add() returns CslItem instead of void
    - Dependencies: 12.4.6.3r

- [x] **12.4.6.4**: Update operations to accept `ILibrary` (type parameter)
  - File: `src/features/operations/*.ts`
  - Acceptance: All operations use ILibrary instead of Library
  - Dependencies: 12.4.6.2, 12.4.6.3
  - Note: Already done in 12.4.6.2, will need async updates in 12.4.6.2c

- [x] **12.4.6.5**: Simplify CLI fulltext commands
  - File: `src/cli/commands/fulltext.ts`, `src/cli/execution-context.ts`
  - Acceptance: CLI fulltext commands pass ILibrary to operations, no mode branching needed
  - Dependencies: 12.4.6.3

#### 12.4.7 ILibraryOperations Pattern (CLI Unification)

Introduce `ILibraryOperations` interface to unify CLI commands across local and server modes.
Eliminates branching logic (`context.type === "server"`) in CLI commands while preserving mode information.

See: `spec/decisions/ADR-009-ilibrary-operations-pattern.md`

**Note**: MCP remains unchanged (uses Library + operation functions directly).

##### Phase 1: New Abstractions

- [x] **12.4.7.1**: Create `ILibraryOperations` interface
  - File: `src/features/operations/library-operations.ts`
  - Acceptance: Interface extends ILibrary with search, list, cite, import methods
  - Dependencies: 12.4.6.5

- [x] **12.4.7.2**: Create `OperationsLibrary` class
  - File: `src/features/operations/operations-library.ts`, `src/features/operations/operations-library.test.ts`
  - Acceptance: Wraps ILibrary, delegates ILibrary methods, implements high-level methods using operation functions
  - Dependencies: 12.4.7.1

- [x] **12.4.7.3**: Export from operations index
  - File: `src/features/operations/index.ts`
  - Acceptance: ILibraryOperations and OperationsLibrary exported
  - Dependencies: 12.4.7.2

##### Phase 2: ServerClient Updates

- [x] **12.4.7.4**: Rename ServerClient.addFromInputs to import
  - File: `src/cli/server-client.ts`, `src/cli/server-client.test.ts`
  - Acceptance: Method renamed to `import()`, tests updated
  - Dependencies: 12.4.7.1

- [x] **12.4.7.5**: Update ServerClient to implement ILibraryOperations
  - File: `src/cli/server-client.ts`, `src/cli/server-client.test.ts`
  - Acceptance: ServerClient implements ILibraryOperations, existing HTTP methods preserved
  - Dependencies: 12.4.7.4

##### Phase 3: ExecutionContext Updates

- [x] **12.4.7.6**: Simplify ExecutionContext
  - File: `src/cli/execution-context.ts`, `src/cli/execution-context.test.ts`
  - Acceptance: ExecutionContext has `mode: "local" | "server"` and `library: ILibraryOperations`, createExecutionContext returns OperationsLibrary or ServerClient
  - Dependencies: 12.4.7.5

##### Phase 4: CLI Commands Updates

- [x] **12.4.7.7**: Update CLI commands (search, list)
  - File: `src/cli/commands/search.ts`, `src/cli/commands/list.ts`, tests
  - Acceptance: Commands use `context.library.search/list()`, no branching
  - Dependencies: 12.4.7.6

- [x] **12.4.7.8**: Update CLI commands (add, cite)
  - File: `src/cli/commands/add.ts`, `src/cli/commands/cite.ts`, tests
  - Acceptance: Commands use `context.library.import/cite()`, no branching
  - Dependencies: 12.4.7.6

- [x] **12.4.7.9**: Update CLI commands (remove, update)
  - File: `src/cli/commands/remove.ts`, `src/cli/commands/update.ts`, tests
  - Acceptance: Commands use `context.library.remove/update()`, no branching
  - Dependencies: 12.4.7.6

- [x] **12.4.7.10**: Update CLI commands (fulltext)
  - File: `src/cli/commands/fulltext.ts`, `src/cli/commands/fulltext.test.ts`
  - Acceptance: Commands use `context.library` directly (minor update from getLibrary)
  - Dependencies: 12.4.7.6

- [x] **12.4.7.11**: Update CLI main and helpers
  - File: `src/cli/index.ts`
  - Acceptance: findReferenceToRemove uses context.library.find(), imports updated
  - Dependencies: 12.4.7.9

##### Phase 5: Cleanup and Quality

- [x] **12.4.7.12**: Cleanup deprecated code
  - File: `src/cli/execution-context.ts`, `src/cli/commands/cite.ts`
  - Acceptance: Remove ServerExecutionContext, LocalExecutionContext types, isServerContext, isLocalContext, getLibrary functions, buildServerCiteOptions
  - Dependencies: 12.4.7.11

- [x] **12.4.7.13**: Update E2E tests
  - File: `src/cli/execution-context.e2e.test.ts`, `src/cli/performance.e2e.test.ts`
  - Acceptance: E2E tests work with new ExecutionContext
  - Dependencies: 12.4.7.12
  - Note: Fixed missing await in server routes (list.ts, search.ts)

- [x] **12.4.7.14**: Quality checks
  - Acceptance: typecheck, lint, format, all tests pass
  - Dependencies: 12.4.7.13

#### 12.5 Full-text Tools (Unit)

Full-text attachment management.

- [x] **12.5.1**: Implement `fulltext_attach` tool
  - File: `src/mcp/tools/fulltext.ts`, `src/mcp/tools/fulltext.test.ts`
  - Acceptance: Calls fulltextAttach operation, attaches file to reference
  - Dependencies: 12.4.5.5

- [x] **12.5.2**: Implement `fulltext_get` tool
  - File: `src/mcp/tools/fulltext.ts`
  - Acceptance: Calls fulltextGet operation, PDF returns path, Markdown returns content
  - Dependencies: 12.5.1

- [x] **12.5.3**: Implement `fulltext_detach` tool
  - File: `src/mcp/tools/fulltext.ts`
  - Acceptance: Calls fulltextDetach operation, detaches file from reference
  - Dependencies: 12.5.1

#### 12.6 CLI Integration (Integration)

Connect MCP server to CLI.

- [x] **12.6.1**: Create `mcp` CLI command
  - File: `src/cli/commands/mcp.ts`, `src/cli/commands/mcp.test.ts`
  - Acceptance: `reference-manager mcp` starts server, accepts --library
  - Dependencies: 12.4.4, 12.5.3

- [x] **12.6.2**: Register command in CLI
  - File: `src/cli/index.ts`
  - Acceptance: Command available in CLI
  - Dependencies: 12.6.1

#### 12.6.5 HTTP Server File Reload (Unit)

Add file watching and auto-reload to HTTP server using Library.reload().

- [ ] **12.6.5.1**: Integrate FileWatcher into HTTP server
  - File: `src/server/index.ts`, `src/server/index.test.ts`
  - Acceptance: HTTP server monitors library file, calls Library.reload() on change
  - Dependencies: 12.1.4
  - Note: Uses same pattern as MCP server file monitoring

#### 12.7 E2E Tests

End-to-end testing with MCP client.

- [ ] **12.7.1**: E2E test for tool invocation
  - File: `src/mcp/mcp.e2e.test.ts`
  - Acceptance: Start server, invoke tools, verify responses
  - Dependencies: 12.6.2

#### 12.8 Documentation & Quality

- [ ] **12.8.1**: Update README with MCP section
  - File: `README.md`
  - Acceptance: Claude Code integration guide included
  - Dependencies: 12.7.1

- [ ] **12.8.2**: Quality checks
  - Acceptance: typecheck, lint, format, all tests pass
  - Dependencies: 12.8.1

---

## Future Phases

### Phase 13: Citation Enhancements

Post-MVP enhancements for citation functionality:

- Clipboard support (`--clipboard`)
- Pandoc cite key generation (`--cite-key`)
- Custom sort order (`--sort <field>`)
- Group by field (`--group-by <field>`)
- Batch citation generation from file

### Phase 14: Advanced Features

Additional features beyond core functionality:

- Citation graph visualization
- Duplicate detection improvements
- Advanced search operators
- Tag management commands (add/remove tags)
- Note-taking integration
- LSP integration for text editors

---

## Contributing

When planning new features:

1. Create specification in `spec/features/`
2. Create ADR if architectural decision is needed in `spec/decisions/`
3. Add task to this ROADMAP
4. Follow TDD process (see `spec/guidelines/testing.md`)
5. Update CHANGELOG.md when complete
