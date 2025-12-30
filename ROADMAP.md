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

See [CHANGELOG.md](./CHANGELOG.md) for details on implemented features.

---

## Current Work

### Phase 17: Shell Completion

Bash/Zsh/Fish auto-completion using tabtab.

**Spec**: `spec/features/shell-completion.md`
**ADR**: `spec/decisions/ADR-011-use-tabtab-for-shell-completion.md`

#### 17.1: Foundation Setup
- [x] Install tabtab package (`npm install tabtab`)
- [x] Create `src/cli/completion.ts` module skeleton
- [x] Add type definitions if needed

#### 17.2: Completion Command (TDD)
- [x] Write tests for `completion` command (`src/cli/completion.test.ts`)
- [x] Implement `registerCompletionCommand` function
- [x] Implement `installCompletion` action
- [x] Implement `uninstallCompletion` action
- [x] Register command in `src/cli/index.ts`

#### 17.3: Static Completion (TDD)
- [x] Write tests for static completion logic
- [x] Implement subcommand completion (`list`, `search`, `add`, etc.)
- [x] Implement global option completion (`--config`, `--library`, etc.)
- [x] Implement command-specific option completion
- [x] Implement option value completion (`--sort`, `--format`, etc.)

#### 17.4: Dynamic ID Completion (TDD)
- [ ] Write tests for dynamic ID completion
- [ ] Implement library loading for completion context
- [ ] Implement ID filtering based on partial input
- [ ] Add context detection (cite, remove, update, fulltext commands)
- [ ] Add description suffix for Zsh/Fish (e.g., `smith2023:RNA interference...`)
- [ ] Handle errors gracefully (empty completions on failure)

#### 17.5: Integration and Polish
- [ ] Integrate completion handler in CLI entry point
- [ ] Handle `COMP_LINE` environment variable detection
- [ ] Test with actual shells (Bash, Zsh)
- [ ] Performance optimization (limit candidates to 100)

#### 17.6: Documentation and Quality
- [ ] Run full test suite (`npm test`)
- [ ] Run quality checks (`npm run typecheck && npm run lint && npm run format`)
- [ ] Update README with completion setup instructions
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
