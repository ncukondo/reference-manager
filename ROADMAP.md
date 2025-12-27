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

See [CHANGELOG.md](./CHANGELOG.md) for details on implemented features.

---

## Current Phase

### Phase 13: MCPB Publishing

Enable publishing to MCPB (MCP Bundles) registry alongside GitHub releases.

#### Overview

- Create MCPB manifest for Claude Desktop integration
- Automate `.mcpb` bundle creation in release workflow
- Submit to Anthropic's official extension registry

#### Implementation Steps

- [x] **Step 1: Create manifest.json**
  - Create `manifest.json` in project root (without version field)
  - Required fields: manifest_version, name, display_name, description, author, server
  - Configure `user_config` for config file path input
  - Set compatibility (platforms, Node.js runtime requirement)

- [x] **Step 2: Update release workflow**
  - Add Node.js setup step
  - Add `npm ci` and `npm run build` steps
  - Add production dependencies installation (`npm ci --production`)
  - Install `@anthropic-ai/mcpb` CLI
  - Inject version from package.json into manifest.json
  - Run `mcpb pack` to create `.mcpb` bundle
  - Attach `.mcpb` file to GitHub release

- [x] **Step 3: Local testing**
  - Build MCPB bundle locally: `npx @anthropic-ai/mcpb pack`
  - Test installation on Claude Desktop (macOS/Windows)
  - Verify MCP server starts correctly with user-provided config path
  - Test all MCP tools (add, search, cite, etc.)

- [x] **Step 4: Documentation**
  - Add MCPB installation instructions to README
  - Document `user_config.config_path` requirement
  - Add troubleshooting section for common issues

- [ ] **Step 5: Registry submission (optional)**
  - Prepare icon.png (256x256)
  - Submit via [Anthropic extension form](https://docs.google.com/forms/d/14_Dmcig4z8NeRMB_e7TOyrKzuZ88-BLYdLvS6LPhiZU/edit)
  - Address review feedback if any

#### Technical Notes

| Item | Details |
|------|---------|
| Entry point | `bin/reference-manager.js mcp --config <path>` |
| Server type | `node` |
| User config | `config_path` (required string) |
| Platforms | darwin, win32, linux |
| Node.js | >=22.0.0 |

#### References

- [MCPB Specification](https://github.com/anthropics/dxt/blob/main/MANIFEST.md)
- [Desktop Extensions Guide](https://www.anthropic.com/engineering/desktop-extensions)

---

## Next Phase

### Phase 14: ISBN Support

Add ISBN (International Standard Book Number) support to the add command.

#### Overview

- Support ISBN-10 and ISBN-13 formats
- Use `@citation-js/plugin-isbn` for metadata fetching (Google Books API, Open Library)
- Integrate with existing identifier workflow (detection, normalization, caching)

#### Specification Updates

- [x] **14.1**: Update `spec/features/add.md`
  - Add ISBN to supported formats table
  - Document input patterns (`ISBN:`, `isbn:` prefix)
  - Document `--format isbn` option
  - Add rate limiting info (Google Books: 1,000 req/day)

- [x] **14.2**: Update `spec/core/data-model.md`
  - Add ISBN field documentation

- [x] **14.3**: Update `spec/features/duplicate-detection.md`
  - Add ISBN to duplicate detection priority (after PMID)

#### Implementation Steps

- [x] **14.4**: Add dependency
  - File: `package.json`
  - Add `@citation-js/plugin-isbn` package
  - Run `npm install`

- [x] **14.5**: ISBN detection
  - File: `src/features/import/detector.ts`
  - Add `isIsbn(input: string): boolean` function
  - Add `"isbn"` to `InputFormat` type
  - Update `detectFormat()` to detect ISBN with prefix
  - Acceptance: Detects `ISBN:978...`, `isbn:4-00-...` patterns
  - Tests: `detector.test.ts`

- [ ] **14.6**: ISBN normalization
  - File: `src/features/import/normalizer.ts`
  - Add `normalizeIsbn(isbn: string): string` function
  - Remove hyphens/spaces, strip `ISBN:` prefix, uppercase X
  - Acceptance: `ISBN:978-4-00-000000-0` → `9784000000000`
  - Tests: `normalizer.test.ts`

- [ ] **14.7**: ISBN fetching
  - File: `src/features/import/fetcher.ts`
  - Add `fetchIsbn(isbn: string): Promise<FetchResult>` function
  - Use `@citation-js/plugin-isbn` for API calls
  - Handle errors (not found, rate limit)
  - Tests: `fetcher.test.ts` (mocked)

- [ ] **14.8**: ISBN caching
  - File: `src/features/import/cache.ts`
  - Add `getIsbnFromCache()`, `cacheIsbnResult()` functions
  - Same pattern as PMID/DOI caching
  - Tests: `cache.test.ts`

- [ ] **14.9**: Importer integration
  - File: `src/features/import/importer.ts`
  - Add `isbns: string[]` to `ClassifiedIdentifiers`
  - Update `classifyIdentifiers()` to classify ISBNs
  - Add `fetchIsbnsWithCache()` function
  - Update `importFromIdentifiers()` to handle ISBNs
  - Dependencies: 14.5, 14.6, 14.7, 14.8
  - Tests: `importer.test.ts`

- [ ] **14.10**: Library ISBN index
  - File: `src/core/library.ts`
  - Add `findByIsbn(isbn: string): Reference | undefined`
  - Build ISBN index on load
  - Tests: `library.test.ts`

- [ ] **14.11**: Duplicate detection
  - File: `src/features/duplicate/detector.ts`
  - Add ISBN matching (priority: DOI > PMID > ISBN > Title+Author+Year)
  - Dependencies: 14.10
  - Tests: `detector.test.ts`

- [ ] **14.12**: CLI integration
  - File: `src/cli/commands/add.ts`
  - Add `isbn` to format choices
  - Tests: `add.test.ts`

- [ ] **14.13**: E2E tests
  - File: `src/cli/add.e2e.test.ts`
  - Test ISBN add with prefix
  - Test `--format isbn` option
  - Test duplicate detection by ISBN
  - Dependencies: All above

- [ ] **14.14**: Documentation
  - Update README.md with ISBN examples
  - Verify help text includes ISBN

#### Technical Notes

| Item | Details |
|------|---------|
| ISBN-10 pattern | 10 digits (last may be X) |
| ISBN-13 pattern | 13 digits starting with 978/979 |
| Detection priority | DOI > PMID > ISBN (pure digits → PMID) |
| Explicit ISBN | `ISBN:` prefix or `--format isbn` |
| Data source | Google Books API (primary), Open Library (fallback) |
| Rate limit | 1,000 req/day (Google Books) |

#### References

- [@citation-js/plugin-isbn](https://github.com/citation-js/plugin-isbn)
- [Google Books API](https://developers.google.com/books)

---

## Future Phases

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
