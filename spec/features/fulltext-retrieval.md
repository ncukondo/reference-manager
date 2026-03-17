# Fulltext Retrieval (OA Discovery & Download)

## Purpose

Automatically discover and download open access (OA) full-text versions of references, integrating with the existing fulltext attachment system. This eliminates the manual workflow of searching for OA sources and downloading/attaching files individually.

## Overview

Uses the `@ncukondo/academic-fulltext` package to:

1. **Discover** OA availability across multiple sources (Unpaywall, PMC, arXiv, CORE)
2. **Fetch** full-text documents (PDF, PMC XML) and auto-attach them to references
3. **Convert** PMC JATS XML to Markdown for AI-readable content

These commands extend the existing `fulltext` subcommand group alongside `attach`, `get`, `detach`, and `open`.

## CLI Commands

### `fulltext discover`

Check OA availability for a reference without downloading.

```bash
ref fulltext discover <ref-id>
ref fulltext discover <ref-id> --uuid
```

**Output:**

```
OA sources for Smith-2024:
  pmc: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1234567/
  arxiv: https://arxiv.org/abs/2401.12345
  unpaywall: https://example.com/paper.pdf (Bronze)
```

If no OA source found:

```
No OA sources found for Smith-2024
```

**Requirements:**
- Reference must have a DOI (primary lookup key for Unpaywall), PMID (for PMC lookup), or arXiv ID (`custom.arxiv_id` for arXiv lookup)
- Reports all available sources with URLs and OA status/type

### `fulltext fetch`

Download OA full text and auto-attach to the reference.

```bash
# Fetch best available source (follows prefer_sources order)
ref fulltext fetch <ref-id>

# Fetch from specific source
ref fulltext fetch <ref-id> --source pmc
ref fulltext fetch <ref-id> --source arxiv

# Force overwrite existing attachment
ref fulltext fetch <ref-id> --force

# Fetch for multiple references
ref fulltext fetch <ref-id-1> <ref-id-2> <ref-id-3>
```

**Options:**

```
--source <source>   Preferred source: pmc, arxiv, unpaywall, core (default: config order)
--force             Overwrite existing fulltext attachment
--uuid              Treat arguments as UUIDs
```

**Behavior:**

1. Resolve reference and extract DOI/PMID/arXiv ID
2. Discover available OA sources (or use `--source` directly)
3. Download from best available source (per `prefer_sources` config)
4. Auto-attach using existing `fulltext attach` mechanism
5. If PMC XML is downloaded, also convert to Markdown and attach both

**Output:**

```
Fetching fulltext for Smith-2024...
  Source: PMC (PMC1234567)
  Downloaded: fulltext.pdf
  Attached pdf: fulltext.pdf
```

If fulltext already attached (without `--force`):

```
Fulltext already attached to Smith-2024. Use --force to overwrite.
```

### `fulltext convert`

Convert an attached fulltext file (PMC JATS XML or PDF) to Markdown.

```bash
# Auto-detect input format (XML preferred over PDF)
ref fulltext convert <ref-id>
ref fulltext convert <ref-id> --uuid

# Explicitly specify input format
ref fulltext convert <ref-id> --from pdf
ref fulltext convert <ref-id> --from xml

# Specify PDF converter
ref fulltext convert <ref-id> --converter marker
ref fulltext convert <ref-id> --converter docling
ref fulltext convert <ref-id> --converter my_tool   # custom converter

# Force re-conversion (overwrite existing markdown)
ref fulltext convert <ref-id> --force
```

**Options:**

```
--from <format>       Input format: xml, pdf (default: auto-detect)
--converter <name>    PDF converter: auto, marker, docling, mineru, pymupdf, or custom name
--force               Overwrite existing markdown attachment
--uuid                Treat identifier as UUID
```

**Auto-detection logic** (when `--from` is not specified):

1. If XML file attached → XML→MD (existing behavior, deterministic and high quality)
2. If PDF file attached (no XML) → PDF→MD (using configured converter)
3. If both attached → XML preferred (`--from pdf` to override)

