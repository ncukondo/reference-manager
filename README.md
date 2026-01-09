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
ref search -i "machine learning"
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

The config file should contain at minimum:

```toml
library = "~/.reference-manager/csl.library.json"
```

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
ref <TAB>                    # Shows: list search add remove ...
ref list --<TAB>             # Shows: --json --sort --limit ...
ref list --sort <TAB>        # Shows: created updated published ...
ref cite <TAB>               # Shows: smith2023 jones2024 ...
ref cite smith<TAB>          # Shows: smith2023 smith2024-review
```

Completion includes:
- Subcommands and options
- Option values (sort fields, citation styles, etc.)
- Dynamic reference IDs from your library

## CLI Reference

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
ref search -i                         # Start interactive mode
ref search -i "machine learning"      # Pre-fill query

# Export raw CSL-JSON (for pandoc, jq, etc.)
ref export smith2024                          # Single reference (as object)
ref export smith2024 jones2023                # Multiple references (as array)
ref export --all                              # All references
ref export --search "author:smith"            # Search results
ref export smith2024 --format yaml            # YAML format
ref export --all --format bibtex              # BibTeX format

# Add references
ref add paper.json                    # From CSL-JSON file
ref add references.bib                # From BibTeX
ref add export.ris                    # From RIS
ref add "10.1038/nature12373"         # From DOI
ref add pmid:25056061                 # From PubMed ID
ref add "ISBN:978-4-00-000000-0"      # From ISBN
cat references.json | ref add         # From stdin (file content)
echo "10.1038/nature12373" | ref add  # From stdin (DOI auto-detect)
echo "12345678" | ref add --format pmid  # From stdin (PMID)
echo "ISBN:978-4-00-000000-0" | ref add --format isbn  # From stdin (ISBN)

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
ref cite smith2024 --style chicago-author-date --format html
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

Supported field prefixes: `author:`, `title:`, `year:`, `doi:`, `pmid:`, `pmcid:`, `isbn:`, `url:`, `keyword:`, `tag:`

### Interactive Search

Start an interactive search session with real-time filtering:

```bash
ref search -i                    # Start with empty query
ref search -i "machine learning" # Pre-fill the search query
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

Configuration file: `~/.reference-manager.config.toml`

```toml
# Path to the library file
library = "~/references.json"

# Logging level: silent, info, debug
log_level = "info"

[backup]
enabled = true
max_count = 10
max_age_days = 30

[fulltext]
directory = "~/references/fulltext"

[server]
auto_start = true
auto_stop_minutes = 60
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `REFERENCE_MANAGER_LIBRARY` | Override library file path |
| `REFERENCE_MANAGER_FULLTEXT_DIR` | Override fulltext directory |

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
