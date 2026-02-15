# CLI Architecture

## Framework

- CLI framework: **Commander**

## Output & Logging

- Command results: `stdout`
- Logs and diagnostics: `stderr`
- Log levels: `silent`, `info` (default), `debug`

## Option Conventions

### Short Options

| Short | Long | Meaning | Commands |
|-------|------|---------|----------|
| `-i` | `--input` | Input format | `add` |
| `-o` | `--output` | Output format | all |
| `-f` | `--force` | Skip confirmation/duplicate check | `add`, `remove`, `fulltext` |
| `-t` | `--tui` | TUI (interactive) mode | `search` |
| `-n` | `--limit` | Result limit | `list`, `search` |

### Input Format (`--input` / `-i`)

Specifies how to interpret input data.

**Applies to:** `add`

| Value | Description |
|-------|-------------|
| `auto` | Auto-detect from extension/content (default) |
| `json` | CSL-JSON |
| `bibtex` | BibTeX |
| `ris` | RIS |
| `pmid` | PubMed ID |
| `doi` | Digital Object Identifier |
| `isbn` | ISBN |

### Output Format (`--output` / `-o`)

Specifies output format. Available values depend on command.

| Command | Values | Default |
|---------|--------|---------|
| `add`, `remove`, `update` | `json`, `text` | `text` |
| `list`, `search` | `pretty`, `json`, `bibtex`, `ids`, `uuid`, `pandoc-key`, `latex-key` | `pretty` |
| `export` | `json`, `yaml`, `bibtex` | `json` |
| `cite` | `text`, `html`, `rtf` | `text` |
| `config show` | `text`, `json` | `text` |

**Convenience flags for list/search:**

These are aliases for `--output`:

| Flag | Equivalent |
|------|------------|
| `--json` | `--output json` |
| `--bibtex` | `--output bibtex` |
| `--ids-only` | `--output ids` |
| `--key` | `--output <pandoc-key\|latex-key>` (uses `citation.default_key_format`) |
| `--uuid-only` | `--output uuid` |

### UUID Interpretation (`--uuid`)

When specified, interprets identifier arguments as UUIDs instead of citation keys.

**Applies to:** `remove`, `update`, `edit`, `cite`, `export`, `fulltext`

**Note:** For `list`/`search`, use `--output uuid` or `--uuid-only` to output UUIDs.

## Root Command Default Behavior

Running `ref` with no subcommand:
- **TTY**: Launches TUI search (same as `ref search -t`)
- **Non-TTY** (pipe, script): Shows help

This follows the same pattern as `ref attach` → `ref attach open`.

## Commands

| Command | Purpose |
|---------|---------|
| `ref` (no subcommand) | TUI search (TTY) / help (non-TTY) |
| `add [input...]` | Add references (CSL-JSON, BibTeX, RIS, PMID, DOI, ISBN) |
| `list` | List all references |
| `search [query]` | Search references |
| `search -t [query]` | TUI search mode |
| `export [ids...]` | Export raw CSL-JSON for external tools |
| `remove <id>` | Remove a reference |
| `update <id>` | Update a reference |
| `cite <id>...` | Generate formatted citations |
| `edit [ids...]` | Edit references in external editor |
| `url [ids...]` | Show/open reference URLs (DOI, PubMed, etc.) |
| `check [ids...]` | Check reference status (retraction, version changes) |
| `fulltext <subcommand>` | Manage full-text files (attach/get/detach/open) |
| `config <subcommand>` | Manage configuration (show/get/set/edit) |
| `server start\|stop\|status` | Manage HTTP server |
| `mcp` | Start MCP stdio server |
| `completion [action]` | Manage shell completion (install/uninstall) |

## Command Options

### add

```
ref add [input...] [options]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--input <format>` | `-i` | Input format: json\|bibtex\|ris\|pmid\|doi\|isbn\|auto |
| `--force` | `-f` | Skip duplicate detection |
| `--output <format>` | `-o` | Output format: json\|text (default: text) |
| `--full` | | Include full CSL-JSON data in JSON output |
| `--verbose` | | Show detailed error information |

### list

```
ref list [options]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--output <format>` | `-o` | Output format: pretty\|json\|bibtex\|ids\|uuid |
| `--json` | | Alias for `--output json` |
| `--bibtex` | | Alias for `--output bibtex` |
| `--ids-only` | | Alias for `--output ids` |
| `--uuid-only` | | Alias for `--output uuid` |
| `--sort <field>` | | Sort field (see Pagination) |
| `--order <order>` | | Sort order: asc\|desc |
| `--limit <n>` | `-n` | Maximum results |
| `--offset <n>` | | Skip count |

### search