**Behavior (XML input):**

1. Locate the PMC XML file in the reference's attachment directory
2. Convert JATS XML to Markdown using `convertPmcXmlToMarkdown`
3. Attach the resulting Markdown file

**Behavior (PDF input):**

1. Locate the PDF file in the reference's attachment directory
2. Resolve converter: `--converter` option → config `fulltext.pdfConverter` → `"auto"`
3. In `auto` mode, iterate `fulltext.pdfConverterPriority` and use first available
4. Execute converter via subprocess (see PDF Converter section below)
5. Attach the resulting Markdown file

**Output:**

```
Converted PMC XML to Markdown: fulltext.md
Attached markdown: fulltext.md
```

```
Converting PDF to Markdown using marker...
[marker progress output via stderr]
Converted: fulltext.md (24 pages)
Attached markdown: fulltext.md
```

**Note:** This command is primarily for cases where `fetch` downloaded XML/PDF but conversion was not performed, or when re-conversion is needed.

### PDF Converter

External CLI tools for converting PDF to Markdown. Converters are called as subprocesses.

#### Built-in Converters

| Name | CLI Command | Install | Notes |
|------|------------|---------|-------|
| `marker` | `marker_single` | `pip install marker-pdf` | GPU recommended, best quality |
| `docling` | `docling` | `pip install docling` | CPU OK, good tables |
| `mineru` | `mineru` | `pip install mineru[all]` | GPU recommended, fastest |
| `pymupdf` | `python3 -c "import pymupdf4llm; ..."` | `pip install pymupdf4llm` | CPU only, lightweight fallback |

#### Custom Converters

Users can define custom converters in configuration. A converter is a shell command template with placeholders.

**Protocol:**

- Input: `{input}` — absolute path to PDF file
- Output: `{output}` — absolute path to desired Markdown file (file mode), or stdout (stdout mode)
- Exit: 0 = success, non-zero = failure
- stderr: progress/errors (inherited to terminal in CLI context)

**Placeholders:**

| Placeholder | Example | Description |
|-------------|---------|-------------|
| `{input}` | `/home/user/refs/Smith-2024/fulltext.pdf` | Input PDF absolute path |
| `{output}` | `/home/user/refs/Smith-2024/fulltext.md` | Output MD absolute path |
| `{input_dir}` | `/home/user/refs/Smith-2024` | Input file directory |
| `{input_name}` | `fulltext.pdf` | Input filename |
| `{output_name}` | `fulltext.md` | Output filename |

**Configuration:**

```toml
[fulltext.converters.my_tool]
command = "my-pdf-converter --input {input} --output {output}"

# Optional fields:
output_mode = "file"       # "file" (default) or "stdout"
check_command = "my-pdf-converter --version"
timeout = 600
progress = "inherit"       # "inherit" (default) or "quiet"
command_windows = "python -m my_converter {input} {output}"
check_command_windows = "python -c \"import my_converter\""
```

**Output modes:**

| Mode | Behavior |
|------|----------|
| `file` (default) | `{output}` must appear in command. Tool creates the output file. |
| `stdout` | stdout is captured as Markdown content. `{output}` not used in command. |

**Execution:** Commands are executed via shell (`sh -c` on Unix, `cmd /c` on Windows via `shell: true`), enabling pipes, environment variables, and redirections.

**Availability check:** If `check_command` is defined, it is executed (exit 0 = available). Otherwise, the first token of `command` is looked up via `which` (Unix) or `where` (Windows).

**Name collision:** If a custom converter has the same name as a built-in, the custom definition takes precedence.

#### Converter Resolution (auto mode)

1. Iterate through `fulltext.pdfConverterPriority` (default: `["marker", "docling", "mineru", "pymupdf"]`)
2. For each name: check custom converters first, then built-in converters
3. Run availability check (`isAvailable()`)
4. Use the first available converter
5. If none available, return actionable error with installation instructions

