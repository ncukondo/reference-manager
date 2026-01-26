# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Interactive TUI**: Migrated from Enquirer to React Ink for all interactive components
  - Improved declarative UI model with better state management
  - Terminal history preserved using alternate screen buffer
  - Single App Pattern for multi-step flows (e.g., `cite` command)
  - All interactive commands (`search -t`, `cite`, `edit`, `remove`, `fulltext open`, `attach open`) now use React Ink
  - **Known limitation**: Terminal resize may cause header/status to scroll off-screen

### Removed

- **Enquirer dependency**: Replaced with React Ink and readline for confirmations

### Added

- **Attachments System**: Comprehensive attachment management replacing the limited fulltext feature
  - `ref attach open <id>`: Open reference's attachment folder in file manager
  - `ref attach add <id> <file> --role <role>`: Add attachment with role (fulltext, supplement, notes, draft)
  - `ref attach list <id>`: List all attachments, optionally filter by `--role`
  - `ref attach get <id> <filename>`: Get attachment file path
  - `ref attach detach <id> <filename>`: Remove attachment, with `--delete` to remove file
  - `ref attach sync <id>`: Synchronize metadata with filesystem after manual file operations
  - Per-reference directories named `{id}-{uuid-prefix}`
  - Role-based file naming: `{role}[-{label}].{ext}`
  - Interactive mode for `attach open`: auto-syncs on completion
  - WSL support: uses `wslview` for opening files/directories

- **Shell Completion for attach command**: Tab completion for subcommands, `--role` option values, and reference IDs

### Changed

- **BREAKING: CLI Option Consistency**: Unified input/output format options and short option conventions across all commands
  - `add`: `--format` → `-i, --input` (input format)
  - `export`: `-f, --format` → `-o, --output` (output format)
  - `cite`: `--format` → `-o, --output` (output format)
  - `edit`: `-f, --format` → `--format` (removed short option to avoid conflict with `--force`)
  - `search`: `-i, --interactive` → `-t, --tui` (TUI mode)
  - `list`/`search`: `--uuid` → `--uuid-only` (output mode flag)
  - `list`/`search`: added `-o, --output` option for output format
  - `config show`: `--json` → `-o, --output json`
  - `config`: `list-keys` subcommand renamed to `keys`
  - Config: `[cli.interactive]` section renamed to `[cli.tui]`
  - Short option conventions: `-i` for input, `-o` for output, `-f` for force, `-t` for TUI, `-n` for limit

- **Shell Completion**: Command-context-aware `--output` completions
  - `cite`: text|html|rtf
  - `export`: json|yaml|bibtex
  - `list`/`search`: pretty|json|bibtex|ids|uuid
  - `add`/`remove`/`update`: json|text
  - `config show`: text|json

