# reference-manager

A local reference management tool using CSL-JSON as the single source of truth.

## Features

- **CSL-JSON Native**: Uses CSL-JSON format as the primary data model
- **Command-line Interface**: Comprehensive CLI with search, add, update, remove commands
- **HTTP Server**: Optional background server for improved performance
- **Duplicate Detection**: Automatic detection via DOI, PMID, or title+author+year
- **Smart Search**: Full-text search with field-specific queries
- **File Monitoring**: Automatic reload on external changes
- **Backup Management**: Automatic backups with retention policies
- **Pandoc Compatible**: Works seamlessly with Pandoc's bibliography system

## Installation

### Requirements

- Node.js 22 or later

### From npm (when published)

```bash
npm install -g reference-manager
```

### From source

```bash
git clone https://github.com/ncukondo/reference-manager.git
cd reference-manager
npm install
npm run build
npm link
```

## Usage

The command `ref` is available after installation (alias: `reference-manager`).

### Basic Commands

```bash
# List all references
ref list

# Search references
ref search "author:smith machine learning"

# Add a new reference (from JSON file)
ref add reference.json

# Add from stdin
cat reference.json | ref add

# Update a reference
ref update smith-2020 updates.json

# Remove a reference
ref remove smith-2020

# Server management
ref server start
ref server status
ref server stop
```

### Output Formats

```bash
# Pretty format (default)
ref list

# JSON format
ref list --format json

# BibTeX format
ref list --format bibtex

# IDs only
ref list --format ids-only
```

### Configuration

Configuration file: `.reference-manager.config.toml`

```toml
library = "~/references.json"
log_level = "info"

[backup]
enabled = true
max_count = 10
max_age_days = 30

[server]
auto_start = true
auto_stop_minutes = 60
```

See `spec/architecture/cli.md` for full configuration options.

## Development

### Build

```bash
npm run build
```

### Test

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Quality Checks

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Format
npm run format
```

## Project Status

✅ **All phases completed** (Phase 1-5)

- 606 tests passing
- Full TypeScript type coverage
- Multi-platform support (Linux, macOS, Windows)
- Ready for distribution

## Architecture

The project is organized into modular components:

- **Core**: CSL-JSON processing, Reference/Library management, Identifier generation
- **Features**: Search, Duplicate detection, 3-way merge, File monitoring
- **CLI**: Command-line interface with Commander.js
- **Server**: HTTP server with Hono
- **Utils**: Logging, File operations, Backup management
- **Config**: TOML-based configuration

See `spec/_index.md` for detailed architecture documentation.

## License

MIT

## Repository

https://github.com/ncukondo/reference-manager