#### Progress Display

| Context | stdout | stderr | Rationale |
|---------|--------|--------|-----------|
| CLI | file mode: ignore / stdout mode: capture | `inherit` (flows to terminal) | User sees converter progress |
| MCP | capture | capture (debug log) | No terminal in JSON-RPC context |
| HTTP | capture | capture (debug log) | No terminal in server context |

The `progress` config option can override stderr handling:
- `inherit` (default): stderr flows directly to user's terminal
- `quiet`: stderr captured, shown only on failure

#### Error Messages

**No converter available (auto mode):**

```
Error: No PDF converter found

  Checked: marker, docling, mineru, pymupdf (none available)

  Install one of the following:

    marker   pip install marker-pdf       (GPU recommended, best quality)
    docling  pip install docling          (CPU OK, good tables)
    mineru   pip install mineru[all]      (GPU recommended, fastest)
    pymupdf  pip install pymupdf4llm     (CPU only, lightweight)

  Or configure a custom converter:

    [fulltext.converters.my_tool]
    command = "my-tool {input} {output}"
```

**Specified converter not installed:**

```
Error: PDF converter 'marker' is not installed

  Install with: pip install marker-pdf

  Or choose a different converter:
    ref fulltext convert Smith-2024 --converter docling
```

**Conversion failed:**

```
Error: Failed to convert PDF to Markdown using marker

  Exit code: 1
  stderr (last 5 lines):
    Processing page 12/24...
    RuntimeError: CUDA out of memory

  Hint: try a CPU-compatible converter:
    ref fulltext convert Smith-2024 --converter pymupdf
```

**No PDF file attached:**

```
Error: No PDF file attached to 'Smith-2024'

  This reference has no fulltext PDF. You can:

    1. Download OA fulltext:  ref fulltext fetch Smith-2024
    2. Attach a local PDF:    ref fulltext attach Smith-2024 /path/to/paper.pdf
```

## Configuration

Config file settings:

```toml
[fulltext]
# Source priority order (first available wins)
prefer_sources = ["pmc", "arxiv", "unpaywall", "core"]

# Preferred fulltext type for open/get (pdf or markdown)
preferred_type = "markdown"

# PDF converter selection: "auto" or a specific converter name
pdf_converter = "auto"

# Converter priority for auto mode
pdf_converter_priority = ["marker", "docling", "mineru", "pymupdf"]

# Conversion timeout in seconds (default: 300)
pdf_converter_timeout = 300

[fulltext.sources]
# Required for Unpaywall API (polite pool)
unpaywall_email = "user@example.com"

# Optional: CORE API key for CORE repository access
core_api_key = ""

# Custom converter definition
[fulltext.converters.my_tool]
command = "my-pdf-converter {input} {output}"
# output_mode = "file"           # "file" (default) or "stdout"
# check_command = "my-pdf-converter --version"
# timeout = 600                  # Override global timeout
# progress = "inherit"           # "inherit" (default) or "quiet"
# command_windows = "python -m my_converter {input} {output}"
```

| Setting | Default | Description |
|---------|---------|-------------|
| `fulltext.prefer_sources` | `["pmc", "arxiv", "unpaywall", "core"]` | Source priority order |
| `fulltext.preferred_type` | (none = pdf priority) | Preferred fulltext type for open/get (`pdf` or `markdown`) |
| `fulltext.pdf_converter` | `"auto"` | PDF converter: `"auto"` or specific name |
| `fulltext.pdf_converter_priority` | `["marker", "docling", "mineru", "pymupdf"]` | Auto mode priority order |
| `fulltext.pdf_converter_timeout` | `300` | Conversion timeout in seconds |
| `fulltext.converters.<name>` | (none) | Custom converter definitions (see PDF Converter section) |
| `fulltext.sources.unpaywall_email` | (none) | Email for Unpaywall API |
| `fulltext.sources.core_api_key` | (none) | API key for CORE |

