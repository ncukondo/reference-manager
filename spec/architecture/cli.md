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

## Configuration Resolution Order

Configuration file is resolved in the following order:

1. Path specified by environment variable:
   ```
   REFERENCE_MANAGER_CONFIG
   ```
2. Current directory:
   ```
   .reference_manager.config.json
   ```
3. User config:
   ```
   ~/.config/reference-manager/config.json
   ```

Rules:
- Library directory is specified in the config file
- CLI arguments override config values
