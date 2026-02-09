# ROADMAP

This document tracks development progress and task management for reference-manager.

For completed features and changes, see [CHANGELOG.md](../../CHANGELOG.md).

For detailed specifications, see [spec/](../).

## Task Management

### File Naming Convention

```
YYYYMMDD-##-feature-name.md
```

- **YYYYMMDD**: Task creation date
- **##**: Sequential number within the same day (01, 02, ...)
- **feature-name**: Kebab-case feature description

Example: `20260106-01-citation-clipboard.md`

### Workflow

1. Create task file from `_template.md`
2. Place in `spec/tasks/` (active tasks)
3. Create git worktree for implementation (see `spec/meta/development-process.md`)
4. Follow TDD process for implementation
5. On completion, move to `spec/tasks/completed/`

### Directory Structure

```
spec/tasks/
├── ROADMAP.md           # This file (progress tracking)
├── _template.md         # Task template
├── YYYYMMDD-##-name.md  # Active tasks
└── completed/           # Completed tasks
    └── YYYYMMDD-##-name.md
```

---

## Before Implementation

**Always read [`spec/meta/development-process.md`](../meta/development-process.md) before starting any implementation work.**

This document defines the workflow including TDD process, quality checks, and commit guidelines.

---

## Completed Phases

- **Phase 1-5**: Core functionality, CLI commands, Server, Build & Distribution
- **Phase 6**: Citation Generation (cite command)
- **Phase 7**: Multi-Format Import (add command with BibTeX, RIS, DOI, PMID support)
- **Phase 8**: Operation Integration (unified operations pattern)
- **Phase 9**: Server Mode Performance Optimization (ExecutionContext pattern)
- **Phase 10**: Full-text Management (attach, get, detach commands)
- **Phase 11**: Search Enhancements (uppercase matching, author given name, tags)
- **Phase 12**: MCP Server (stdio server, ILibrary interface, ILibraryOperations pattern)
- **Phase 13**: MCPB Publishing (manifest.json, release workflow, bundle creation)
- **Phase 14**: ISBN Support (detection, fetching, caching, duplicate detection, idType API)
- **Phase 15**: MCP ILibraryOperations Pattern (unified MCP tool implementation)
- **Phase 16**: Pagination and Sorting (sort/limit/offset for list and search commands)
- **Phase 17**: Shell Completion (Bash/Zsh/Fish auto-completion using tabtab)
- **Phase 18**: Interactive Search (Issue #16, real-time filtering with Enquirer)
- **Phase 19**: Fulltext Open Command (open PDF/Markdown with system default app)
- **Phase 20**: Update Command --set Option (inline field updates for update command)
- **Phase 21**: Search & Export Enhancements (search ID field, export command, edit command)
- **Phase 22**: Interactive ID Selection (fallback to interactive search for ID selection)
- **Phase 23**: Config Command (show/get/set/unset/list-keys/path/edit subcommands)
- **Phase 24**: CLI Option Consistency (unified input/output options, --tui, config keys)
- **Phase 25**: Attachments Architecture (per-reference directories, roles, attach command)
- **Phase 26**: React Ink Migration (replaced Enquirer with React Ink for all TUI)
- **Phase 27**: Update Change Detection (change details, accurate update/edit reporting)
- **Phase 28**: Edit/Update ID Collision Auto-Resolution
- **Phase 30a**: Citation Key Output Format (Pandoc/LaTeX key flags, config, TUI action)
- **Phase 30b**: URL Command (url resolution, ref url command with type filters and browser opening)
- **Phase 29**: Edit Validation Pipeline (two-stage validation, error annotation, retry loop)
- **DevOps**: workmux Integration (parallel agent orchestration with tmux)
- **Phase 30c**: TUI Action Menu Enhancement (dynamic actions, output submenu, side-effect actions, --config fix)
- **Phase 31**: Clipboard Support (clipboard auto-copy, --clipboard/--no-clipboard, env var, config, win32 support)
- **Phase 32a**: Root Command Default TUI Search (`ref` → TUI search on TTY, help on non-TTY)
- **Phase 33**: Sync Interactive Role Assignment (context-based role suggestion, interactive prompt, rename support)
- **Phase 34**: Fulltext Retrieval (OA Discovery & Download, `fulltext discover/fetch/convert`, `add --fetch-fulltext`)
- **Phase 35**: Resource Indicators (emoji indicators 📄📝📎🔗🏷 in pretty format and TUI interactive mode)

See [CHANGELOG.md](../../CHANGELOG.md) for details on implemented features.

---

## Next Steps

### MCPB Registry Submission

Submit to Anthropic's official extension registry when ready.

- **Scope**:
  - Prepare icon.png (256x256)
  - Submit via Anthropic extension form
  - Address review feedback if any

---

## Future Phases

### Phase 32: Advanced Features

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
3. Create task file from `_template.md` in this directory
4. Follow TDD process (see `spec/guidelines/testing.md`)
5. Update CHANGELOG.md when complete
6. Move task file to `completed/`