```
ref search [query] [options]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--tui` | `-t` | Enable TUI (interactive) search mode |
| `--output <format>` | `-o` | Output format: pretty\|json\|bibtex\|ids\|uuid |
| `--json` | | Alias for `--output json` |
| `--bibtex` | | Alias for `--output bibtex` |
| `--ids-only` | | Alias for `--output ids` |
| `--uuid-only` | | Alias for `--output uuid` |
| `--sort <field>` | | Sort field (see Pagination) |
| `--order <order>` | | Sort order: asc\|desc |
| `--limit <n>` | `-n` | Maximum results |
| `--offset <n>` | | Skip count |

Query is required unless using `--tui`.

### export

```
ref export [ids...] [options]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--uuid` | | Interpret identifiers as UUIDs |
| `--all` | | Export all references |
| `--search <query>` | | Export references matching search query |
| `--output <format>` | `-o` | Output format: json\|yaml\|bibtex (default: json) |

**Selection modes** (mutually exclusive): `[ids...]`, `--all`, `--search`

**Output behavior:**
- Single ID request: Output as object (not array)
- Multiple items / `--all` / `--search`: Output as array
- Empty results: `[]` with exit code 0
- Not found (by ID): Error with exit code 1

### remove

```
ref remove [identifier] [options]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--uuid` | | Interpret identifier as UUID |
| `--force` | `-f` | Skip confirmation prompt |
| `--output <format>` | `-o` | Output format: json\|text (default: text) |
| `--full` | | Include full CSL-JSON data in JSON output |

Interactive selection if identifier omitted.

### update

```
ref update [identifier] [file] [options]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--uuid` | | Interpret identifier as UUID |
| `--set <field=value>` | | Set field value (repeatable) |
| `--output <format>` | `-o` | Output format: json\|text (default: text) |
| `--full` | | Include full CSL-JSON data in JSON output |

**--set Syntax:**

| Pattern | Description | Example |
|---------|-------------|---------|
| `field=value` | Set simple field | `--set "title=New Title"` |
| `field=` | Clear field | `--set "abstract="` |
| `field=a,b,c` | Replace array | `--set "custom.tags=a,b,c"` |
| `field+=value` | Add to array | `--set "custom.tags+=urgent"` |
| `field-=value` | Remove from array | `--set "custom.tags-=done"` |
| `author=Family, Given` | Set author | `--set "author=Smith, John"` |
| `author=A; B` | Multiple authors | `--set "author=Smith, John; Doe, Jane"` |
| `issued.raw=date` | Set date (raw) | `--set "issued.raw=2024-03-15"` |
| `id=key` | Change citation key | `--set "id=new-key"` |

**Settable Fields:**
- String: `title`, `abstract`, `type`, `DOI`, `PMID`, `PMCID`, `ISBN`, `ISSN`, `URL`, `publisher`, `publisher-place`, `page`, `volume`, `issue`, `container-title`, `note`, `id`
- Array (+=/−=): `custom.tags`, `custom.additional_urls`, `keyword`
- Name: `author`, `editor` (simple format only)
- Date: `issued.raw`, `accessed.raw`

**Not settable via --set:**
- `custom.uuid`, `custom.created_at`, `custom.timestamp`
- Complex date with `date-parts` (use JSON file)

**Note:** `--set` and `[file]` are mutually exclusive.

### edit

```
ref edit [identifier...] [options]
```

| Flag | Description |
|------|-------------|
| `--uuid` | Interpret identifiers as UUIDs |
| `--format <format>` | Edit format: yaml (default), json |
| `--editor <editor>` | Editor command (overrides $VISUAL/$EDITOR) |

**Note:** `--format` has no short option (to avoid conflict with `-f` for `--force`).

### cite

```
ref cite [id-or-uuid...] [options]
```

| Flag | Short | Description |
|------|-------|-------------|
| `--uuid` | | Treat arguments as UUIDs |
| `--style <style>` | | CSL style name |
| `--csl-file <path>` | | Path to custom CSL file |
| `--locale <locale>` | | Locale code (e.g., en-US, ja-JP) |
| `--output <format>` | `-o` | Output format: text\|html\|rtf |
| `--in-text` | | Generate in-text citations |

### url

```
ref url [ids...] [options]
```

| Flag | Description |
|------|-------------|
| `--uuid` | Interpret identifiers as UUIDs |
| `--default` | Output single best URL by priority (DOI > URL > PMID > PMCID > additional_urls) |
| `--doi` | Output DOI URL only |
| `--pubmed` | Output PubMed URL only |
| `--pmcid` | Output PMC URL only |
| `--open` | Open URL in browser (implies `--default` when used alone) |

**Output behavior:**
- Single ID, no filter: All URLs, one per line
- Multiple IDs, no filter: TSV format (id\turl)
- With type filter (`--default`, `--doi`, etc.): Plain URL, one per line
- Interactive selection if identifier omitted (TTY only)

