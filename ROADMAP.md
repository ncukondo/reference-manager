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
- [ ] Refactor CLI add command structure
  - [x] Rename `add.ts` to `add-core.ts` (single item logic)
  - [ ] Create new `add.ts` facade with:
    - [ ] `classifyInputs()`: Separate file paths from identifiers
    - [ ] `processFileInputs()`: Read files and call importer
    - [ ] `processIdentifierInputs()`: Call importer for PMID/DOI
    - [ ] `processStdinInput()`: Read stdin and call importer
    - [ ] `formatOutput()`: Format summary (added/failed/skipped)
    - [ ] `getExitCode()`: Determine exit code from results
  - [ ] Write unit tests for each function (TDD)
- [ ] Update CLI command registration (`index.ts`)
  - [ ] Change `[file]` to `[input...]` (variadic)
  - [ ] Add `--format` option (json|bibtex|ris|pmid|doi|auto)
  - [ ] Add `--verbose` option
  - [ ] Wire up to new `add.ts` facade
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

### Phase 8: Citation Enhancements

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

### Phase 9: Advanced Features

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
