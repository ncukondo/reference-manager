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
- ✅ **Phase 12**: MCP Server (stdio server, ILibrary interface, ILibraryOperations pattern)
- ✅ **Phase 13**: MCPB Publishing (manifest.json, release workflow, bundle creation)
- ✅ **Phase 14**: ISBN Support (detection, fetching, caching, duplicate detection, idType API)

See [CHANGELOG.md](./CHANGELOG.md) for details on implemented features.

---

## Current Work

### Phase 15: MCP ILibraryOperations Pattern

Extend the `ILibraryOperations` pattern from CLI to MCP for architectural consistency.

**References**:
- ADR-010: MCP ILibraryOperations Pattern
- `spec/architecture/mcp-server.md`

**Note**: Tools/resources only use `ILibrary` methods (`getAll`, `find`), which `ILibraryOperations` inherits. The `Library.reload()` method is only used internally in `createMcpContext` for file watching.

#### 15.1 Update McpContext Interface and Factory

- [x] **15.1.1**: Update McpContext interface
  - File: `src/mcp/context.ts`
  - Change: Replace `library: Library` with `libraryOperations: ILibraryOperations`
  - Keep: Internal `Library` instance for `reload()` in file watcher
  - TDD: Update `src/mcp/context.test.ts` first
  - Acceptance: Interface updated, tests pass

- [x] **15.1.2**: Update createMcpContext implementation
  - File: `src/mcp/context.ts`
  - Change: Create `OperationsLibrary`, return as `libraryOperations`
  - Keep: Local `library` variable for file watcher `reload()`
  - TDD: Test that `libraryOperations` implements `ILibraryOperations`
  - Acceptance: Context returns `libraryOperations`, tests pass

#### 15.2 Update MCP Server Entry Point

- [x] **15.2.1**: Update createMcpServer function
  - File: `src/mcp/index.ts`
  - Change: Use `getLibraryOperations` instead of `getLibrary`
  - TDD: Update `src/mcp/index.test.ts` first
  - Acceptance: Server uses new getter, tests pass

- [x] **15.2.2**: Update registerAllTools signature
  - File: `src/mcp/tools/index.ts`
  - Change: `getLibrary: () => Library` → `getLibraryOperations: () => ILibraryOperations`
  - TDD: Update `src/mcp/tools/index.test.ts` first
  - Acceptance: Tools receive `ILibraryOperations`, tests pass

- [x] **15.2.3**: Update registerAllResources signature
  - File: `src/mcp/resources/index.ts`
  - Change: `getLibrary: () => Library` → `getLibraryOperations: () => ILibraryOperations`
  - TDD: Update `src/mcp/resources/index.test.ts` first
  - Acceptance: Resources receive `ILibraryOperations`, tests pass

#### 15.3 Update Tools

Each tool: change import, use `ILibraryOperations` methods where beneficial.

- [x] **15.3.1**: Update search tool
  - File: `src/mcp/tools/search.ts`
  - Change: Use `libraryOperations.search()` instead of `searchReferences()`
  - TDD: Update `src/mcp/tools/search.test.ts` first
  - Acceptance: Search tool uses interface method, tests pass

- [x] **15.3.2**: Update list tool
  - File: `src/mcp/tools/list.ts`
  - Change: Use `libraryOperations.list()` instead of `listReferences()`
  - TDD: Update `src/mcp/tools/list.test.ts` first
  - Acceptance: List tool uses interface method, tests pass

- [x] **15.3.3**: Update cite tool
  - File: `src/mcp/tools/cite.ts`
  - Change: Use `libraryOperations.cite()` instead of `citeReferences()`
  - TDD: Update `src/mcp/tools/cite.test.ts` first
  - Acceptance: Cite tool uses interface method, tests pass

- [x] **15.3.4**: Update add tool
  - File: `src/mcp/tools/add.ts`
  - Change: Use `libraryOperations.import()` instead of `addReferences()`
  - TDD: Update `src/mcp/tools/add.test.ts` first
  - Acceptance: Add tool uses interface method, tests pass

- [x] **15.3.5**: Update remove tool
  - File: `src/mcp/tools/remove.ts`
  - Change: Type only - use `ILibraryOperations` (`.remove()` inherited from `ILibrary`)
  - TDD: Update `src/mcp/tools/remove.test.ts` first
  - Acceptance: Remove tool typed correctly, tests pass

- [x] **15.3.6**: Update fulltext tools
  - File: `src/mcp/tools/fulltext.ts`
  - Change: Type only - use `ILibraryOperations` (`.find()`, `.update()` inherited)
  - TDD: Update `src/mcp/tools/fulltext.test.ts` first
  - Acceptance: Fulltext tools typed correctly, tests pass

#### 15.4 Update Resources

- [x] **15.4.1**: Update library resources
  - File: `src/mcp/resources/library.ts`
  - Change: Type only - use `ILibraryOperations` (`.getAll()`, `.find()` inherited)
  - TDD: Update `src/mcp/resources/library.test.ts` first
  - Acceptance: Resources typed correctly, tests pass

#### 15.5 Final Verification

- [x] **15.5.1**: Run all tests and quality checks
  - Run: `npm run typecheck && npm run lint && npm test`
  - Verify: E2E tests in `src/mcp/mcp.e2e.test.ts` pass
  - Acceptance: All quality checks pass, no regressions

---

## Future Phases

### MCPB Registry Submission

Submit to Anthropic's official extension registry when ready:

- Prepare icon.png (256x256)
- Submit via [Anthropic extension form](https://docs.google.com/forms/d/14_Dmcig4z8NeRMB_e7TOyrKzuZ88-BLYdLvS6LPhiZU/edit)
- Address review feedback if any

References:
- [MCPB Specification](https://github.com/anthropics/dxt/blob/main/MANIFEST.md)
- [Desktop Extensions Guide](https://www.anthropic.com/engineering/desktop-extensions)

### Phase 15: Citation Enhancements

Post-MVP enhancements for citation functionality:

- Clipboard support (`--clipboard`)
- Pandoc cite key generation (`--cite-key`)
- Custom sort order (`--sort <field>`)
- Group by field (`--group-by <field>`)
- Batch citation generation from file

### Phase 16: Advanced Features

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