- **BREAKING: Default Paths**: Default paths now follow platform conventions using XDG Base Directory Specification on Linux, standard paths on macOS/Windows
  - **Linux**: Config in `~/.config/reference-manager/`, data in `~/.local/share/reference-manager/`, cache in `~/.cache/reference-manager/`
  - **macOS**: Config in `~/Library/Preferences/reference-manager/`, data in `~/Library/Application Support/reference-manager/`, cache in `~/Library/Caches/reference-manager/`
  - **Windows**: Config in `%APPDATA%\reference-manager\Config\`, data in `%LOCALAPPDATA%\reference-manager\Data\`, cache in `%LOCALAPPDATA%\reference-manager\Cache\`
  - Library file renamed from `csl.library.json` to `library.json`
  - Backups now stored in cache directory instead of system temp
  - **Migration**: Move existing data from `~/.reference-manager/` to new locations or use config to specify custom paths

- **MCP Tools**: `search` and `list` tools now always return raw `CslItem[]` data
  - Removed `format` parameter from MCP list tool
  - LLMs can process structured data directly and format if needed
  - Simpler, more consistent API

- **Architecture**: Separated data retrieval from formatting
  - Operations layer (`searchReferences`, `listReferences`) now always return `CslItem[]`
  - Formatting moved to CLI layer only (using `formatItems()`)
  - Improved type safety with consistent return types

### Fixed

- **Search/List JSON Output**: Fixed double-escaped JSON in `--json` output for `search` and `list` commands
  - Previously: `{"items":["{\"id\":\"ref-1\",...}"],...}` (items were escaped strings)
  - Now: `{"items":[{"id":"ref-1",...}],...}` (items are proper JSON objects)
  - Output can now be directly piped to `jq` without additional parsing

### Added

- **Config Command**: New `config` command for managing configuration via CLI
  - `config show`: Display effective configuration (TOML/JSON, with source annotations)
  - `config get <key>`: Get specific configuration value with dot notation
  - `config set <key> <value>`: Set configuration value with type validation
  - `config unset <key>`: Remove configuration value (revert to default)
  - `config keys`: List all available configuration keys with types
  - `config path`: Show configuration file paths and existence status
  - `config edit`: Open configuration file in external editor
  - Consistent write target: writes to local config if exists, else user config
  - `--local` / `--user` flags for explicit target selection
  - Environment variable override warnings when applicable
  - Zod schema validation for all values

- **Edit Command**: New `edit` command for interactive reference editing
  - Opens references in external editor (YAML or JSON format)
  - Editor resolution: `$VISUAL` → `$EDITOR` → platform fallback (vi/notepad)
  - Protected fields (uuid, created_at, timestamp, fulltext) shown as comments
  - Date fields transformed to ISO format for easy editing
  - Multi-reference editing in a single file
  - Validation with error recovery (re-edit, restore, abort)
  - Examples: `ref edit smith2024`, `ref edit --format json smith2024`
  - Configuration: `[cli.edit]` section with `default_format` option

- **Export Command**: New `export` command for raw CSL-JSON output
  - Export specific references: `ref export smith2024 jones2023`
  - Export all: `ref export --all`
  - Export search results: `ref export --search "author:smith"`
  - Output formats: JSON (default), YAML, BibTeX (`--format yaml|bibtex`)
  - Single ID outputs as object; multiple items output as array
  - Lookup by UUID: `ref export --uuid <uuid>`
  - Designed for external tools like pandoc, jq

- **Citation Key Search (`id:` prefix)**: Search references by citation key using `id:` prefix
  - Example: `ref search "id:smith2023"`
  - Exact match only (no partial matching)
  - Case-insensitive matching
  - Citation key (`id` field) is also searched in multi-field search

- **Case-Insensitive ID Field Matching**: All ID fields now use case-insensitive exact matching
  - Affects: `id`, `DOI`, `PMID`, `PMCID`, `ISBN`, `URL`
  - Example: `doi:10.1234/ABC` now matches `10.1234/abc`

- **ISBN Search Field Prefix**: Search references by ISBN using `isbn:` prefix
  - Example: `ref search "isbn:9784000000000"`
  - Exact match (no partial matching)
  - Case-insensitive for X check digit in ISBN-10 (e.g., `isbn:400000000x` matches `400000000X`)

- **JSON Output Option**: Machine-readable JSON output for add/remove/update commands
  - New `--output json` (`-o json`) option for add, remove, update commands
  - New `--full` option to include full CSL-JSON data in output
  - Structured output with summary, added/skipped/failed items (add)
  - Includes `duplicateType` for skipped duplicates (doi, pmid, isbn, isbn-title, title-author-year)
  - Includes `reason` for failed imports (not_found, fetch_error, parse_error, validation_error, unknown)
  - `idChanged` and `previousId` for ID changes (both collision resolution and explicit changes)
  - JSON output to stdout, text output to stderr
  - See `spec/features/json-output.md` for full specification

- **Update Command --set Option (Phase 20)**: Inline field updates for the `update` command
  - New `--set <field=value>` option (repeatable)
  - String fields: `title`, `abstract`, `DOI`, `PMID`, `ISBN`, `URL`, etc.
  - Array operations: `+=` to add, `-=` to remove (for `custom.tags`, `keyword`)
  - Author parsing: `--set "author=Smith, John; Doe, Jane"`
  - Date setting: `--set "issued.raw=2024-03-15"`
  - ID change: `--set "id=new-key"`
  - Clear fields: `--set "abstract="`
  - Protected fields validation: `custom.uuid`, `custom.timestamp`, etc. cannot be set
  - Mutually exclusive with file argument
  - See `spec/architecture/cli.md` (Update Command section) for full specification

- **Fulltext Open Command**: Open PDF/Markdown files with system default application
  - New `fulltext open` subcommand: `ref fulltext open <ref-id>`
  - Automatic file type selection: PDF prioritized when both exist
  - Explicit type options: `--pdf`, `--markdown`
  - Pipeline support: `ref search "query" --limit 1 --format id | ref fulltext open`
  - Stdin support: reads identifier from stdin when not provided as argument
  - Cross-platform: macOS (`open`), Linux (`xdg-open`), Windows (`start`)
  - Descriptive error messages for missing files and references
  - See `spec/features/fulltext.md` for full specification

- **Interactive ID Selection (Phase 22)**: Fallback to interactive search when commands are invoked without ID in TTY
  - Supported commands: cite, edit, remove, update, fulltext subcommands
  - Multi-select for cite/edit/remove, single-select for update/fulltext
  - Style selection prompt for cite command when `--style` not specified
  - Lists built-in styles (apa, vancouver, harvard) and custom styles from `csl_directory`
  - Default style shown first with `(default)` marker
  - Non-TTY mode: error message prompts user to provide ID or run interactively
  - Examples:
    - `ref cite` → Opens interactive search, select references, choose style
    - `ref edit` → Opens interactive search, select references to edit
    - `ref fulltext open` → Opens interactive search for single reference
  - See `spec/features/interactive-id-selection.md` for full specification

- **Interactive Search (Phase 18)**: Real-time interactive reference search mode
  - New `-i, --interactive` flag for search command: `ref search -i [query]`
  - Real-time filtering: results update as you type (200ms debounce)
  - Multi-select support: choose multiple references with Space key
  - Action menu for selected references:
    - Output IDs (citation keys)
    - Output as CSL-JSON
    - Output as BibTeX
    - Generate citation (APA or choose style)
  - TTY requirement: exits gracefully in non-interactive environments
  - Configurable: `cli.interactive.limit` (default: 20), `cli.interactive.debounce_ms` (default: 200)
  - Supports existing search query syntax (field prefixes, phrases, etc.)
  - See `spec/features/interactive-search.md` for full specification

- **Shell Completion (Phase 17)**: Bash/Zsh/Fish auto-completion using tabtab
  - New `completion` command: `ref completion [install|uninstall]`
  - Static completion: subcommands, global options, command-specific options
  - Option value completion: `--sort`, `--format`, `--style`, `--log-level`, etc.
  - Dynamic ID completion: reference IDs from library for cite, remove, update, fulltext commands
  - ID completions include brief description (Zsh/Fish): `smith2023:RNA interference...`
  - Performance optimized: limit candidates to 100, use server if running
  - Silent error handling: returns empty completions on failure
  - See `spec/features/shell-completion.md` for full specification

- **Pagination and Sorting (Phase 16)**: Add sorting and pagination to list/search commands
  - Sort fields: `created`, `updated`, `published`, `author`, `title` (+ `relevance` for search)
  - Sort aliases: `pub`→`published`, `mod`→`updated`, `add`→`created`, `rel`→`relevance`
  - Pagination: `--limit/-n`, `--offset` options
  - Secondary sort for stability: `created` (desc), then `id` (asc)
  - CLI: `ref list --sort pub --order desc -n 10 --offset 20`
  - HTTP API: Body params `sort`, `order`, `limit`, `offset`
  - MCP: Default limit=20 (configurable via `mcp.default_limit`)
  - JSON output includes pagination metadata: `{ items, total, limit, offset, nextOffset }`
  - Non-JSON output shows header when paginated: `# Showing 1-10 of 150 references`
  - Input validation: negative limit/offset rejected, invalid sort field/order rejected
  - See `spec/features/pagination.md` for full specification

