# CLI Architecture

## Framework

- CLI framework: **Commander**

## Output & Logging

- Command results: `stdout`
- Logs and diagnostics: `stderr`
- Log levels: `silent`, `info` (default), `debug`

## Commands

| Command | Purpose |
|---------|---------|
| `add [input...]` | Add references (CSL-JSON, BibTeX, RIS, PMID, DOI, ISBN) |
| `list` | List all references |
| `search <query>` | Search references |
| `search -i [query]` | Interactive search mode |
| `remove <id>` | Remove a reference |
| `update <id>` | Update a reference |
| `cite <id>...` | Generate formatted citations |
| `fulltext <subcommand>` | Manage full-text files (attach/get/detach) |
| `server start\|stop\|status` | Manage HTTP server |
| `mcp` | Start MCP stdio server |
| `completion [action]` | Manage shell completion (install/uninstall) |

## Output Formats

Available for `list` and `search` commands:

| Flag | Description |
|------|-------------|
| (default) | Pretty-printed format |
| `--json` | Compact JSON (includes pagination metadata) |
| `--ids-only` | Citation keys only |
| `--uuid` | Internal UUIDs only |
| `--bibtex` | BibTeX format |

## Pagination and Sorting

Available for `list` and `search` commands.

See `spec/features/pagination.md` for complete specification.

| Flag | Short | Description |
|------|-------|-------------|
| `--sort <field>` | | Sort field: `created`, `updated`, `published`, `author`, `title`, `relevance` (search only) |
| `--order <order>` | | Sort order: `asc`, `desc` |
| `--limit <n>` | `-n` | Maximum results (0 = unlimited) |
| `--offset <n>` | | Skip count (default: 0) |

**Defaults:**
- Sort: `updated` (descending)
- Limit: unlimited

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error (validation, not found, duplicate) |
| `2` | Conflict (merge conflict, user cancelled) |
| `3` | Parse error (invalid JSON) |
| `4` | I/O error |

## Configuration

### File Format

- Format: TOML
- Extension: `.toml`

### Resolution Order (highest to lowest)

1. CLI arguments
2. Environment variables
3. Current directory: `.reference-manager.config.toml`
4. `$REFERENCE_MANAGER_CONFIG`
5. User config: `~/.reference-manager/config.toml`
6. Built-in defaults

### Core Settings

```toml
library = "~/.reference-manager/csl.library.json"
log_level = "info"

[backup]
max_generations = 50
max_age_days = 365

[server]
auto_start = false
auto_stop_minutes = 0

[pubmed]
email = ""
api_key = ""

[citation]
default_style = "apa"
default_locale = "en-US"
default_format = "text"

[fulltext]
directory = "~/.reference-manager/fulltext"

[cli]
default_limit = 0          # 0 = unlimited
default_sort = "updated"
default_order = "desc"

[cli.interactive]
limit = 20                 # Max results in interactive mode
debounce_ms = 200          # Search debounce delay
```

## Server Integration

### Two Modes of Operation

1. **Local mode**: Direct file access (via `OperationsLibrary`)
2. **Server mode**: HTTP API access (via `ServerClient`, faster for large libraries)

### Automatic Detection

CLI automatically detects running server via portfile:
- Server running → Use server API
- Server not running + `auto_start = true` → Start server
- Otherwise → Direct file access

### ILibraryOperations Pattern

CLI commands use unified `ILibraryOperations` interface, eliminating mode-specific branching.

See: `spec/decisions/ADR-009-ilibrary-operations-pattern.md`

## Global Options

```
--library <path>      Override library file path
--log-level <level>   Override log level
--config <path>       Use specific config file
--quiet / -q          Suppress non-error output
--verbose / -v        Enable verbose output
--no-backup           Disable backup for this operation
--help / -h           Display help
--version / -V        Display version
```

## Interactive Features

- TTY detection for interactive prompts
- `remove` command shows confirmation unless `--force`
- Non-TTY: Prompts skipped, uses default behavior

### Interactive Search

`ref search -i` provides an interactive search mode with:
- Real-time incremental search with debounce
- Multiple selection support
- Action menu for selected references

**Requires TTY**: Exits with error in non-TTY environment.

See `spec/features/interactive-search.md` for complete specification.
