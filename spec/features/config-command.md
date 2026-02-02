# Config Command

Manage configuration settings via CLI.

## Purpose

Enable users to view and modify configuration without manually editing TOML files:
- View effective configuration (merged from all sources)
- Get/set individual configuration values
- Understand configuration sources and overrides
- Initialize configuration files with templates

## Command Interface

```bash
ref config <subcommand> [options]
```

### Subcommands

| Subcommand | Description |
|------------|-------------|
| `show` | Display effective configuration |
| `get <key>` | Get a specific configuration value |
| `set <key> <value>` | Set a configuration value |
| `unset <key>` | Remove a configuration value (revert to default) |
| `keys` | List all available configuration keys |
| `path` | Show configuration file paths |
| `edit` | Open configuration file in editor |

## Subcommand Details

### `ref config show`

Display the effective (merged) configuration.

**Options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--output <format>` | `-o` | Output format: text (default), json |
| `--section <name>` | | Show only a specific section |
| `--sources` | | Include source information for each value |

**Examples:**

```bash
# Show all configuration (TOML format)
ref config show

# Show in JSON format
ref config show -o json

# Show only citation section
ref config show --section citation

# Show with source information
ref config show --sources
```

**Output with `--sources`:**

```toml
# Effective configuration
# Source priority: CLI > current dir > env > user > default

library = "~/env-library.json"  # env: REFERENCE_MANAGER_LIBRARY
log_level = "debug"  # ~/.config/reference-manager/config.toml

[citation]
default_style = "chicago-author-date"  # ./.reference-manager.config.toml
default_locale = "en-US"  # default
```

When a value is overridden by an environment variable:
```
key = "value"  # env: VAR_NAME (overrides config)
```

### `ref config get <key>`

Get a specific configuration value.

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<key>` | Configuration key in dot notation |

**Options:**

| Flag | Description |
|------|-------------|
| `--config-only` | Return only the config file value (ignore env vars) |

**Behavior:**
- Returns the effective value (environment variables take precedence)
- Exit code 0: Value found and printed
- Exit code 1: Key not found or value not set

**Examples:**

```bash
# Get effective value
ref config get citation.default_style
# → apa

# Get nested value
ref config get cli.tui.limit
# → 20

# Get config file value only (ignoring env override)
ref config get library --config-only

# Check if value exists
ref config get pubmed.api_key || echo "not set"
```

### `ref config set <key> <value>`

Set a configuration value in a configuration file.

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<key>` | Configuration key in dot notation |
| `<value>` | New value to set |

**Options:**

| Flag | Description |
|------|-------------|
| `--local` | Write to current directory config (create if not exists) |
| `--user` | Write to user config (ignore local config even if exists) |

**Behavior:**
- Validates value against schema before writing
- Creates config file if it doesn't exist
- Warns if environment variable overrides the value
- Write target selection (without flags):
  1. If `.reference-manager.config.toml` exists in current directory → write there
  2. Otherwise → write to user config

**Examples:**

```bash
# Set value (writes to local config if exists, otherwise user config)
ref config set citation.default_style chicago-author-date

# Explicitly write to local (project) config (creates if not exists)
ref config set --local citation.default_style ieee

# Explicitly write to user config (even if local config exists)
ref config set --user citation.default_style apa

# Set numeric value
ref config set cli.default_limit 50

# Set boolean value
ref config set server.auto_start true

# Set array value (comma-separated)
ref config set citation.csl_directory "/path/one,/path/two"
```

**Environment Variable Warning:**

When setting a value that is overridden by an environment variable:

```
Warning: 'library' is overridden by environment variable REFERENCE_MANAGER_LIBRARY
  Environment value: ~/env-library.json
  Config file value: ~/config-library.json (saved but inactive)

