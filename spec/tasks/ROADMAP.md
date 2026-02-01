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

See [CHANGELOG.md](../../CHANGELOG.md) for details on implemented features.

---

## Current Phase

### Phase 30c: TUI Action Menu Enhancement

Expand the TUI search action menu with dynamic actions based on selection count,
citation key (Pandoc/LaTeX), Open URL, Open fulltext, Manage attachments,
Edit, Remove, output format submenu, and config-driven defaults.

**Task**: `20260129-03-tui-action-menu.md`

**Depends on**: Phase 30a (citation key format) ✅, Phase 30b (URL command) ✅

**Scope**:
- Dynamic action menu (single vs. multiple entry selection)
- Citation key action with config-driven format label
- New actions: Open URL, Open fulltext, Manage attachments, Edit reference(s), Remove
- Output format submenu (IDs, CSL-JSON, BibTeX, YAML)
- Default citation style from `config.citation.defaultStyle`
- Side-effect action execution architecture

**Todos**:
- [ ] Step 1: Refactor ActionType and dynamic action choices
- [ ] Step 2: Add Output format submenu
- [ ] Step 3: Use default citation style from config
- [ ] Step 4: Side-effect action architecture
- [ ] Step 5: Implement Citation key action
- [ ] Step 6: Implement Open URL action
- [ ] Step 7: Implement Open fulltext action
- [ ] Step 8: Implement Manage attachments action
- [ ] Step 9: Implement Edit action
- [ ] Step 10: Implement Remove action

---

## Next Steps

### MCPB Registry Submission

Submit to Anthropic's official extension registry when ready.

- **Scope**:
  - Prepare icon.png (256x256)
  - Submit via Anthropic extension form
  - Address review feedback if any

### Phase 31: Clipboard Support

Add clipboard auto-copy for CLI output, controlled via config, environment variable, and CLI flag.

**Task**: `20260129-04-clipboard-support.md`

**Scope**:
- Clipboard utility module (OS command detection: `pbcopy`, `clip.exe`, `wl-copy`, `xclip`)
- Config setting: `cli.tui.clipboard_auto_copy` (TUI output only)
- Environment variable: `REFERENCE_MANAGER_CLIPBOARD_AUTO_COPY` (all output commands)
- Global CLI option: `--clipboard` / `--no-clipboard` (all output commands)
- Centralized output helper (stdout + clipboard, graceful degradation)
- Spec updates

**Todos**:
- [ ] Step 1: Clipboard utility module
- [ ] Step 2: Config schema and defaults
- [ ] Step 3: CLI global option `--clipboard` / `--no-clipboard`
- [ ] Step 4: Integrate clipboard into output path
- [ ] Step 5: Update specs

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