### Environment Variable Overrides

Following the same pattern as `PUBMED_EMAIL` / `PUBMED_API_KEY`:

| Environment Variable | Config Key | Description |
|---------------------|------------|-------------|
| `UNPAYWALL_EMAIL` | `fulltext.sources.unpaywall_email` | Email for Unpaywall API (polite pool) |
| `CORE_API_KEY` | `fulltext.sources.core_api_key` | API key for CORE repository |
| `REFERENCE_MANAGER_FULLTEXT_PREFERRED_TYPE` | `fulltext.preferred_type` | Preferred fulltext type (`pdf` or `markdown`) |

Environment variables take priority over config file values. These must be added to `ENV_OVERRIDE_MAP` in `src/config/env-override.ts`.

See: `src/config/env-override.ts`

### Config Schema

See: `src/config/schema.ts`

### Validation

- `fulltext discover` and `fulltext fetch` warn if `unpaywall_email` is not set (Unpaywall source will be skipped)
- `fulltext fetch --source core` fails if `core_api_key` is not set

## Integration with Existing Fulltext Commands

The new commands complement the existing manual workflow:

| Command | Purpose |
|---------|---------|
| `fulltext attach` | Manual file attachment (existing) |
| `fulltext get` | Get attached file paths/content (existing) |
| `fulltext open` | Open attached file (existing) |
| `fulltext detach` | Remove attachment (existing) |
| `fulltext discover` | **New:** Check OA availability |
| `fulltext fetch` | **New:** Auto-download and attach |
| `fulltext convert` | **New:** XML/PDF to Markdown (with external converter support) |

`fetch` internally uses the same `fulltextAttach` operation for attaching downloaded files, ensuring consistent metadata and directory structure.

See: `src/features/operations/fulltext/attach.ts`

## MCP Server Endpoints

New MCP tools:

| Tool | Description | Parameters |
|------|-------------|------------|
| `fulltext_discover` | Check OA availability | `id: string` |
| `fulltext_fetch` | Download and attach OA fulltext | `id: string, source?: string, force?: boolean` |
| `fulltext_convert` | Convert XML/PDF to Markdown | `id: string, from?: "xml" \| "pdf", converter?: string` |

See: `spec/architecture/mcp-server.md`

## HTTP Server Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/references/:uuid/fulltext/discover` | Check OA availability |
| `POST` | `/api/references/:uuid/fulltext/fetch` | Download and attach |
| `POST` | `/api/references/:uuid/fulltext/convert` | Convert XML/PDF to Markdown (body: `{ from?, converter? }`) |

See: `spec/architecture/http-server.md`

## Error Handling

| Situation | Message | Exit Code |
|-----------|---------|-----------|
| Reference not found | `Reference not found: <id>` | 1 |
| No DOI, PMID, or arXiv ID on reference | `No DOI, PMID, or arXiv ID found for <id>. Cannot discover OA sources.` | 1 |
| No OA source available | `No OA sources found for <id>` (with checked sources list) | 1 |
| Unpaywall email not configured | `Warning: unpaywall_email not set. Unpaywall source skipped.` (stderr, non-fatal) | 0 |
| CORE API key not configured (when --source core) | `CORE API key not configured. Set fulltext.sources.core_api_key in config.` | 1 |
| Download failed | `Failed to download from <source>: <reason>` (with per-attempt details) | 1 |
| Network error | `Network error: <details>` | 1 |
| Conversion failed (XML) | `Failed to convert PMC XML to Markdown: <reason>` | 1 |
| Conversion failed (PDF) | `Failed to convert PDF to Markdown using <converter>: <reason>` | 1 |
| No PDF converter available | `No PDF converter found` (with install instructions and custom config hint) | 1 |
| PDF converter not installed | `PDF converter '<name>' is not installed. Install with: ...` | 1 |
| Conversion timed out | `PDF conversion timed out after <n> seconds` | 1 |
| No PDF file attached | `No PDF file attached to '<id>'` (with fetch/attach hints) | 1 |
| Fulltext already attached (no --force) | `Fulltext already attached to <id>. Use --force to overwrite.` | 1 |