- **MCP ILibraryOperations Pattern (Phase 15)**: Unified MCP tool implementation
  - All MCP tools use `ILibraryOperations` interface
  - Consistent with CLI and HTTP server patterns

- **ISBN Support (Phase 14)**: Add ISBN support to the add command
  - ISBN-10 and ISBN-13 format detection and normalization
  - Metadata fetching via `@citation-js/plugin-isbn` (Google Books API, Open Library)
  - Response caching for ISBN queries (same pattern as DOI/PMID)
  - Duplicate detection with ISBN matching (priority: DOI > PMID > ISBN)
    - `book` type: ISBN only
    - `book-section` type: ISBN + title (same book can have multiple chapters)
  - Library ISBN index with `idType: 'isbn'` support in `find()` method
  - Unified `idType` parameter in FindOptions (replaces deprecated `byUuid`)
  - CLI: `--format isbn` option and `ISBN:` prefix detection
  - Examples: `add ISBN:978-4-00-000000-0`, `add --format isbn 9784000000000`

- **MCPB Publishing (Phase 13)**: Enable publishing to MCPB registry
  - `manifest.json` for Claude Desktop integration
  - Automated `.mcpb` bundle creation in GitHub release workflow
  - MCPB installation instructions in README
  - User config: `config_path` for library configuration file path

