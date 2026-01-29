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

See [CHANGELOG.md](../../CHANGELOG.md) for details on implemented features.

---

## Current Phase

### Phase 28: Edit/Update ID Collision Auto-Resolution

Enable automatic ID collision resolution for `ref edit` and `ref update` CLI commands,
aligning with existing server behavior.

**Task**: `completed/20260127-04-edit-id-collision-resolution.md`

**Depends on**: PR #45 Follow-up Refactor (Steps 3 & 4 modify the same functions in `edit.ts`)

**Scope**:
- Add `idChanged`/`newId` fields to `EditItemResult`
- Enable `onIdCollision: "suffix"` for both edit and update commands
- Update output formatting to show resolved IDs
- Align CLI behavior with HTTP server defaults

**Todos**:
- [x] Step 1: Add `idChanged`/`newId` to EditItemResult
- [x] Step 2: Enable `onIdCollision: "suffix"` for edit command
- [x] Step 3: Update `formatEditOutput` for ID changes
- [x] Step 4: Enable `onIdCollision: "suffix"` for update command
- [x] Step 5: Update existing tests

### PR #45 Follow-up Refactor (Completed)

Code quality improvements identified during PR #45 review.

**Task**: `completed/20260127-01-pr45-followup-refactor.md`

**Scope**:
- Extract duplicated `isEqual` to shared utility
- Unify `PROTECTED_CUSTOM_FIELDS` with two-level architecture
- Include `oldItem` in `id_collision` edit result
- Fallback to ID-based update when UUID missing

**Todos**:
- [x] Step 1: Extract `isEqual` to shared utility
- [x] Step 2: Share protected fields with two-level architecture
- [x] Step 3: Include `oldItem` in `id_collision` result
- [x] Step 4: Fallback to ID-based update when UUID missing

### Remove `custom.fulltext` (Completed)

Remove all legacy `custom.fulltext` references from codebase and specs.

**Task**: `completed/20260127-02-remove-custom-fulltext.md`

**Scope**:
- Remove `custom.fulltext` from production code
- Remove `custom.fulltext` from tests
- Remove `custom.fulltext` from specs

**Todos**:
- [x] Step 1: Remove from production code
- [x] Step 2: Remove from tests
- [x] Step 3: Remove from specs

### Unify Attachments Directory Configuration (Completed)

Remove dead `[fulltext]` config section and unify under `[attachments]`.
Add `--attachments-dir` CLI global option.

**Task**: `completed/20260129-01-unify-attachments-config.md`

**Todos**:
- [x] Step 1: Remove `[fulltext]` config section
- [x] Step 2: Add `--attachments-dir` CLI global option
- [x] Step 3: Fix config command UI (show/set/init)
- [x] Step 4: Update specs and documentation

### Phase 29: Edit Validation Pipeline

Implement two-stage validation pipeline with error annotation and retry loop for the edit command.

**Task**: `20260127-03-edit-validation.md`

**Depends on**: PR #45 Follow-up Refactor (Step 2)

**Scope**:
- Edit-format date validator
- CSL schema validation integration
- Error annotation (YAML and JSON)
- Retry loop in `executeEdit`

**Todos**:
- [ ] Step 1: Edit-format date validator
- [ ] Step 2: CSL schema validation integration
- [ ] Step 3: Error annotation — YAML
- [ ] Step 4: Error annotation — JSON
- [ ] Step 5: Retry loop in `executeEdit`

### Phase 30: TUI Action Menu Enhancement

Expand the TUI search action menu with dynamic actions based on selection count,
new side-effect actions (Open fulltext, Manage attachments, Edit, Remove),
output format submenu, and config-driven default citation style.

**Task**: `20260129-03-tui-action-menu.md`

**Scope**:
- Dynamic action menu (single vs. multiple entry selection)
- New actions: Open fulltext, Manage attachments, Edit reference(s), Remove
- Output format submenu (IDs, CSL-JSON, BibTeX, YAML)
- Default citation style from `config.citation.defaultStyle`
- Side-effect action execution architecture

**Todos**:
- [ ] Step 1: Refactor ActionType and dynamic action choices
- [ ] Step 2: Add Output format submenu
- [ ] Step 3: Use default citation style from config
- [ ] Step 4: Side-effect action architecture
- [ ] Step 5: Implement Open fulltext action
- [ ] Step 6: Implement Manage attachments action
- [ ] Step 7: Implement Edit action
- [ ] Step 8: Implement Remove action

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

### Phase 31: Citation Enhancements

Post-MVP enhancements for citation functionality:

- Clipboard support (`--clipboard`)
- Clipboard auto-copy setting for output commands
- Pandoc cite key generation (`--cite-key`)
- Group by field (`--group-by <field>`)
- Batch citation generation from file

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
