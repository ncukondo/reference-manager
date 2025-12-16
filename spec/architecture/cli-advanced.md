# CLI Advanced Specifications

## 9. Exit Codes - Complete Definition

### Exit Code Table

| Code | Category | Usage |
|------|----------|-------|
| `0` | Success | All operations completed successfully |
| `1` | General error | Command failed, validation error, not found, duplicate detected (without --force) |
| `2` | Conflict | Merge conflict (unresolved), user cancelled operation |
| `3` | Parse error | Invalid JSON, malformed input data |
| `4` | I/O error | File read/write failure, permission denied |

### Per-Command Exit Code Usage

#### `add` Command
- `0`: Reference(s) added successfully (including ID collision handling)
- `1`: Duplicate detected (without `--force`), validation error, or general error
- `3`: Invalid JSON input
- `4`: Cannot read input file or write to library

#### `search` Command
- `0`: Search completed (even if no results found)
- `4`: Cannot read library file

#### `list` Command
- `0`: List completed
- `4`: Cannot read library file

#### `remove` Command
- `0`: Reference removed successfully
- `1`: Reference not found
- `2`: User cancelled (answered 'N' to confirmation prompt)
- `4`: Cannot write to library

#### `update` Command
- `0`: Reference updated successfully
- `1`: Reference not found or validation error
- `3`: Invalid JSON input
- `4`: Cannot read input file or write to library

#### `server start` Command
- `0`: Server started successfully (daemon) or stopped by user (foreground)
- `1`: Server already running, port conflict, or invalid options
- `4`: Cannot write portfile or read library

#### `server stop` Command
- `0`: Server stopped successfully
- `1`: Server not running (no portfile or process not found)

#### `server status` Command
- `0`: Server is running
- `1`: Server not running

### Error Message Format

All error messages are written to **stderr** and follow this format:

```
Error: <error-type>: <error-message>
<additional-details>
```

Examples:
```
Error: Duplicate detected: DOI match
Existing reference: [Smith-2020] Machine Learning Basics
DOI: 10.1234/example
Use --force to add anyway.
```

```
Error: Parse error: Invalid JSON
Line 15: Unexpected token '}' in JSON at position 234
```

```
Error: I/O error: Permission denied
Cannot write to library file: /path/to/library.json
Check file permissions.
```

### Success Message Format

Success messages are written to **stderr** (for logging), while command output goes to **stdout**.

Examples:
```stderr
Added reference: [Smith-2020] Machine Learning Basics
```

```stderr
Updated reference: [Smith-2020]
```

```stderr
Removed reference: [Smith-2020]
```

---

## 10. Global Options - Complete Definition

### Configuration Override Options

These options override configuration file values:

```bash
--library <path>          # Override library file path
--log-level <level>       # Override log level (silent|info|debug)
--config <path>           # Use specific config file (skips auto-detection)
```

### Backup Configuration Overrides

```bash
--backup-dir <path>       # Override backup directory
--no-backup               # Disable backup creation for this operation
```

**Default behavior:**
- Backups are created before write operations (`add`, `remove`, `update`)
- Backup location: `$TMPDIR/reference-manager/backups/<library-name>/`

**Use cases:**
- `--no-backup`: For bulk operations or when backups are not needed
- `--backup-dir`: For custom backup location (e.g., for testing)

### Output Control Options

```bash
--quiet / -q              # Suppress all non-error output
--verbose / -v            # Enable verbose output (implies --log-level=debug)
--no-color                # Disable color output (future feature)
```

**Behavior:**
- `--quiet`: Only errors go to stderr, command output still goes to stdout
- `--verbose`: Detailed operation logs to stderr
- `--no-color`: Affects pretty output and error messages (future)

### Standard Options

```bash
--help / -h               # Display help (provided by commander)
--version / -V            # Display version (provided by commander)
```

**Note:** Commander uses `-V` (capital) for version to avoid conflict with `-v` (verbose).

### Watch Configuration Overrides

```bash
--watch                   # Enable file watching for this command
--no-watch                # Disable file watching for this command
```

**Default behavior:** See section 11 (File Watching)

### Option Priority

Configuration resolution order (highest to lowest):

1. CLI arguments (`--library`, `--log-level`, etc.)
2. Environment variables (`REFERENCE_MANAGER_CONFIG`, `REFERENCE_MANAGER_LIBRARY`)
3. Current directory config (`.reference-manager.config.toml`)
4. Environment variable config path (`$REFERENCE_MANAGER_CONFIG`)
5. User config (`~/.reference-manager/config.toml`)
6. Built-in defaults

### Examples