See: `spec/patterns/error-handling.md`

### Failure Diagnostics

When `fulltext fetch` fails, the result includes structured diagnostic information:

- **`checkedSources`**: Which OA sources were checked (e.g., `["pmc", "unpaywall", "arxiv"]`)
- **`discoveryErrors`**: Per-source errors from the discovery phase (e.g., API failures)
- **`attempts`**: Per-download-attempt details including source, URL, file type, and error reason

**CLI output format on failure (download failed):**

```
Error: Failed to download fulltext for Smith-2024
  Checked: pmc, unpaywall, arxiv
  unpaywall: PDF https://example.com/paper.pdf → HTTP 403 Forbidden
  pmc: XML download failed → HTTP 404 Not Found
  arxiv: not available
```

**CLI output format on failure (no OA sources):**

```
Error: No OA sources found for Smith-2024
  Checked: pmc, unpaywall
  Hint: try 'ref url Smith-2024' to open the publisher page
```

When no OA sources are found, users with subscriptions can use `ref url <id>` to open the publisher page for manual download, then attach via `ref fulltext attach`.

**MCP tool response on failure** includes the same diagnostic fields in the error text.

See: `src/features/operations/fulltext/fetch.ts` for `FulltextFetchResult` and `FetchAttempt` types.

### Retry Behavior

Network requests use simple retry with backoff for transient failures (HTTP 429, 5xx). Retry logic is handled by `@ncukondo/academic-fulltext` internally.

## Dependencies

| Package | Purpose |
|---------|---------|
| `@ncukondo/academic-fulltext` | OA discovery, PDF download, PMC XML download, XML-to-Markdown conversion |

### External CLI Tools (Optional, for PDF conversion)

| Tool | Package | Install | Purpose |
|------|---------|---------|---------|
| `marker` | `marker-pdf` | `pip install marker-pdf` | High-quality PDF→MD (GPU recommended) |
| `docling` | `docling` | `pip install docling` | PDF→MD with strong table support (CPU OK) |
| `mineru` | `mineru` | `pip install mineru[all]` | Fastest PDF→MD (GPU recommended) |
| `pymupdf` | `pymupdf4llm` | `pip install pymupdf4llm` | Lightweight PDF→MD (CPU only) |

None of these are required. PDF conversion is only available when at least one converter is installed. Users can also configure custom converters (see Configuration section).

### External API Dependencies

| API | Used By | Auth Required |
|-----|---------|---------------|
| Unpaywall | `discoverOA` | Email (polite pool) |
| PubMed Central (PMC) | `discoverOA`, `fetchFulltext` | None |
| arXiv | `discoverOA`, `fetchFulltext` | None |
| CORE | `discoverOA`, `fetchFulltext` | API key |

## Examples

```bash
# Check OA availability
ref fulltext discover Smith-2024

# Download best available OA fulltext
ref fulltext fetch Smith-2024

# Download specifically from PMC
ref fulltext fetch Smith-2024 --source pmc

# Batch fetch for multiple references
ref fulltext fetch Smith-2024 Jones-2023 Lee-2022

# Force re-download
ref fulltext fetch Smith-2024 --force

# Convert attached XML/PDF to Markdown
ref fulltext convert Smith-2024

# Convert PDF explicitly (when both XML and PDF exist)
ref fulltext convert Smith-2024 --from pdf

# Convert PDF with specific converter
ref fulltext convert Smith-2024 --from pdf --converter marker

# Convert using custom converter
ref fulltext convert Smith-2024 --converter my_tool

# Full workflow: add reference, fetch fulltext, convert, open
ref add 10.1038/nature12373
ref fulltext fetch Nature-2013
ref fulltext convert Nature-2013 --from pdf
ref fulltext open Nature-2013
```
