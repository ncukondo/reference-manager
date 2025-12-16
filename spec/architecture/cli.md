# CLI Architecture

## CLI Framework

- `commander`

## Output & Logging

- Command results: `stdout`
- Logs and diagnostics: `stderr`
- Log levels:
  - `silent`
  - `info` (default)
  - `debug`

## Configuration File Format

- **Format**: TOML
- **Extension**: `.toml`

## Configuration Resolution Order

Configuration file is resolved in the following order (highest to lowest priority):

1. Current directory:
   ```
   .reference-manager.config.toml
   ```
2. Path specified by environment variable:
   ```
   REFERENCE_MANAGER_CONFIG
   ```
3. User config:
   ```
   ~/.reference-manager/config.toml
   ```

Rules:
- CLI arguments override config values
- Library is specified as a **CSL-JSON file path** (not a directory)
- Default library path: `~/.reference-manager/csl.library.json`

## Configuration Fields

### Core Settings

```toml
# Path to CSL-JSON library file (required in config file)
library = "~/.reference-manager/csl.library.json"

# Log level: "silent", "info", "debug" (default: "info")
log_level = "info"
```

### Backup Settings

```toml
[backup]
# Maximum number of backup generations (default: 50)
max_generations = 50

# Maximum age of backups in days (default: 365)
max_age_days = 365

# Backup directory (default: $TMPDIR/reference-manager/backups/)
directory = "$TMPDIR/reference-manager/backups/"
```

### File Watching Settings

```toml
[watch]
# Enable file watching (default: true)
enabled = true

# Debounce time in milliseconds (default: 500)
debounce_ms = 500

# Polling interval in milliseconds (default: 5000)
poll_interval_ms = 5000

# Retry interval in milliseconds (default: 200)
retry_interval_ms = 200

# Maximum number of retries (default: 10)
max_retries = 10
```

### Server Auto-Start Settings

```toml
[server]
# Auto-start server when not running (default: false)
auto_start = false

# Auto-stop server after idle time in minutes (default: 0 = disabled)
# If > 0, server stops automatically after N minutes of no requests
auto_stop_minutes = 0
```

**Behavior:**

- `auto_start = false` (default):
  - CLI uses direct file access if server not running
  - User must manually start server with `reference-manager server start`

- `auto_start = true`:
  - CLI automatically starts server on first command if not running
  - Server runs in daemon mode (background)
  - Subsequent commands use the running server
  - Optimal for large libraries (automatic performance optimization)

- `auto_stop_minutes = 0` (default):
  - Server runs until manually stopped
  - Recommended if server is frequently used

- `auto_stop_minutes = N` (N > 0):
  - Server stops automatically after N minutes of inactivity
  - Saves resources if server used infrequently
  - Next command will auto-start again (if `auto_start = true`)

### Future Extension

```toml
# Fulltext directory (future feature, not yet implemented)
# fulltext_directory = "~/.reference-manager/fulltext/"
```