```bash
# Use specific library and config
reference-manager --library /custom/path.json --config /custom/config.toml list

# Quiet mode with verbose logging
reference-manager --quiet --log-level=debug search "Smith"

# Disable backup for bulk operation
reference-manager --no-backup add bulk-data.json

# Override backup directory
reference-manager --backup-dir /tmp/my-backups update Smith-2020 update.json
```

---

## 11. File Watching - CLI Behavior

### Server Mode Purpose

The HTTP server's primary purpose is **performance optimization for large CSL files**:

- **Problem**: Loading large CSL files on every command execution causes slow response times
- **Solution**: Server keeps library in memory for fast access
- **File watching**: Ensures in-memory library stays synchronized with external changes

File watching detects **external changes** to the library file:

- **User direct edits**: Manual editing with text editor
- **Cloud sync**: OneDrive, Dropbox, Google Drive updates
- **External tools**: Zotero, scripts, other applications

**Critical requirement**: Must **not** reload after the application's own writes (self-write detection required).

### Behavior by Command

| Command | File Watching | Rationale |
|---------|---------------|-----------|
| `search` | **Disabled** | One-time query, exits immediately |
| `list` | **Disabled** | One-time listing, exits immediately |
| `add` | **Disabled** | Write and exit, no need to monitor |
| `remove` | **Disabled** | Write and exit, no need to monitor |
| `update` | **Disabled** | Write and exit, no need to monitor |
| `server start` | **Enabled** | Long-running process, must respond to external changes |

**Summary**: File watching is **only used in server mode**. CLI commands load library once, execute, and exit.

### Server Mode - File Watching

When `server start` is executed, file watching is **always enabled** by default:

#### Behavior

1. **Monitor library file** for changes (using `chokidar`)
2. **Detect external changes**:
   - Calculate file hash on change event
   - Compare with stored hash (from last load/write)
   - If hash differs → External change → Reload
   - If hash matches → Self-write → Skip reload (log debug message)
3. **Reload library** into memory
4. **Continue serving** requests with old index during reload

#### Self-Write Detection

**Problem**: Without self-write detection, the server would reload after its own write operations, causing:
- Unnecessary reloading
- Potential infinite loops
- Performance degradation

**Solution**: Hash-based detection (see `spec/features/file-monitoring.md` for detailed implementation)

**Mechanism**:
- Store file hash after load/write operations
- Compare with new file hash on change events
- Only reload if hashes differ (indicating external change)

#### Configuration

Watch settings from config file are respected:

```toml
[watch]
debounce_ms = 500          # Debounce time for file changes
poll_interval_ms = 5000    # Polling interval (fallback)
retry_interval_ms = 200    # JSON parse retry interval
max_retries = 10           # Max parse retries
```

**Disable watching** (not recommended):

```bash
reference-manager server start --no-watch
```

**Why not recommended**: Server will not respond to external library changes (user edits, cloud sync).

### Environment Variable

```bash
REFERENCE_MANAGER_WATCH=false  # Force disable watching (server mode only)
```

**Note**: No `true` option needed, as server mode enables watching by default.

**Priority:** CLI flags (`--no-watch`) > Environment variable > Default (enabled for server)

### CLI Commands (Non-Server)

File watching is **not available** for CLI commands:

- No `--watch` flag
- Commands execute once and exit
- Library loaded at start, used, then discarded

**Rationale**:
- CLI commands are designed for one-time operations
- Large file performance is handled by server mode
- Keeps CLI behavior simple and predictable

---

## 12. Interactive Features

### TTY Detection

Interactive prompts are **only displayed when running in a TTY** (terminal):

```typescript
import { stdin, stdout } from "node:process";

const isTTY = stdin.isTTY && stdout.isTTY;
```

**Behavior:**
- **TTY detected** (user running in terminal): Show prompts, wait for input
- **No TTY** (piped input/output): Skip prompts, use default behavior

### Interactive Prompts

#### `remove` Command - Confirmation Prompt

**When shown:**
- Command: `reference-manager remove <id>`
- TTY: Yes
- `--force` flag: Not provided

**Prompt format:**
```
Remove reference [Smith-2020-machine]?
Title: Machine Learning for Everyone
Authors: Smith, J.; Doe, A.
Continue? (y/N):
```

**User input:**
- `y` / `Y` / `yes` / `Yes`: Proceed with removal
- `n` / `N` / `no` / `No` / Enter: Cancel (exit code 2)
- Ctrl+C: Interrupt (exit code 130, standard for SIGINT)

**When skipped:**
- No TTY: Auto-proceed (equivalent to `--force`)
- `--force` flag: Auto-proceed

#### Future Interactive Features

**`add` Command - Interactive Input (Not Implemented)**

Potential future feature for interactive reference entry:

