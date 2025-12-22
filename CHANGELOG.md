# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Server Mode Performance Optimization (Phase 9)**: Introduced `ExecutionContext` pattern
  - New discriminated union type `ExecutionContext` for server/local mode distinction
  - `createExecutionContext()` function checks server availability before loading library
  - In server mode, library is NOT loaded redundantly - commands use HTTP API instead
  - All CLI commands updated to use `ExecutionContext` pattern
  - New server routes with `byUuid` option: `/api/references/id/:id` and `/api/references/uuid/:uuid`
  - `ServerClient` methods now support `{ byUuid?: boolean }` option for ID vs UUID lookup
  - E2E tests for server/local mode transitions
  - Performance tests validating server mode optimization

- **Operation Integration (Phase 8)**: Refactored all commands to use unified pattern
  - Unified operation layer in `features/operations/` for all commands
  - Dedicated server routes (`POST /api/list`, `/api/search`, `/api/cite`)
  - ServerClient methods (`list()`, `search()`, `cite()`, `remove()`, `update()`)
  - Consistent `executeXxx()` + `formatXxxOutput()` pattern across CLI commands
  - Architecture: CLI → operations → server API or direct library access

### Added

- **Multi-Format Import**: Extended `add` command to support multiple input formats
  - BibTeX (`.bib`) and RIS (`.ris`) file parsing via citation-js plugins
  - DOI lookup via Crossref API (supports `10.xxx` and URL formats)
  - PMID lookup via PMC Citation Exporter API
  - Automatic format detection by file extension and content
  - DOI URL normalization (doi.org, dx.doi.org variants)
  - Multiple identifiers support (whitespace-separated PMID/DOI mix)
  - stdin content handling for piped input
  - Variadic input: `add [input...]` accepts multiple files/identifiers
  - `--format` option to explicitly specify input format
  - `--verbose` option for detailed error information
  - Response caching to avoid redundant API calls
  - Rate limiting for PMID (3-10 req/sec) and DOI (50 req/sec) APIs
  - PubMed configuration in `config.toml`:
    - `pubmed.email`: Contact email (recommended by NCBI)
    - `pubmed.api_key`: NCBI API key (increases rate limit to 10 req/sec)
  - Environment variable support: `PUBMED_EMAIL`, `PUBMED_API_KEY`
  - Server mode support: Uses server API when server is running

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
