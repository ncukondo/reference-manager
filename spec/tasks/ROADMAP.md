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
- **Phase 36**: Fulltext Preferred Type (configurable preferred type with 3-layer priority: config < env < CLI)
- **Phase 37**: TUI Indicator & Meta Line Improvements (text labels, formatSource, shared choice-builder, formatIdentifiers consolidation)
- **Phase 38**: CLI Help Enhancement (search help with query syntax, fields, case sensitivity, examples)
- **Phase 38**: Check Command (retraction/concern/version detection via Crossref & PubMed)
- **Phase 39**: Check Command — Metadata Comparison (title/author similarity, metadata drift detection, fix actions)
- **Phase 39**: Fulltext Get Multi-ID Support (variadic identifiers, JSON output format)
- **Phase 40**: Fulltext Fetch Failure Diagnostics (checkedSources, skipped, attempts, actionable hints)
- **Phase 41**: CslCustomSchema Type Refinement (typed `attachments`, `check`, `arxiv_id` fields, z.infer unification, cast removal)
- **Phase 42**: arXiv ID Import Support (detection, normalization, Atom API fetch, cache, rate limiter, importer, fulltext discovery, duplicate detection)

See [CHANGELOG.md](../../CHANGELOG.md) for details on implemented features.

---

## Active Tasks

### Fix: Server auto-start fails with bun-compiled binary (#81)

`startServerDaemon` constructs incorrect spawn arguments for bun-compiled binaries because `process.argv[1]` is the executable path (not a script path). Extract a shared `buildCliSpawnArgs` utility that detects the runtime and builds correct arguments.

- Task: `spec/tasks/completed/20260309-01-fix-server-autostart-bun-binary.md`
- Status: Done (PR #82)

### Phase 43: Fulltext Get --stdout Auto-Select Markdown (#77)

When `--stdout` is used without `--pdf`/`--markdown`, auto-select markdown content for output. If only PDF exists, report guidance on stderr.

- Task: `spec/tasks/completed/20260308-01-fulltext-get-stdout-auto-markdown.md`
- Status: Done (PR #78)

### Phase 44: Single-Binary Distribution (#79)

Provide single-binary distribution via `bun build --compile` and an installer script. Removes Node.js dependency, simplifies installation to `curl | bash`, and improves accessibility in PATH-restricted environments.

- Task: `spec/tasks/completed/20260308-02-single-binary-distribution.md`
- Status: Done (PR #80)

### Phase 45: PDF-to-Markdown Conversion

Extend `fulltext convert` to support PDF input using external CLI tools (marker, docling, mineru, pymupdf). Includes a pluggable custom converter system where users can register any CLI tool or script via configuration.

- Task: `spec/tasks/completed/20260317-01-pdf-to-markdown-convert.md`
- ADR: `spec/decisions/ADR-016-pdf-to-markdown-external-converters.md`
- Spec: `spec/features/fulltext-retrieval.md` (PDF Converter section)
- Status: Done (PR #83)

### Phase 46: Show Command (#84)

Add `ref show <id>` command for comprehensive single-reference detail view. Provides normalized, agent-friendly output with fulltext paths and attachment info — analogous to `git show` or `docker inspect`.

- Task: `spec/tasks/completed/20260317-02-show-command.md`
- Spec: `spec/features/show.md`
- Status: Done (PR #85)

### Phase 47: Install Skills Command & AI Agent Onboarding

Add `ref install --skills` command that installs Agent Skills (SKILL.md) for AI coding agents (Claude Code, Codex CLI, Gemini CLI, Cursor, etc.). Skills are placed in `$PWD/.agents/skills/ref/` (standard path) with a symlink/junction at `$PWD/.claude/skills/ref` for Claude Code. Also creates `llms-install.md` for agent-guided onboarding via raw GitHub URL.

- Task: `spec/tasks/completed/20260325-01-install-skills-command.md`
- Status: Done (PR #86)

### Phase 48: URL Import — Phase 1 (Core Pipeline)

Import web pages as references via `ref add <URL>`. Core pipeline: URL/PubMed URL detection, Playwright + system Chrome page fetching, basic metadata (title, URL, accessed, type: webpage), Readability + Turndown Markdown fulltext, MHTML/HTML archiving, `archive` attachment role, `--archive-format`/`--no-archive` options, config.

- Task: `spec/tasks/completed/20260330-01-url-import-phase1.md`
- Spec: `spec/features/url-import.md`
- Status: Done (PR #87)

### Phase 49: URL Import — Phase 2 (Metadata Extraction)

Enhance URL import with full metadata extraction: JSON-LD (Schema.org), citation_* meta tags, Dublin Core, Open Graph. Auto-infer CSL type from JSON-LD `@type` (Legislation, Report, Article, etc.).

- Task: `spec/tasks/20260330-02-url-import-phase2.md`
- Spec: `spec/features/url-import.md`
- Status: Done (PR #88)

### Fix: Server Mutation Persistence (#93)

Server mutations are not persisted to `library.json` — data lives only in memory until lost. POST `/api/references/` lacks `save()`, shutdown doesn't flush, `server stop` doesn't signal the process.

- Task: `spec/tasks/20260417-01-server-persistence-fix.md`
- Status: Pending

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