```bash
reference-manager add --interactive
# Prompts for each field:
# Type (article/book/...): article
# Title: Machine Learning Basics
# Authors (comma-separated): Smith, J.; Doe, A.
# Year: 2020
# DOI (optional): 10.1234/example
# ...
```

**`update` Command - Interactive Editor (Not Implemented)**

Potential future feature for opening editor:

```bash
reference-manager update Smith-2020 --edit
# Opens $EDITOR with current JSON
# User modifies and saves
# Validation on exit
```

### Non-Interactive Mode

Force non-interactive behavior even in TTY:

```bash
--force / -f              # Skip all prompts, use defaults
--yes / -y                # Auto-confirm all prompts (future)
--no-interactive          # Disable all interactive features (future)
```

**Use cases:**
- Scripts and automation
- CI/CD pipelines
- Batch operations

### Input Validation

For prompts that accept text input (future features):

- **Required fields:** Re-prompt until valid input received
- **Optional fields:** Allow empty input (press Enter to skip)
- **Validation errors:** Display error message, re-prompt
- **Ctrl+C:** Cancel operation immediately (exit code 130)

### Progress Indicators (Future Feature)

For long-running operations:

```bash
# Spinner for network operations (fetching metadata)
Fetching metadata from DOI... ⠋

# Progress bar for bulk operations
Adding references: [========>         ] 45% (23/50)
```

**Initial implementation:** No progress indicators. Simple status messages only.

---

## 13. Additional Considerations

### Signal Handling

#### SIGINT (Ctrl+C)
- Gracefully cancel current operation
- Clean up temporary files
- Exit with code 130 (standard for SIGINT)

#### SIGTERM
- Server mode: Stop server gracefully
  - Finish current requests
  - Remove portfile
  - Exit with code 0
- CLI mode: Same as SIGINT

#### Example Implementation
```typescript
process.on("SIGINT", async () => {
  logger.info("Received SIGINT, shutting down...");
  await cleanup();
  process.exit(130);
});

process.on("SIGTERM", async () => {
  logger.info("Received SIGTERM, shutting down...");
  await cleanup();
  process.exit(0);
});
```

### Piping and Redirection

#### Stdin Detection

```typescript
import { stdin } from "node:process";

// Check if stdin has data
const hasStdinData = !stdin.isTTY;
```

**Behavior:**
- `cat data.json | reference-manager add`: Read from stdin
- `reference-manager add`: Expect file argument or error

#### Stdout vs Stderr Usage

**Stdout:** Command output (results)
- Search results (JSON, pretty, BibTeX)
- List output
- IDs only output
- Server status information

**Stderr:** Logs and diagnostics
- Info messages ("Added reference...")
- Error messages
- Debug output
- Progress indicators (future)

**Rationale:** Allows piping command output without pollution from log messages.

**Example:**
```bash
# Pipe search results to jq
reference-manager search "Smith" --json | jq '.[] | .title'

# Stderr messages don't interfere
# (e.g., "Searching library..." goes to stderr)
```

### Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `REFERENCE_MANAGER_LIBRARY` | Override library path | `/path/to/library.json` |
| `REFERENCE_MANAGER_CONFIG` | Config file path | `/path/to/config.toml` |
| `REFERENCE_MANAGER_LOG_LEVEL` | Log level | `debug`, `info`, `silent` |
| `REFERENCE_MANAGER_WATCH` | Enable/disable watching | `true`, `false` |
| `NO_COLOR` | Disable color output (standard) | `1` |
| `EDITOR` | Editor for interactive mode (future) | `vim`, `nano`, `code` |

### Platform-Specific Behavior

#### Windows
- Path separators: Accept both `\` and `/`
- Line endings: Handle both CRLF and LF in input JSON
- Signals: SIGTERM may not work, use SIGINT

#### macOS / Linux
- Standard POSIX behavior
- Respect `~` expansion in paths
- Support XDG Base Directory spec (future)

---

## Summary of Recommendations

### Implemented in Phase 4.2

1. **Exit codes:** Complete table with per-command definitions
2. **Global options:** `--library`, `--log-level`, `--config`, `--quiet`, `--verbose`, `--no-backup`, `--backup-dir`
3. **File watching:** Server mode only, `--watch` / `--no-watch` flags for override
4. **Interactive prompts:** `remove` confirmation with TTY detection

### Future Enhancements (Post Phase 4.2)

1. **Interactive input:** `add --interactive`, `update --edit`
2. **Watch mode for CLI:** `search --watch`, `list --watch`
3. **Progress indicators:** Spinners, progress bars
4. **Color output:** `--no-color` flag, respect `NO_COLOR` env var
5. **Auto-confirm flag:** `--yes` / `-y`