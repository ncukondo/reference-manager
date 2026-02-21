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
- Reference must have a DOI (primary lookup key for Unpaywall) or PMID (for PMC lookup)
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

1. Resolve reference and extract DOI/PMID
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

Convert an attached PMC JATS XML file to Markdown.

```bash
ref fulltext convert <ref-id>
ref fulltext convert <ref-id> --uuid
```

**Behavior:**

1. Locate the PMC XML file in the reference's attachment directory
2. Convert JATS XML to Markdown using `convertPmcXmlToMarkdown`
3. Attach the resulting Markdown file

**Output:**

```
Converted PMC XML to Markdown: fulltext.md
Attached markdown: fulltext.md
```

**Note:** This command is primarily for cases where `fetch` downloaded XML but conversion was not performed, or when re-conversion is needed.

## Configuration

New section in config file:

```toml
[fulltext]
# Source priority order (first available wins)
prefer_sources = ["pmc", "arxiv", "unpaywall", "core"]

# Preferred fulltext type for open/get (pdf or markdown)
preferred_type = "markdown"

[fulltext.sources]
# Required for Unpaywall API (polite pool)
unpaywall_email = "user@example.com"

# Optional: CORE API key for CORE repository access
core_api_key = ""
```

| Setting | Default | Description |
|---------|---------|-------------|
| `fulltext.prefer_sources` | `["pmc", "arxiv", "unpaywall", "core"]` | Source priority order |
| `fulltext.preferred_type` | (none = pdf priority) | Preferred fulltext type for open/get (`pdf` or `markdown`) |
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
| `fulltext convert` | **New:** PMC XML to Markdown |

`fetch` internally uses the same `fulltextAttach` operation for attaching downloaded files, ensuring consistent metadata and directory structure.

See: `src/features/operations/fulltext/attach.ts`

## MCP Server Endpoints

New MCP tools:

| Tool | Description | Parameters |
|------|-------------|------------|
| `fulltext_discover` | Check OA availability | `id: string` |
| `fulltext_fetch` | Download and attach OA fulltext | `id: string, source?: string, force?: boolean` |
| `fulltext_convert` | Convert PMC XML to Markdown | `id: string` |

See: `spec/architecture/mcp-server.md`

## HTTP Server Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/references/:uuid/fulltext/discover` | Check OA availability |
| `POST` | `/api/references/:uuid/fulltext/fetch` | Download and attach |
| `POST` | `/api/references/:uuid/fulltext/convert` | Convert PMC XML to Markdown |

See: `spec/architecture/http-server.md`

## Error Handling

| Situation | Message | Exit Code |
|-----------|---------|-----------|
| Reference not found | `Reference not found: <id>` | 1 |
| No DOI or PMID on reference | `No DOI or PMID found for <id>. Cannot discover OA sources.` | 1 |
| No OA source available | `No OA sources found for <id>` (with checked sources list) | 1 |
| Unpaywall email not configured | `Warning: unpaywall_email not set. Unpaywall source skipped.` (stderr, non-fatal) | 0 |
| CORE API key not configured (when --source core) | `CORE API key not configured. Set fulltext.sources.core_api_key in config.` | 1 |
| Download failed | `Failed to download from <source>: <reason>` (with per-attempt details) | 1 |
| Network error | `Network error: <details>` | 1 |
| Conversion failed | `Failed to convert PMC XML to Markdown: <reason>` | 1 |
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

# Convert PMC XML to Markdown
ref fulltext convert Smith-2024

# Full workflow: add reference, fetch fulltext, open
ref add 10.1038/nature12373
ref fulltext fetch Nature-2013
ref fulltext open Nature-2013
```
