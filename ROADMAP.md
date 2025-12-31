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
- ✅ **Phase 15**: MCP ILibraryOperations Pattern (unified MCP tool implementation)
- ✅ **Phase 16**: Pagination and Sorting (sort/limit/offset for list and search commands)
- ✅ **Phase 17**: Shell Completion (Bash/Zsh/Fish auto-completion using tabtab)

See [CHANGELOG.md](./CHANGELOG.md) for details on implemented features.

---

## Current Phase

### Phase 18: Interactive Search (Issue #16)

Interactive incremental search mode for CLI with real-time filtering.

**Spec**: `spec/features/interactive-search.md`
**ADR**: `spec/decisions/ADR-012-use-enquirer-for-interactive-prompts.md`

#### Tasks (TDD order: minimal dependencies first)

**Step 1: Config Schema** (deps: none)
- [x] Add `cli.interactive.limit` config option (default: 20)
- [x] Add `cli.interactive.debounce_ms` config option (default: 200)
- [x] Unit tests for config validation

**Step 2: Display Format Functions** (deps: none, pure functions)
- [x] `formatAuthors()`: Format author list (>3 authors → "et al.")
- [x] `formatTitle()`: Truncate title to terminal width
- [x] `formatIdentifiers()`: Display DOI/PMID/PMCID/ISBN
- [x] `formatSearchResult()`: Compose result line
- [x] Unit tests for all format functions

**Step 3: Debounce Utility** (deps: none)
- [x] Implement debounce function
- [x] Unit tests with timer mocks

**Step 4: TTY Detection** (deps: none)
- [x] `checkTTY()`: Exit with error (code 1) for non-TTY
- [x] Unit tests for TTY detection

**Step 5: Library Cache** (deps: Library interface)
- [x] ~~Implement session cache for `library.getAll()`~~ **SKIPPED**
- [x] ~~Unit tests for cache behavior~~ **SKIPPED**
- Note: `Library.getAll()` already operates on in-memory data (no file I/O).
  CLI mode does not use file watching, so no additional caching is needed.

**Step 6: Enquirer Integration** (deps: Enquirer)
- [x] Add Enquirer dependency
- [x] Add TypeScript type augmentation (`enquirer.d.ts`)
- [x] Implement `search-prompt.ts` with AutoComplete prompt
  - `createChoices()`, `parseSelectedValues()`, `runSearchPrompt()`
- [x] Integrate search logic (uses existing search/matcher.ts)
- [x] Unit tests with Enquirer mock

**Step 7: Action Menu** (deps: Enquirer, existing commands)
- [x] Implement action menu (Select prompt)
  - Output IDs
  - Output as CSL-JSON
  - Output as BibTeX
  - Generate citation (APA/choose style)
  - Cancel
- [x] Unit tests for action menu

**Step 8: CLI Command Integration** (deps: all above)
- [x] Add `-i, --interactive` flag to search command
- [x] Support initial query argument
- [x] E2E tests (limited scope)

**Step 9: Completion**
- [ ] Update CHANGELOG.md

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

### Phase 18: Citation Enhancements

Post-MVP enhancements for citation functionality:

- Clipboard support (`--clipboard`)
- Pandoc cite key generation (`--cite-key`)
- Group by field (`--group-by <field>`)
- Batch citation generation from file

### Phase 19: Advanced Features

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