The environment variable takes precedence. To use the config file value,
unset the environment variable: unset REFERENCE_MANAGER_LIBRARY
```

### `ref config unset <key>`

Remove a configuration value, reverting to default.

**Arguments:**

| Argument | Description |
|----------|-------------|
| `<key>` | Configuration key to remove |

**Options:**

| Flag | Description |
|------|-------------|
| `--local` | Remove from current directory config |
| `--user` | Remove from user config (ignore local config even if exists) |

**Behavior:**
- Write target selection follows same rules as `set` command
- No error if key doesn't exist in file

**Examples:**

```bash
# Remove value (from local config if exists, otherwise user config)
ref config unset citation.default_style

# Explicitly remove from local config
ref config unset --local cli.default_limit

# Explicitly remove from user config (even if local config exists)
ref config unset --user citation.default_style
```

### `ref config keys`

List all available configuration keys with their types and descriptions.

**Options:**

| Flag | Description |
|------|-------------|
| `--section <name>` | List keys only in a specific section |

**Output:**

```
library                      string    Path to library file
log_level                    enum      Log level (silent, info, debug)

backup.max_generations       integer   Maximum backup generations
backup.max_age_days          integer   Maximum backup age in days
backup.directory             string    Backup directory path

server.auto_start            boolean   Auto-start server on CLI commands
server.auto_stop_minutes     integer   Auto-stop server after idle minutes (0 = never)

citation.default_style       string    Default citation style
citation.csl_directory       string[]  CSL style file directories
citation.default_locale      string    Default locale for citations
citation.default_format      enum      Default format (text, html, rtf)

pubmed.email                 string    Email for PubMed API
pubmed.api_key               string    API key for PubMed

attachments.directory        string    Attachments storage directory

cli.default_limit            integer   Default result limit (0 = unlimited)
cli.default_sort             enum      Default sort field
cli.default_order            enum      Default sort order (asc, desc)
cli.tui.limit                integer   Result limit in TUI mode
cli.tui.debounce_ms          integer   Search debounce delay (ms)
cli.tui.clipboard_auto_copy  boolean   Auto-copy TUI output to clipboard
cli.edit.default_format      enum      Default edit format (yaml, json)

mcp.default_limit            integer   Default result limit for MCP
```

### `ref config path`

Show configuration file paths and their status.

**Options:**

| Flag | Description |
|------|-------------|
| `--user` | Show only user config path |
| `--local` | Show only local config path |

**Output:**

```
User:    ~/.config/reference-manager/config.toml (exists)
Local:   ./.reference-manager.config.toml (not found)
Env:     /custom/path/config.toml (REFERENCE_MANAGER_CONFIG)
```

### `ref config edit`

Open a configuration file in the default editor.

**Options:**

| Flag | Description |
|------|-------------|
| `--local` | Edit current directory config (default: user config) |

**Behavior:**
- If file doesn't exist, creates it with a commented template
- Uses `$VISUAL`, `$EDITOR`, or platform fallback (same as `ref edit`)

**Template (created for new files):**

```toml
# Reference Manager Configuration
# Documentation: https://github.com/username/reference-manager#configuration

# library = "~/.local/share/reference-manager/library.json"
# log_level = "info"  # silent, info, debug

[backup]
# max_generations = 50
# max_age_days = 365
# directory = "~/.cache/reference-manager/backups"

[server]
# auto_start = false
# auto_stop_minutes = 0

[citation]
# default_style = "apa"
# default_locale = "en-US"
# default_format = "text"  # text, html, rtf
# csl_directory = ["~/.local/share/reference-manager/csl"]

[pubmed]
# email = ""
# api_key = ""

[attachments]
# directory = "~/.local/share/reference-manager/attachments"

[cli]
# default_limit = 0  # 0 = unlimited
# default_sort = "updated"
# default_order = "desc"

[cli.tui]
# limit = 20
# debounce_ms = 200

[cli.edit]
# default_format = "yaml"  # yaml, json