### check

```
ref check [ids...] [options]
```

Multiple IDs accepted (same as `cite`, `export`).

| Flag | Short | Description |
|------|-------|-------------|
| `--all` | | Check all references |
| `--search <query>` | | Check references matching search query |
| `--uuid` | | Interpret identifiers as UUIDs |
| `--output <format>` | `-o` | Output format: text\|json (default: text) |
| `--full` | | Include full details in JSON output |
| `--no-save` | | Report only, do not save results |
| `--fix` | | Interactive repair (TTY only) |
| `--days <n>` | | Skip recently checked (default: 7) |

**Selection modes** (mutually exclusive): `[ids...]`, `--all`, `--search`

Interactive selection if identifier omitted (TTY only).

See `spec/features/check.md` for full specification.

### fulltext

```
ref fulltext <subcommand> [identifier] [options]
```

**Subcommands:** `attach`, `get`, `detach`, `open`

Common options:

| Flag | Short | Description |
|------|-------|-------------|
| `--uuid` | | Interpret identifier as UUID |
| `--pdf` | | Target PDF file |
| `--markdown` | | Target Markdown file |

Subcommand-specific options:

| Subcommand | Flag | Short | Description |
|------------|------|-------|-------------|
| `attach` | `--move` | | Move file instead of copy |
| `attach` | `--force` | `-f` | Overwrite existing |
| `detach` | `--delete` | | Delete file from disk |
| `detach` | `--force` | `-f` | Skip confirmation |
| `get` | `--stdout` | | Output content to stdout |

### config

```
ref config <subcommand> [options]
```

**Subcommands:**

| Subcommand | Description |
|------------|-------------|
| `show` | Display effective configuration |
| `get <key>` | Get a specific value |
| `set <key> <value>` | Set a value |
| `unset <key>` | Remove a value |
| `edit` | Open config in editor |
| `path` | Show config file paths |
| `keys` | List available config keys |

**config show options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--output <format>` | `-o` | Output format: text\|json |
| `--section <name>` | | Show specific section |
| `--sources` | | Include source information |

**config set/unset options:**

| Flag | Description |
|------|-------------|
| `--local` | Write to current directory config |
| `--user` | Write to user config |

### server

```
ref server <subcommand> [options]
```

| Subcommand | Description |
|------------|-------------|
| `start` | Start HTTP server |
| `stop` | Stop running server |
| `status` | Check server status |

**server start options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--port <port>` | | Specify port number |
| `--daemon` | `-d` | Run in background |

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
5. User config: Platform-specific location (see below)
6. Built-in defaults

### Default Paths

Paths follow platform conventions using XDG Base Directory Specification on Linux:

| Purpose | Linux | macOS | Windows |
|---------|-------|-------|---------|
| Config | `~/.config/reference-manager/` | `~/Library/Preferences/reference-manager/` | `%APPDATA%\reference-manager\Config\` |
| Data | `~/.local/share/reference-manager/` | `~/Library/Application Support/reference-manager/` | `%LOCALAPPDATA%\reference-manager\Data\` |
| Cache | `~/.cache/reference-manager/` | `~/Library/Caches/reference-manager/` | `%LOCALAPPDATA%\reference-manager\Cache\` |

| File | Default Location |
|------|------------------|
| User config | `{config}/config.toml` |
| Library | `{data}/library.json` |
| CSL styles | `{data}/csl/` |
| Attachments | `{data}/attachments/` |
| Backups | `{cache}/backups/` |

### Core Settings

```toml
# library defaults to {data}/library.json
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
default_key_format = "pandoc"  # "pandoc" | "latex"

# attachments.directory defaults to {data}/attachments
[cli]
default_limit = 0          # 0 = unlimited
default_sort = "updated"
default_order = "desc"

[cli.tui]
limit = 20                 # Max results in TUI mode
debounce_ms = 200          # Search debounce delay
clipboard_auto_copy = false # Auto-copy TUI output to clipboard
```

### Managing Configuration

Use the `config` command to view and modify settings without editing files directly.

See `spec/features/config-command.md` for complete specification.

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
--backup-dir <path>   Override backup directory
--attachments-dir <path>  Override attachments directory
--clipboard           Copy output to system clipboard
--no-clipboard        Disable clipboard copy
--help / -h           Display help
--version / -V        Display version
```

## Interactive Features

- TTY detection for interactive prompts
- `remove` command shows confirmation unless `--force`
- Non-TTY: Prompts skipped, uses default behavior

### TUI Search

`ref search -t` provides an interactive search mode with:
- Real-time incremental search with debounce
- Multiple selection support
- Action menu for selected references

**Requires TTY**: Exits with error in non-TTY environment.

See `spec/features/interactive-search.md` for complete specification.
