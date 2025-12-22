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
| `add [input...]` | Add references (CSL-JSON, BibTeX, RIS, PMID, DOI) |
| `list` | List all references |
| `search <query>` | Search references |
| `remove <id>` | Remove a reference |
| `update <id>` | Update a reference |
| `cite <id>...` | Generate formatted citations |
| `fulltext <subcommand>` | Manage full-text files (attach/get/detach) |
| `server start\|stop\|status` | Manage HTTP server |

## Output Formats

Available for `list` and `search` commands (mutually exclusive):

- Default: Pretty-printed format
- `--json`: Compact JSON
- `--ids-only`: Citation keys only
- `--uuid`: Internal UUIDs only
- `--bibtex`: BibTeX format

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
```

## Server Integration

### Two Modes of Operation

1. **Direct file access**: When server not running
2. **Server-backed**: When server running (faster for large libraries)

### Automatic Detection

CLI automatically detects running server via portfile (`~/.reference-manager/server.port`):

- Server running and serving same library → Use server API
- Server not running and `auto_start = true` → Start server, use API
- Otherwise → Direct file access

### Behavior

- Users don't need to manage server manually
- Automatic fallback if server unavailable
- Write operations via server update in-memory index immediately

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