- **MCP Server (Phase 12)**: Model Context Protocol stdio server for AI agent integration
  - New `mcp` CLI command: `reference-manager mcp [--library <path>]`
  - **Tools**: search, list, cite, add, remove, fulltext_attach, fulltext_get, fulltext_detach
  - **Resources**: `library://references`, `library://reference/{id}`, `library://styles`
  - File watching with auto-reload on library file changes
  - Compatible with Claude Code, Cursor, and other MCP-enabled AI tools
  - Configuration example for Claude Code in `~/.config/claude/claude_desktop_config.json`

- **ILibrary Interface**: Unified interface for local and server mode operations
  - All ILibrary methods are async (Promise-based)
  - Unified `find()`, `update()`, `remove()` methods (replaces id/uuid-specific variants)
  - `ILibraryOperations` interface for high-level operations (search, list, cite, import)
  - `OperationsLibrary` class wrapping ILibrary with operation functions
  - `ServerClient` implements `ILibraryOperations` for HTTP server mode
  - Simplified CLI commands with no mode branching logic

- **HTTP Server File Reload**: Auto-reload on library file changes (same pattern as MCP server)

- **Search Enhancements (Phase 11)**: Improved search functionality
  - Case-sensitive matching for consecutive uppercase letters (AI, RNA, API, etc.)
    - Query "AI" matches "AI therapy" but not "ai therapy" or "Ai therapy"
    - Query "api" still matches "API endpoint" (no consecutive uppercase in query)
    - Works with partial matches: "RNA" matches "mRNA sequencing"
  - Author full given name search support
    - Query "author:Takeshi" matches author with given name "Takeshi"
    - Previously only matched on family name and initial
  - Custom tags field support (`custom.tags`)
    - New `tag:` search prefix for tag-specific search
    - Tags included in multi-field (bare) search
    - Schema updated to include `tags` in CslCustomSchema

- **Full-text Management (Phase 10)**: New `fulltext` command for PDF and Markdown file management
  - `fulltext attach`: Attach PDF or Markdown files to references
    - Auto-detect format by file extension
    - Support stdin input with `--pdf` or `--markdown` flags
    - Copy (default) or move (`--move`) files to fulltext directory
    - Overwrite protection with `--force` option
  - `fulltext get`: Retrieve attached file paths or content
    - Output paths for PDF and/or Markdown files
    - Output content to stdout with `--stdout` option
  - `fulltext detach`: Remove file associations from references
    - Detach metadata only (default) or delete files with `--delete`
  - Auto-generated filenames: `{id}[-PMID{PMID}]-{uuid}.{ext}` format
  - Configuration: `fulltext.directory` setting in `config.toml`
  - Reference removal integration: Warn if fulltext attached, delete with `--force`
  - Server mode support: Uses `executeUpdate` infrastructure

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