[mcp]
# default_limit = 20
```

## Configuration Keys

### Settable Keys

All configuration keys can be read and written via `config get/set`:

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `library` | string | `{data}/library.json` | Library file path |
| `log_level` | enum | `info` | Log level: `silent`, `info`, `debug` |
| `backup.max_generations` | integer | `50` | Max backup files to keep |
| `backup.max_age_days` | integer | `365` | Max backup age |
| `backup.directory` | string | `{cache}/backups` | Backup directory |
| `server.auto_start` | boolean | `false` | Auto-start server |
| `server.auto_stop_minutes` | integer | `0` | Auto-stop delay (0 = never) |
| `citation.default_style` | string | `apa` | Default CSL style |
| `citation.csl_directory` | string[] | `[{data}/csl]` | CSL directories |
| `citation.default_locale` | string | `en-US` | Default locale |
| `citation.default_format` | enum | `text` | Format: `text`, `html`, `rtf` |
| `pubmed.email` | string | (none) | PubMed API email |
| `pubmed.api_key` | string | (none) | PubMed API key |
| `attachments.directory` | string | `{data}/attachments` | Attachments storage |
| `cli.default_limit` | integer | `0` | Default result limit |
| `cli.default_sort` | enum | `updated` | Sort: `created`, `updated`, `published`, `author`, `title` |
| `cli.default_order` | enum | `desc` | Order: `asc`, `desc` |
| `cli.tui.limit` | integer | `20` | TUI mode limit |
| `cli.tui.debounce_ms` | integer | `200` | Search debounce |
| `cli.tui.clipboard_auto_copy` | boolean | `false` | Auto-copy TUI output to clipboard |
| `cli.edit.default_format` | enum | `yaml` | Edit format: `yaml`, `json` |
| `mcp.default_limit` | integer | `20` | MCP result limit |

**Path placeholders:**
- `{data}`: Platform-specific data directory
- `{cache}`: Platform-specific cache directory
- `{config}`: Platform-specific config directory

### Environment Variable Overrides

The following environment variables override config file values:

| Environment Variable | Config Key |
|---------------------|------------|
| `REFERENCE_MANAGER_LIBRARY` | `library` |
| `REFERENCE_MANAGER_ATTACHMENTS_DIR` | `attachments.directory` |
| `REFERENCE_MANAGER_CLI_DEFAULT_LIMIT` | `cli.default_limit` |
| `REFERENCE_MANAGER_MCP_DEFAULT_LIMIT` | `mcp.default_limit` |
| `PUBMED_EMAIL` | `pubmed.email` |
| `PUBMED_API_KEY` | `pubmed.api_key` |

When these are set, `config get` returns the environment value, and `config set` warns the user.

## Validation

All values are validated using Zod schemas before writing:

```bash
# Type error
$ ref config set cli.default_limit "abc"
Error: Invalid value for 'cli.default_limit': Expected number, received string

# Range error
$ ref config set cli.default_limit -1
Error: Invalid value for 'cli.default_limit': Number must be greater than or equal to 0

# Enum error
$ ref config set log_level verbose
Error: Invalid value for 'log_level': Expected 'silent' | 'info' | 'debug', received 'verbose'

# Empty string error (for required strings)
$ ref config set backup.directory ""
Error: Invalid value for 'backup.directory': String must contain at least 1 character(s)
```

## Error Handling

| Condition | Behavior |
|-----------|----------|
| Invalid key | Error: "Unknown configuration key: <key>" |
| Invalid value type | Error with Zod validation message |
| Invalid value range | Error with Zod validation message |
| File write error | Error: "Failed to write config: <reason>" |
| File parse error | Error: "Failed to parse config file: <reason>" |
| Key not found (get) | Exit code 1, no output |
| Env override (set) | Warning message, still saves to file |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (invalid key, validation failure, file error) |

## Examples

```bash
# View current configuration
ref config show

# Check a specific setting
ref config get citation.default_style

# Change citation style globally
ref config set citation.default_style chicago-author-date

# Set project-specific style
ref config set --local citation.default_style ieee

# Configure PubMed API access
ref config set pubmed.email "user@example.com"
ref config set pubmed.api_key "your-api-key"

# Increase TUI search results
ref config set cli.tui.limit 50

# Reset to default
ref config unset cli.tui.limit

# Open config in editor
ref config edit

# See where config files are located
ref config path
```

## Related

- `spec/architecture/cli.md` - CLI commands and configuration resolution
- `spec/guidelines/validation.md` - Zod schema validation
