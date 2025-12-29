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

## Completed: Phase 15

- ✅ **Phase 15**: MCP ILibraryOperations Pattern (see CHANGELOG.md)

---

## Current Work

### Phase 16: Pagination and Sorting

Add sorting, limit, and offset options to `list` and `search` commands across CLI, HTTP API, and MCP.

**References**:
- `spec/features/pagination.md` - Complete specification
- `spec/architecture/cli.md` - CLI options
- `spec/architecture/mcp-server.md` - MCP parameters
- `spec/architecture/http-server.md` - HTTP query parameters

#### 16.1 Foundation: Types and Utilities

Core types and sorting utilities that other layers depend on.

- [x] **16.1.1**: Create pagination types
  - File: `src/features/pagination/types.ts` (new)
  - Types: `SortField`, `SearchSortField`, `SortOrder`, `PaginationOptions`, `SortOptions`, `PaginatedResult`
  - Acceptance: Types exported, Zod schemas for validation

- [x] **16.1.2**: Create sort field alias resolver
  - File: `src/features/pagination/aliases.ts` (new)
  - Function: `resolveSortAlias(alias: string): SortField` - resolves `pub`→`published`, `mod`→`updated`, `add`→`created`, `rel`→`relevance`
  - TDD: `src/features/pagination/aliases.test.ts`
  - Acceptance: All aliases resolve correctly, unknown throws error

- [x] **16.1.3**: Create reference sorter
  - File: `src/features/pagination/sorter.ts` (new)
  - Function: `sortReferences(items: CslItem[], sort: SortField, order: SortOrder): CslItem[]`
  - Handles: `created`, `updated`, `published`, `author`, `title`
  - Uses secondary sort: `created` (desc), then `id` (asc) for stability
  - TDD: `src/features/pagination/sorter.test.ts`
  - Acceptance: All sort fields work, missing values handled correctly

- [x] **16.1.4**: Create pagination applier
  - File: `src/features/pagination/paginate.ts` (new)
  - Function: `paginate<T>(items: T[], options: { limit?: number; offset?: number }): { items: T[]; nextOffset: number | null }`
  - TDD: `src/features/pagination/paginate.test.ts`
  - Acceptance: limit=0 returns all, offset works, nextOffset calculated correctly

- [x] **16.1.5**: Create pagination module index
  - File: `src/features/pagination/index.ts` (new)
  - Re-exports all types and functions
  - Acceptance: Clean public API

#### 16.2 Configuration

Add CLI and MCP configuration sections.

- [x] **16.2.1**: Add CLI config schema
  - File: `src/config/schema.ts`
  - Add: `cliConfigSchema` with `defaultLimit`, `defaultSort`, `defaultOrder`
  - Update: `configSchema`, `partialConfigSchema`
  - Acceptance: Config parsing works with new fields

- [x] **16.2.2**: Add MCP config schema
  - File: `src/config/schema.ts`
  - Add: `mcpConfigSchema` with `defaultLimit`
  - Update: `configSchema`, `partialConfigSchema`
  - Acceptance: MCP default limit configurable

#### 16.3 Operations Layer

Update list and search operations to support pagination.

- [ ] **16.3.1**: Update ListOptions and ListResult types
  - File: `src/features/operations/list.ts`
  - Change: Extend `ListOptions` with `PaginationOptions & SortOptions`
  - Change: Extend `ListResult` to include `total`, `limit`, `offset`, `nextOffset`
  - TDD: Update `src/features/operations/list.test.ts`
  - Acceptance: Types updated, backward compatible (optional fields)

- [ ] **16.3.2**: Implement listReferences with pagination
  - File: `src/features/operations/list.ts`
  - Change: Apply sorting → pagination → formatting
  - Default sort: `updated` (desc)
  - TDD: Add tests for sort, limit, offset combinations
  - Acceptance: Pagination works, result includes metadata

- [ ] **16.3.3**: Update SearchOperationOptions and SearchResult types
  - File: `src/features/operations/search.ts`
  - Change: Extend with `PaginationOptions & SortOptions<SearchSortField>`
  - Change: Extend result with pagination metadata
  - TDD: Update `src/features/operations/search.test.ts`
  - Acceptance: Types updated, `relevance` sort available for search only

