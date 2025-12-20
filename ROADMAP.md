# ROADMAP

This document tracks future development plans for reference-manager.

For completed features and changes, see [CHANGELOG.md](./CHANGELOG.md).

For detailed specifications, see [spec/](./spec/).

## Completed Phases

- ✅ **Phase 1-5**: Core functionality, CLI commands, Server, Build & Distribution
- ✅ **Phase 6**: Citation Generation (cite command)

See [CHANGELOG.md](./CHANGELOG.md) for details on implemented features.

---

## Current Phase

### Phase 7: Multi-Format Import

Extend `add` command to support multiple input formats beyond CSL-JSON.

**Specification**: [spec/features/add-import.md](./spec/features/add-import.md)

**Process**: TDD (see `spec/guidelines/testing.md`)

**Commit Policy**: Commit after completing each task

**Complexity Management**: If a task is too complex, break it down into smaller subtasks. Review and update specs/ADRs as needed, then reflect changes in this ROADMAP

#### Tasks

- [x] Add citation-js plugins as dependencies
  - `@citation-js/plugin-bibtex`
  - `@citation-js/plugin-ris`
  - `@citation-js/plugin-doi`
  - Note: `@citation-js/plugin-pubmed` excluded due to version incompatibility (see ADR-007)
- [x] Setup vitest workspace for remote access tests
  - Separate workspace for tests requiring network (PMID/DOI fetch)
  - Allow running local-only tests independently
- [x] Update config module for PubMed settings
  - Add `[pubmed]` section to config schema
  - Support `email` and `api_key` fields
  - Environment variable priority: `PUBMED_EMAIL`, `PUBMED_API_KEY`
- [x] Implement rate limiter module (`src/features/import/rate-limiter.ts`)
  - Factory + lazy initialization singleton pattern
  - Shared between CLI and server modes
  - PubMed: 3 req/sec (without API key) or 10 req/sec (with API key)
  - Crossref: 50 req/sec
- [x] Implement format detection module (`src/features/import/detector.ts`)
  - File extension detection (.json, .bib, .ris)
  - Content-based detection
  - PMID detection (numeric)
  - DOI detection (10.xxx, URL formats)
  - Multiple identifiers detection (whitespace-separated)
- [x] Implement DOI normalizer (`src/features/import/normalizer.ts`)
  - URL prefix removal (doi.org, dx.doi.org)
- [x] Implement parser module (`src/features/import/parser.ts`)
  - BibTeX parsing via citation-js
  - RIS parsing via citation-js
- [x] Implement fetcher module (`src/features/import/fetcher.ts`)
  - PMID batch fetching via PMC Citation Exporter API (see ADR-007)
  - DOI fetching via citation-js (Cite.async)
  - Zod validation for API responses
  - Error handling (not found, network error)
  - Remote API tests (`fetcher.remote.test.ts`)
- [x] Fix existing lint warnings
  - `src/config/loader.ts`: Reduce cognitive complexity of `mergeConfigs` (17 → ≤15)
  - `src/config/schema.ts`: Reduce cognitive complexity of `normalizePartialConfig` (18 → ≤15)
  - `src/features/import/fetcher.ts`: Reduce cognitive complexity of `fetchPmids` (17 → ≤15)
  - `src/config/loader.test.ts`: Add biome-ignore for required `delete` operator
- [x] Implement response cache module (`src/features/import/cache.ts`)
  - In-memory cache with TTL (1 hour default)
  - Keyed by identifier (PMID or DOI)
  - Avoid redundant API calls
  - Reset function for test isolation
- [x] Implement importer orchestration (`src/features/import/importer.ts`)
  - Coordinate detection, parsing, fetching
  - Aggregate results (success/failure/skipped)
- [ ] Add `importFromInputs()` to `features/import/importer.ts`
  - [ ] Unified entry point: inputs (file paths/identifiers) → ImportResult
  - [ ] Classifies inputs (file vs identifier)
  - [ ] Reads files and detects format
  - [ ] Aggregates results from importFromContent/importFromIdentifiers
- [ ] Create `features/operations/add.ts`
  - [ ] `addReferences(inputs, library, config, options)` → AddResult
  - [ ] Calls `importFromInputs()` internally
  - [ ] Business logic: duplicate detection, ID resolution, library save
  - [ ] Move single-item logic from `cli/commands/add-core.ts`
  - [ ] Delete `cli/commands/add-core.ts` after migration
- [ ] Add server route for add (`server/routes/add.ts`)
  - [ ] POST endpoint for adding references
  - [ ] Import and call `addReferences()` from operations
  - [ ] Minimal HTTP handling only
- [ ] Simplify `cli/commands/add.ts`
  - [ ] Input: library, config, options, server status
  - [ ] If server running → call server API
  - [ ] If server stopped → call `addReferences()` directly
  - [ ] Output formatting (CLI-specific)
  - [ ] Exit code determination
- [ ] Update `cli/index.ts` for add command
  - [ ] Change `[file]` to `[input...]` (variadic)
  - [ ] Add `--format` option (json|bibtex|ris|pmid|doi|auto)
  - [ ] Add `--verbose` option
  - [ ] Pass server status to add.ts
- [ ] Integration tests
  - [ ] End-to-end file import (JSON, BibTeX, RIS)
  - [ ] End-to-end identifier import (PMID, DOI)
  - [ ] stdin handling
  - [ ] Mixed input types
  - [ ] Error cases and exit codes

#### Related ADRs

- [ADR-007: Use PMC Citation Exporter API for PMID Fetching](./spec/decisions/ADR-007-use-pmc-api-for-pmid-fetching.md)

---

## Future Phases

### Phase 8: Operation Integration

Refactor other commands to use `features/operations/` pattern.

See: [spec/architecture/module-dependencies.md](./spec/architecture/module-dependencies.md) (Integration Functions Pattern)

- [ ] Create `features/operations/` for each command
  - [ ] `list.ts`: listReferences(library, options)
  - [ ] `search.ts`: searchReferences(library, query, options)
  - [ ] `remove.ts`: removeReference(library, id, options)
  - [ ] `update.ts`: updateReference(library, id, updates, options)
  - [ ] `cite.ts`: citeReferences(library, ids, options)
- [ ] Add/update server routes to use operations
- [ ] Simplify CLI commands
  - [ ] Server running → call server API
  - [ ] Server stopped → call operations directly
  - [ ] Output formatting only
- [ ] Simplify `cli/index.ts` to routing only

### Phase 9: Citation Enhancements

Post-MVP enhancements for citation functionality:

- Clipboard support (`--clipboard`)
- Pandoc cite key generation (`--cite-key`)
- Numbered citation style (`--numbered`)
- Custom sort order (`--sort <field>`)
- Group by field (`--group-by <field>`)
- Interactive style selection
- Citation preview in server mode
- Batch citation generation from file
- LSP integration for text editors

### Phase 10: Advanced Features

Additional features beyond core functionality:

- Full-text PDF management
- Automatic metadata extraction from PDFs
- Citation graph visualization
- Duplicate detection improvements
- Advanced search operators
- Tag management
- Note-taking integration

---

## Contributing

When planning new features:

1. Create specification in `spec/features/`
2. Create ADR if architectural decision is needed in `spec/decisions/`
3. Add task to this ROADMAP
4. Follow TDD process (see `spec/guidelines/testing.md`)
5. Update CHANGELOG.md when complete
