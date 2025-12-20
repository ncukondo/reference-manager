# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Citation Generation**: New `cite` command for generating formatted citations
  - Generate bibliography entries using CSL (Citation Style Language) styles
  - Generate in-text citations with `--in-text` option
  - Support for multiple citation styles (APA, Vancouver, Harvard)
  - Custom CSL file support via `--csl-file` option
  - Multiple output formats: text, HTML, RTF (`--format` option)
  - Locale support for internationalization (`--locale` option)
  - UUID lookup support (`--uuid` option)
  - Automatic fallback to simplified format when CSL processor fails
  - Configuration options in `config.toml`:
    - `citation.default_style`: Default CSL style (default: "apa")
    - `citation.csl_directory`: Directories for custom CSL styles
    - `citation.default_locale`: Default locale (default: "en-US")
    - `citation.default_format`: Default output format (default: "text")
  - Server mode support: Uses server API when server is running

## [0.1.0] - Initial Release

### Added

- Core reference management functionality
- CSL-JSON as single source of truth
- Library management with UUID-based tracking
- CLI commands:
  - `list`: List all references
  - `search`: Search references
  - `add`: Add new references
  - `remove`: Remove references
  - `update`: Update existing references
  - `server`: Manage HTTP server for library access
- Multiple output formats: JSON, BibTeX, pretty-print
- Duplicate detection
- File monitoring and automatic reload
- Write safety and conflict handling
- Configuration file support (TOML format)
- Backup system for library files
- HTTP server with REST API
- Cross-platform support (Linux, macOS, Windows)
