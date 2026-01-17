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
- **Phase 22**: Interactive ID Selection (fallback to interactive search for ID selection)

See [CHANGELOG.md](../../CHANGELOG.md) for details on implemented features.

---

## Current Phase

### Phase 23: Config Command

- **Task 1**: Config command (`20260117-01-config-command.md`)
  - New `config` command for managing configuration via CLI
  - Subcommands: `show`, `get`, `set`, `unset`, `list-keys`, `path`, `edit`
  - Zod schema validation for all values
  - Environment variable override warnings
  - Support for user config and local (project) config

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

### Phase 24: Citation Enhancements

Post-MVP enhancements for citation functionality:

- Clipboard support (`--clipboard`)
- Pandoc cite key generation (`--cite-key`)
- Group by field (`--group-by <field>`)
- Batch citation generation from file

### Phase 25: Advanced Features

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