- [ ] **16.3.4**: Implement searchReferences with pagination
  - File: `src/features/operations/search.ts`
  - Change: After search, apply sorting → pagination → formatting
  - Default sort: `updated` (desc)
  - `relevance` sort uses existing `sortResults` function
  - TDD: Add tests for sort, limit, offset combinations
  - Acceptance: Pagination works, relevance sort preserved

#### 16.4 CLI Layer

Add command-line options for pagination.

- [ ] **16.4.1**: Update list command options
  - File: `src/cli/commands/list.ts`
  - Add: `--sort`, `--order`, `--limit/-n`, `--offset`
  - Map: CLI options to `ListOptions`
  - TDD: `src/cli/commands/list.test.ts`
  - Acceptance: Options parsed correctly

- [ ] **16.4.2**: Update list command output
  - File: `src/cli/commands/list.ts`
  - Add: Header line when limit applied (`# Showing 1-10 of 150 references`)
  - JSON output: Include pagination metadata
  - TDD: Test output format
  - Acceptance: Header shown when paginated, JSON includes metadata

- [ ] **16.4.3**: Update search command options
  - File: `src/cli/commands/search.ts`
  - Add: `--sort`, `--order`, `--limit/-n`, `--offset`
  - Map: CLI options to `SearchOperationOptions`
  - TDD: `src/cli/commands/search.test.ts`
  - Acceptance: Options parsed correctly, `relevance` sort available

- [ ] **16.4.4**: Update search command output
  - File: `src/cli/commands/search.ts`
  - Add: Header line when limit applied
  - JSON output: Include pagination metadata
  - TDD: Test output format
  - Acceptance: Same as list command

- [ ] **16.4.5**: Register CLI options in Commander
  - File: `src/cli/index.ts`
  - Add: Options to `list` and `search` commands
  - TDD: E2E test with actual CLI invocation
  - Acceptance: `ref list -n 10 --sort pub` works

#### 16.5 HTTP API Layer

Add query parameters for pagination.

- [ ] **16.5.1**: Update references endpoint
  - File: `src/server/routes/references.ts`
  - Parse: Query params `sort`, `order`, `limit`, `offset`
  - Pass: To `listReferences` or `searchReferences`
  - TDD: `src/server/routes/references.test.ts`
  - Acceptance: Pagination via query params works

- [ ] **16.5.2**: Update response format
  - File: `src/server/routes/references.ts`
  - Change: Return `{ items, total, limit, offset, nextOffset }`
  - TDD: Verify JSON response structure
  - Acceptance: Response includes pagination metadata

#### 16.6 MCP Layer

Add tool parameters for pagination with default limit.

- [ ] **16.6.1**: Update list tool parameters
  - File: `src/mcp/tools/list.ts`
  - Add: `sort`, `order`, `limit`, `offset` parameters
  - Default: `limit=20` from config
  - TDD: `src/mcp/tools/list.test.ts`
  - Acceptance: Parameters work, default limit applied

- [ ] **16.6.2**: Update search tool parameters
  - File: `src/mcp/tools/search.ts`
  - Add: `sort`, `order`, `limit`, `offset` parameters
  - Add: `relevance` as valid sort option
  - Default: `limit=20` from config
  - TDD: `src/mcp/tools/search.test.ts`
  - Acceptance: Parameters work, default limit applied

- [ ] **16.6.3**: Update MCP context for config
  - File: `src/mcp/context.ts`
  - Add: Access to MCP config for default limit
  - TDD: `src/mcp/context.test.ts`
  - Acceptance: Context provides MCP config

#### 16.7 Integration and Documentation

- [ ] **16.7.1**: E2E tests for pagination
  - Files: `src/cli/cli.e2e.test.ts`, `src/mcp/mcp.e2e.test.ts`
  - Test: Full flow from CLI/MCP to results with pagination
  - Acceptance: E2E tests pass

- [ ] **16.7.2**: Final verification
  - Run: `npm run typecheck && npm run lint && npm test`
  - Acceptance: All quality checks pass

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

### Phase 17: Citation Enhancements

Post-MVP enhancements for citation functionality:

- Clipboard support (`--clipboard`)
- Pandoc cite key generation (`--cite-key`)
- Group by field (`--group-by <field>`)
- Batch citation generation from file

### Phase 18: Advanced Features

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
