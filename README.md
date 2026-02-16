# reference-manager

> Automate your literature workflow — from systematic reviews to manuscript writing

[![npm version](https://img.shields.io/npm/v/@ncukondo/reference-manager.svg)](https://www.npmjs.com/package/@ncukondo/reference-manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Status: Alpha](https://img.shields.io/badge/Status-Alpha-orange.svg)]()

A command-line reference management tool designed for automation. Integrates with AI agents (Claude Code, Claude Desktop) via MCP and works seamlessly with shell scripts and Pandoc.

## Why reference-manager?

Traditional reference managers (Zotero, Mendeley, EndNote) are designed for manual, GUI-based workflows. **reference-manager** takes a different approach:

- **Automation-first**: Every operation is available via CLI and MCP — no GUI required
- **AI-native**: Direct integration with Claude and other AI agents through the Model Context Protocol
- **Single source of truth**: CSL-JSON format ensures compatibility and transparency
- **Pandoc-ready**: Generate citations in any style, ready for academic writing

## Use Cases

### Systematic Review / Scoping Review

Automate the tedious parts of literature reviews:

```bash
# Import references from multiple sources
ref add pmid:12345678 pmid:23456789
ref add "10.1234/example.doi"
ref add "ISBN:978-4-00-000000-0"
ref add exported-from-pubmed.nbib

# AI-assisted screening (with Claude Code)
# "Review the abstracts in my library and flag potentially relevant papers for my review on AI in medical education"

# Export for analysis
ref list --format json > references.json
```

### Manuscript Writing

Streamline your writing workflow:

```bash
# Find and select references interactively
ref search -t "machine learning"
# → Select references with Space, then export as BibTeX or generate citations

# Generate citations
ref cite smith2024 jones2023 --style apa
# Output: (Smith, 2024; Jones, 2023)

# Attach and manage full-text PDFs
ref fulltext attach smith2024 ~/papers/smith2024.pdf

# Export for Pandoc
ref list --format json > references.json
pandoc manuscript.md --bibliography references.json -o manuscript.docx
```

### AI-Assisted Research

Let Claude help manage your references:

```
You: "Find all papers by Smith published after 2020"
Claude: [uses search tool] Found 3 references...

You: "Generate an APA citation for the machine learning paper"
Claude: [uses cite tool] Smith, J. (2024). Machine learning applications...

You: "Add this paper: 10.1234/example"
Claude: [uses add tool] Added reference: example2024
```

## Installation

### Requirements

- Node.js 22 or later

### From npm

```bash
npm install -g @ncukondo/reference-manager
```

### From source

```bash
git clone https://github.com/ncukondo/reference-manager.git
cd reference-manager
npm install
npm run build
npm link
```

## Quick Start

```bash
# Initialize (creates default config and empty library)
ref list

# Browse your library interactively (launches TUI search)
ref

# Add a reference by DOI
ref add "10.1038/nature12373"

# Add from PubMed
ref add pmid:25056061

# Add a book by ISBN
ref add "ISBN:978-4-00-000000-0"

# Search your library
ref search "author:smith machine learning"

# Generate a citation
ref cite smith2024 --style apa

# List all references
ref list
```

## AI Integration (MCP)

reference-manager provides an MCP (Model Context Protocol) server for direct integration with AI agents.

### Claude Code Setup

Add reference-manager as an MCP server (no global installation required):

```bash
claude mcp add reference-manager --scope project -- npx -y @ncukondo/reference-manager mcp
```

Or with a custom library path:

```bash
claude mcp add reference-manager --scope project -- npx -y @ncukondo/reference-manager mcp --library ~/my-references.json
```

### Claude Desktop Setup

#### Option 1: MCPB Bundle (Recommended)

Download the `.mcpb` file from the [latest release](https://github.com/ncukondo/reference-manager/releases/latest) and install it via Claude Desktop:

1. Download `reference-manager.mcpb` from the release page
2. Open Claude Desktop and go to **Settings** → **Extensions**
3. Click **Install from file** and select the downloaded `.mcpb` file
4. Configure the **Config File Path** when prompted (e.g., `~/.reference-manager/config.toml`)

The config file is located at the platform-specific configuration directory (e.g., `~/.config/reference-manager/config.toml` on Linux).

#### Option 2: Manual Configuration

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "reference-manager": {
      "command": "npx",
      "args": ["-y", "@ncukondo/reference-manager", "mcp"]
    }
  }
}
```

With a custom library:

```json
{
  "mcpServers": {
    "reference-manager": {
      "command": "npx",
      "args": ["-y", "@ncukondo/reference-manager", "mcp", "--library", "/path/to/library.json"]
    }
  }
}
```

### Available Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `search` | Search references by query | `query`: Search string (e.g., `"author:smith 2024"`) |
| `list` | List all references | `format?`: `"json"` \| `"bibtex"` \| `"pretty"` |
| `add` | Add new reference(s) | `input`: DOI, PMID, ISBN, BibTeX, RIS, or CSL-JSON |
| `remove` | Remove a reference | `id`: Reference ID, `force`: must be `true` |
| `cite` | Generate formatted citation | `ids`: Array of reference IDs, `style?`: Citation style, `format?`: `"text"` \| `"html"` |
| `fulltext_attach` | Attach PDF/Markdown to reference | `id`: Reference ID, `path`: File path |
| `fulltext_get` | Get full-text content | `id`: Reference ID |
| `fulltext_detach` | Detach full-text from reference | `id`: Reference ID |
| `check` | Check references for retractions and updates | `ids?`: Array of IDs, `all?`: Check all, `skipDays?`: Skip recent |

### Available Resources

| URI | Description |
|-----|-------------|
| `library://references` | All references as CSL-JSON array |
| `library://reference/{id}` | Single reference by ID |
| `library://styles` | Available citation styles |

## Shell Completion

Enable intelligent tab completion for Bash, Zsh, or Fish:

```bash
# Install completion (interactive shell selection)
ref completion

# Or explicitly
ref completion install

# Remove completion
ref completion uninstall
```

After installation, restart your shell or source the config file. Then:

```bash
ref <TAB>                    # Shows: list search add remove attach ...
ref list --<TAB>             # Shows: --json --sort --limit ...
ref list --sort <TAB>        # Shows: created updated published ...
ref cite <TAB>               # Shows: smith2023 jones2024 ...
ref cite smith<TAB>          # Shows: smith2023 smith2024-review
ref attach <TAB>             # Shows: open add list get detach sync
ref attach add <ID> --role <TAB>  # Shows: fulltext supplement notes draft
```

Completion includes:
- Subcommands and options
- Option values (sort fields, citation styles, attachment roles, etc.)
- Dynamic reference IDs from your library

## CLI Reference

### Interactive ID Selection

When you invoke certain commands without specifying IDs in a TTY environment, an interactive search prompt appears:

```bash
# These commands support interactive selection when ID is omitted
ref cite                  # Select references → generate citation
ref edit                  # Select references → open in editor
ref remove                # Select reference → confirm deletion
ref update                # Select reference → update flow
ref fulltext attach       # Select reference → attach file
ref fulltext open         # Select reference → open file
```

This makes it easy to quickly find and act on references without remembering citation keys.

### Basic Commands

```bash
# List all references
ref list
ref list --format json
ref list --format bibtex

# List with sorting and pagination
ref list --sort published --order desc          # Latest first
ref list --sort author --limit 10               # First 10 by author
ref list --sort created -n 20 --offset 20       # Page 2 (items 21-40)

# Search references
ref search "machine learning"
ref search "author:smith"
ref search "author:jones year:2024"
ref search "title:\"deep learning\""

# Interactive search (with real-time filtering)
ref search -t                         # Start interactive mode
ref search -t "machine learning"      # Pre-fill query

# Export raw CSL-JSON (for pandoc, jq, etc.)
ref export smith2024                          # Single reference (as object)
ref export smith2024 jones2023                # Multiple references (as array)
ref export --all                              # All references
ref export --search "author:smith"            # Search results
ref export smith2024 -o yaml                  # YAML format
ref export --all -o bibtex                    # BibTeX format

# Add references
ref add paper.json                    # From CSL-JSON file
ref add references.bib                # From BibTeX
ref add export.ris                    # From RIS
ref add "10.1038/nature12373"         # From DOI
ref add pmid:25056061                 # From PubMed ID
ref add "ISBN:978-4-00-000000-0"      # From ISBN
cat references.json | ref add         # From stdin (file content)
echo "10.1038/nature12373" | ref add  # From stdin (DOI auto-detect)
echo "12345678" | ref add -i pmid     # From stdin (PMID)
echo "ISBN:978-4-00-000000-0" | ref add -i isbn  # From stdin (ISBN)

# Remove a reference
ref remove smith2024
ref remove smith2024 --force          # Skip confirmation

# Update a reference
ref update smith2024 updates.json              # From JSON file
ref update smith2024 --set "title=New Title"   # Inline update

# Update with --set option (repeatable)
ref update smith2024 --set "title=New Title" --set "DOI=10.1234/example"

# Array operations (tags, keywords)
ref update smith2024 --set "custom.tags+=urgent"       # Add to array
ref update smith2024 --set "custom.tags-=done"         # Remove from array
ref update smith2024 --set "custom.tags=a,b,c"         # Replace array

# Set authors
ref update smith2024 --set "author=Smith, John"                    # Single author
ref update smith2024 --set "author=Smith, John; Doe, Jane"         # Multiple authors

# Set dates
ref update smith2024 --set "issued.raw=2024-03-15"

# Change citation key
ref update smith2024 --set "id=smith2024-revised"

# Clear a field
ref update smith2024 --set "abstract="

# Generate citations
ref cite smith2024
ref cite smith2024 jones2023 --style apa
ref cite smith2024 --style chicago-author-date -o html

# Interactive selection (no ID argument)
ref cite
# → Select references interactively → choose style → output citation

# Additional options
ref cite smith2024 --in-text                 # In-text citation: (Smith, 2024)
ref cite smith2024 --csl-file ./custom.csl   # Use custom CSL file
ref cite smith2024 --locale ja-JP            # Japanese locale
```

### Fulltext Management

```bash
# Attach files
ref fulltext attach smith2024 ~/papers/smith2024.pdf
ref fulltext attach smith2024 ~/notes/smith2024.md
ref fulltext attach smith2024 paper.pdf --move    # Move instead of copy
ref fulltext attach smith2024 paper.pdf --force   # Overwrite existing

# Get attached files
ref fulltext get smith2024 --pdf                  # Get PDF path
ref fulltext get smith2024 --md                   # Get Markdown path
ref fulltext get smith2024 --pdf --stdout         # Output content to stdout

# Open files with default application
ref fulltext open smith2024                       # Open PDF (or Markdown if no PDF)
ref fulltext open smith2024 --pdf                 # Open PDF explicitly
ref fulltext open smith2024 --md                  # Open Markdown explicitly

# Open from search results (pipeline)
ref search "cancer" --limit 1 --format ids-only | ref fulltext open
ref search "review" --format ids-only | xargs -I{} ref fulltext open {}

# Detach files
ref fulltext detach smith2024 --pdf
ref fulltext detach smith2024 --pdf --delete      # Also delete the file
```

### Attachment Management

A more flexible attachment system supporting multiple files per reference with role-based categorization:

```bash
# Open reference's attachment folder (for drag-and-drop file management)
ref attach open smith2024                # Opens folder in file manager
ref attach open smith2024 --print        # Print path only (for scripting)

# Add attachments programmatically
ref attach add smith2024 supplement.xlsx --role supplement
ref attach add smith2024 notes.md --role notes
ref attach add smith2024 draft-v1.docx --role draft --label v1
ref attach add smith2024 file.pdf --move    # Move instead of copy
ref attach add smith2024 file.pdf --force   # Overwrite existing

# List attachments
ref attach list smith2024                # List all attachments
ref attach list smith2024 --role supplement  # Filter by role

# Get attachment path
ref attach get smith2024 supplement-data.xlsx

# Sync metadata with filesystem (after manual file operations)
ref attach sync smith2024                # Show pending changes (dry-run)
ref attach sync smith2024 --yes          # Apply changes
ref attach sync smith2024 --fix          # Also remove missing files from metadata

# Detach files
ref attach detach smith2024 supplement-data.xlsx
ref attach detach smith2024 supplement-data.xlsx --delete  # Also delete file
```

**Available Roles:**
- `fulltext` — Primary document (PDF or Markdown)
- `supplement` — Supplementary materials, datasets
- `notes` — Research notes
- `draft` — Draft versions

**Manual Workflow:**
1. `ref attach open smith2024` — Opens folder in your file manager
2. Drag and drop files into the folder
3. `ref attach sync smith2024 --yes` — Updates metadata to include new files

Files are organized by reference in directories named `Author-Year-ID-UUID` under the attachments directory.

### Reference Checking

Check your references for retractions, expressions of concern, preprint-to-published version changes, and metadata drift:

```bash
# Check specific references
ref check smith2024
ref check smith2024 jones2023

# Check all references in library
ref check --all

# Skip references checked within the last 30 days
ref check --all --days 30

# Skip metadata comparison (only check retractions/concerns/versions)
ref check --all --no-metadata

# JSON output
ref check --all -o json
ref check --all -o json --full    # Include full details

# Report only (do not save results to library)
ref check --all --no-save

# Interactive repair for findings (TTY only)
ref check --all --fix
```

Sources queried:
- **Crossref** (when DOI is present): Retractions, expressions of concern, version changes via `update-to` field, metadata comparison
- **PubMed** (when PMID is present): Retraction status, expression of concern

**Metadata comparison** detects drift between local and remote records:
- **Mismatch**: Title or author significantly differs from remote (likely wrong registration). Example: `[MISMATCH] smith-2024 — title: "Wrong Title" → "Correct Title"`
- **Outdated**: Publication fields (page, volume, issue, type) updated remotely since import. Example: `[OUTDATED] jones-2023 — page: (none) → "123-145"`

Use `--fix` to interactively update changed fields from the remote source.

Results are saved to `custom.check` by default for skip-if-recent logic.

### Edit Command

Edit references interactively using your preferred text editor:

```bash
# Edit single reference
ref edit smith2024

# Edit multiple references
ref edit smith2024 jones2023

# Edit by UUID
ref edit --uuid 550e8400-e29b-41d4-a716-446655440000

# Edit in JSON format (default is YAML)
ref edit smith2024 --format json

# Interactive selection (no ID argument)
ref edit
```

**Editor selection** (same as Git):
1. `$VISUAL` environment variable
2. `$EDITOR` environment variable
3. Platform fallback: `vi` (Linux/macOS) or `notepad` (Windows)

**Features:**
- Opens references in YAML or JSON format
- Protected fields (uuid, timestamps, fulltext) shown as comments
- Validation with re-edit option on errors
- Date fields simplified to ISO format (`"2024-03-15"`)

### Output Formats

| Format | Flag | Description |
|--------|------|-------------|
| Pretty | (default) | Human-readable format |
| JSON | `--format json` | CSL-JSON array |
| BibTeX | `--format bibtex` | BibTeX format |
| IDs only | `--format ids-only` | One ID per line |

### JSON Output for Scripting

The `add`, `remove`, and `update` commands support structured JSON output for scripting and automation:

```bash
# Add with JSON output (outputs to stdout)
ref add pmid:12345678 -o json
ref add paper.bib -o json --full    # Include full CSL-JSON data

# Remove with JSON output
ref remove smith2024 -o json
ref remove smith2024 -o json --full  # Include removed item data

# Update with JSON output
ref update smith2024 --set "title=New Title" -o json
ref update smith2024 --set "title=New" -o json --full  # Include before/after

# Pipeline examples
ref add pmid:12345678 -o json | jq '.added[].id' | xargs ref cite
ref add paper.bib -o json | jq -e '.summary.failed == 0'  # Check for failures
```

**Output structure:**

- `add`: Returns `{ summary, added[], skipped[], failed[] }` with counts and details
- `remove`: Returns `{ success, id, uuid?, title?, item?, error? }`
- `update`: Returns `{ success, id, uuid?, title?, idChanged?, previousId?, before?, after?, error? }`

**Options:**

| Option | Description |
|--------|-------------|
| `-o json` / `--output json` | Output JSON to stdout (default: text to stderr) |
| `--full` | Include full CSL-JSON data in output |

See `spec/features/json-output.md` for complete schema documentation.

### Search Query Syntax

- **Simple search**: `machine learning` (matches any field)
- **Field-specific**: `author:smith`, `title:neural`, `year:2024`
- **Phrase search**: `"machine learning"` (exact phrase)
- **Combined**: `author:smith "deep learning" 2024`

Supported field prefixes: `id:`, `author:`, `title:`, `year:`, `doi:`, `pmid:`, `pmcid:`, `isbn:`, `url:`, `keyword:`, `tag:`

### Interactive Search

Start an interactive search session with real-time filtering:

```bash
ref                              # Shortcut: launches TUI search directly
ref search -t                    # Start with empty query
ref search -t "machine learning" # Pre-fill the search query
```

**Features:**
- Real-time filtering as you type (200ms debounce)
- Multi-select with Space key
- Action menu for selected references:
  - Output IDs (citation keys)
  - Output as CSL-JSON
  - Output as BibTeX
  - Generate citation (APA or choose style)

**Navigation:**
| Key | Action |
|-----|--------|
| `↑` / `↓` | Move cursor |
| `Space` | Toggle selection |
| `Enter` | Open action menu |
| `Esc` / `Ctrl+C` | Cancel |

> **Note**: Interactive mode requires a TTY (terminal). It won't work in pipes or scripts.

### Sorting and Pagination

```bash
# Sort options
ref list --sort published              # Sort by publication date
ref list --sort created                # Sort by added date
ref list --sort updated                # Sort by modification date
ref list --sort author                 # Sort by first author name
ref list --sort title                  # Sort alphabetically by title
ref search "AI" --sort relevance       # Sort by search relevance (search only)

# Sort order
ref list --sort published --order asc  # Oldest first
ref list --sort published --order desc # Newest first (default)

# Pagination
ref list --limit 20                    # Show first 20 results
ref list -n 20 --offset 40             # Show items 41-60
```

Sort field aliases: `pub`→`published`, `mod`→`updated`, `add`→`created`, `rel`→`relevance`

## Configuration

Configuration files follow platform conventions:

| Platform | Location |
|----------|----------|
| Linux | `~/.config/reference-manager/config.toml` |
| macOS | `~/Library/Preferences/reference-manager/config.toml` |
| Windows | `%APPDATA%\reference-manager\Config\config.toml` |

Default paths for data (library, fulltext, CSL styles):

| Platform | Location |
|----------|----------|
| Linux | `~/.local/share/reference-manager/` |
| macOS | `~/Library/Application Support/reference-manager/` |
| Windows | `%LOCALAPPDATA%\reference-manager\Data\` |

You can also use project-local configuration by creating `.reference-manager.config.toml` in any directory.

```toml
# Override library path (defaults to {data}/library.json)
library = "~/references.json"

# Logging level: silent, info, debug
log_level = "info"

# Shared email for API services (Crossref, PubMed, Unpaywall, NCBI)
# Each service uses this as a fallback when no service-specific email is set
email = "your@email.com"

[backup]
max_generations = 50
max_age_days = 365

[attachments]
# Override attachments directory (defaults to {data}/attachments)
directory = "~/references/attachments"

[server]
auto_start = true
auto_stop_minutes = 60
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `REFERENCE_MANAGER_LIBRARY` | Override library file path |
| `REFERENCE_MANAGER_ATTACHMENTS_DIR` | Override attachments directory |
| `EMAIL` | Shared email for API services (fallback for all services) |
| `PUBMED_EMAIL` | Email for PubMed API (overrides `EMAIL`) |
| `PUBMED_API_KEY` | API key for PubMed (higher rate limits) |
| `UNPAYWALL_EMAIL` | Email for Unpaywall API (overrides `EMAIL`) |
| `NCBI_EMAIL` | Email for NCBI API (overrides `EMAIL`) |

### Config Command

Manage configuration via CLI without manually editing TOML files:

```bash
# View all configuration
ref config show
ref config show -o json           # JSON format
ref config show --sources         # Show where each value comes from

# Get/set individual values
ref config get citation.default_style
ref config set citation.default_style chicago-author-date
ref config set --local citation.default_style ieee  # Project-local config

# Reset to default
ref config unset citation.default_style

# List all available keys
ref config keys

# Show config file locations
ref config path

# Open config in editor
ref config edit
ref config edit --local           # Edit project-local config
```

**Key categories:**
- `library`, `log_level`, `email` — Core settings
- `backup.*` — Backup configuration
- `server.*` — HTTP server settings
- `citation.*` — Citation defaults (style, locale, format)
- `pubmed.*` — PubMed API credentials
- `fulltext.*` — Fulltext settings and source credentials
- `attachments.*` — Attachments storage
- `cli.*` — CLI behavior (limits, sorting, TUI mode)
- `mcp.*` — MCP server settings

## Data Format

reference-manager uses [CSL-JSON](https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html) as its native format — the same format used by Pandoc, Zotero, and other academic tools.

### Pandoc Integration

```bash
# Export your library
ref list --format json > references.json

# Use with Pandoc
pandoc manuscript.md \
  --bibliography references.json \
  --csl apa.csl \
  -o manuscript.docx
```

### Custom Fields

reference-manager extends CSL-JSON with a `custom` object for additional metadata:

```json
{
  "id": "smith2024",
  "type": "article-journal",
  "title": "Example Paper",
  "custom": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "tags": ["important", "to-read"],
    "fulltext_pdf": "smith2024.pdf",
    "fulltext_md": "smith2024.md"
  }
}
```

## Project Status

**Alpha** — This project is under active development. APIs and commands may change between versions.

See [spec/tasks/ROADMAP.md](./spec/tasks/ROADMAP.md) for development progress and planned features.

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Quality Checks

```bash
npm run typecheck        # TypeScript type checking
npm run lint             # Linting
npm run format           # Code formatting
```

## License

MIT

## Links

- [Repository](https://github.com/ncukondo/reference-manager)
- [npm Package](https://www.npmjs.com/package/@ncukondo/reference-manager)
- [Issues](https://github.com/ncukondo/reference-manager/issues)
- [Documentation](./spec/)

