# Add Command - Multi-Format Import

## Purpose

Extend the `add` command to accept multiple input formats beyond CSL-JSON, including PMID, DOI, BibTeX, and RIS. Input formats are auto-detected by default, with optional explicit specification.

## Command Syntax

```bash
reference-manager add [input...]
```

Where `input` can be:
- File path(s) - format detected by extension or content
- Identifier(s) - PMID or DOI, whitespace-separated
- stdin - when no arguments provided

## Options

```
Options:
  -f, --force              Skip duplicate detection (existing)
  --format <format>        Explicit input format: json|bibtex|ris|pmid|doi|auto
                           (default: auto)
  --verbose                Show detailed error information
```

## Supported Formats

| Format | File Extension | Auto-detection Pattern |
|--------|----------------|------------------------|
| CSL-JSON | `.json` | Starts with `[` or `{` |
| BibTeX | `.bib` | Starts with `@` |
| RIS | `.ris` | Starts with `TY  -` |
| PMID | - | Numeric only (e.g., `12345678`) |
| DOI | - | See DOI patterns below |

### DOI Input Patterns

All of the following are recognized as DOI:

| Pattern | Example |
|---------|---------|
| Standard DOI | `10.1000/xyz123` |
| doi.org URL | `https://doi.org/10.1000/xyz123` |
| doi.org URL (http) | `http://doi.org/10.1000/xyz123` |
| dx.doi.org URL | `https://dx.doi.org/10.1000/xyz123` |
| dx.doi.org URL (http) | `http://dx.doi.org/10.1000/xyz123` |

DOI URLs are normalized to standard format (e.g., `10.1000/xyz123`) before processing.

## Behavior

### Input Interpretation Rules

1. **File vs Identifier Detection**
   - If path exists as file → read as file
   - If path does not exist → interpret as identifier (PMID/DOI)

2. **File Format Detection** (when `--format auto`)
   - Extension priority: `.json` → CSL-JSON, `.bib` → BibTeX, `.ris` → RIS
   - Unknown extension → detect by content

3. **Identifier Detection** (when `--format auto`)
   - Starts with `10.` → DOI
   - Starts with `http://doi.org/` or `https://doi.org/` → DOI
   - Starts with `http://dx.doi.org/` or `https://dx.doi.org/` → DOI
   - Numeric only → PMID
   - Otherwise → error

4. **Multiple Identifiers**
   - Separated by whitespace (space, tab, newline)
   - PMID and DOI can be mixed in single input

### Normal Cases

**File input (auto-detected by extension):**

```bash
$ reference-manager add paper.bib
Added 3 reference(s):
  - smith2024: "Machine Learning Applications"
  - jones2023: "Data Science Methods"
  - lee2024: "Statistical Analysis"
```

**Single PMID:**

```bash
$ reference-manager add 12345678
Added 1 reference(s):
  - author2023: "Title from PubMed"
```

**Multiple identifiers (mixed PMID/DOI):**

```bash
$ reference-manager add 12345678 10.1000/xyz 23456789
Added 3 reference(s):
  - smith2023: "First Paper"
  - jones2024: "Second Paper"
  - lee2023: "Third Paper"
```

**DOI with URL format:**

```bash
$ reference-manager add https://doi.org/10.1000/xyz
Added 1 reference(s):
  - author2024: "Paper Title"
```

**stdin input:**

```bash
$ cat ids.txt | reference-manager add
Added 5 reference(s):
  ...
```

```bash
$ echo "12345678 10.1000/xyz" | reference-manager add
Added 2 reference(s):
  ...
```

**Explicit format specification:**

```bash
$ reference-manager add --format bibtex data.txt
Added 2 reference(s):
  ...
```

### Partial Success Cases

**Some identifiers fail to fetch:**

```bash
$ reference-manager add 12345678 99999999 10.1000/xyz
Added 2 reference(s):
  - smith2023: "First Paper"
  - jones2024: "Third Paper"

Failed to fetch 1 identifier(s):
  - 99999999 (PMID): Not found
```

Exit code: 0 (partial success)

**Some duplicates detected (without --force):**

```bash
$ reference-manager add 12345678 23456789
Added 1 reference(s):
  - jones2024: "New Paper"

Skipped 1 duplicate(s):
  - 12345678 (PMID): matches existing 'smith2023'
```

Exit code: 0 (partial success)

**With --verbose:**

```bash
$ reference-manager add 99999999 --verbose
Failed to fetch 1 identifier(s):
  - 99999999 (PMID): HTTP 404 - Resource not found
    API: https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi
    Response: {"error": "ID not found"}

Added 0 reference(s).
```

### Edge Cases

**Empty file:**

```bash
$ reference-manager add empty.bib
Added 0 reference(s).
```

Exit code: 0

**All identifiers fail:**

```bash
$ reference-manager add 99999999 88888888
Failed to fetch 2 identifier(s):
  - 99999999 (PMID): Not found
  - 88888888 (PMID): Not found

Added 0 reference(s).
```

Exit code: 1 (complete failure)

**File not found (treated as identifier):**

```bash
$ reference-manager add nonexistent.bib
Error: Cannot interpret 'nonexistent.bib' as identifier (not a valid PMID or DOI)
Hint: If this is a file path, check that the file exists.
```

Exit code: 1

**Network unavailable (PMID/DOI):**

```bash
$ reference-manager add 12345678
Error: Network connection required for PMID/DOI lookup

$ reference-manager add 12345678 --verbose
Error: Network connection required for PMID/DOI lookup
  Failed to connect to eutils.ncbi.nlm.nih.gov
  Timeout: 10000ms
```

Exit code: 1

### Error Cases

**Unrecognized format:**

```bash
$ reference-manager add --format xml data.xml
Error: Unsupported format 'xml'. Must be one of: json, bibtex, ris, pmid, doi, auto
```

Exit code: 1

**Cannot detect format:**

```bash
$ echo "random text" | reference-manager add
Error: Cannot detect input format. Use --format to specify explicitly.
```

Exit code: 1

**Invalid BibTeX/RIS syntax:**

```bash
$ reference-manager add malformed.bib
Error: Failed to parse BibTeX: Unexpected token at line 5
```

Exit code: 1

## Dependencies

Add the following citation-js plugins:

| Package | Purpose |
|---------|---------|
| `@citation-js/plugin-bibtex` | Parse BibTeX/BibLaTeX → CSL-JSON |
| `@citation-js/plugin-ris` | Parse RIS → CSL-JSON |
| `@citation-js/plugin-doi` | Fetch DOI metadata → CSL-JSON |

Note: PMID fetching uses PMC Citation Exporter API directly (see below) instead of `@citation-js/plugin-pubmed` due to version compatibility issues.

## PubMed API Configuration

PMID lookup uses the [PMC Citation Exporter API](https://pmc.ncbi.nlm.nih.gov/api/ctxp/) which returns CSL-JSON directly.

### API Endpoint

```
GET https://pmc.ncbi.nlm.nih.gov/api/ctxp/v1/pubmed/?format=csl&id={PMID}
```

Multiple PMIDs: `&id={PMID1}&id={PMID2}`

### Configuration

Email (recommended) and API key (optional) can be configured via environment variables or config file.

**Priority**: Environment variables > Config file

#### Environment Variables

| Variable | Description |
|----------|-------------|
| `PUBMED_EMAIL` | Contact email (recommended by NCBI) |
| `PUBMED_API_KEY` | NCBI API key (optional, increases rate limit) |

#### Config File (`.reference-manager.toml`)

```toml
[pubmed]
email = "user@example.com"
api_key = "your-api-key-here"
```

### Rate Limiting

| Condition | Rate Limit |
|-----------|------------|
| Without API key | 3 requests/second |
| With API key | 10 requests/second |

The fetcher module implements rate limiting based on API key presence.

## Module Structure

```
src/features/import/
├── index.ts              # Public exports
├── types.ts              # ImportResult, ImportError, InputFormat
├── detector.ts           # Format auto-detection
├── normalizer.ts         # DOI URL normalization
├── parser.ts             # BibTeX/RIS parsing via citation-js
├── fetcher.ts            # PMID/DOI API fetching
├── rate-limiter.ts       # Rate limiting for API calls
└── importer.ts           # Main import orchestration
```

### Rate Limiter Design

Uses **factory + lazy initialization singleton** pattern:

- `RateLimiter` class: Delay-based rate limiting with configurable requests/second
- `getRateLimiter(api, config)`: Returns singleton per API type ("pubmed" | "crossref")
- Rate determined by API key presence (PubMed: 3 or 10 req/sec, Crossref: 50 req/sec)
- Shared between CLI and server modes within same process
- `resetRateLimiters()`: Clears singletons for test isolation

See ADR-007 for detailed rationale.

## Data Flow

```
1. Parse CLI arguments
   ↓
2. Determine input source(s)
   ├─ File path(s) provided → read file(s)
   ├─ Identifier(s) provided → collect identifiers
   └─ No args → read stdin
   ↓
3. For each input:
   ├─ Detect format (or use --format)
   ├─ Parse/fetch to CSL-JSON
   │   ├─ json → parse directly
   │   ├─ bibtex → citation-js plugin-bibtex
   │   ├─ ris → citation-js plugin-ris
   │   ├─ pmid → PMC Citation Exporter API (direct fetch)
   │   └─ doi → citation-js plugin-doi (API call)
   └─ Collect results (success/failure)
   ↓
4. For each successfully parsed item:
   ├─ Check duplicates (unless --force)
   │   ├─ Duplicate → add to skipped
   │   └─ Not duplicate → continue
   ├─ Generate/validate ID
   └─ Add to library
   ↓
5. Save library
   ↓
6. Output summary
   ├─ Added references
   ├─ Failed fetches (if any)
   └─ Skipped duplicates (if any)
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success (at least one reference added, or partial success with some skipped/failed) |
| 1 | Complete failure (no references added) |

Note: Partial success (some added, some failed) returns 0 to allow scripting.

## Testing Requirements

### Unit Tests

1. **Format Detection**
   - File extension detection (.json, .bib, .ris)
   - Content-based detection (JSON, BibTeX, RIS)
   - PMID detection (numeric strings)
   - DOI detection (10.xxx, URL formats)
   - Unknown format handling

2. **DOI Normalization**
   - Standard DOI passthrough
   - URL prefix removal (all variants)

3. **Parsing**
   - Valid BibTeX/RIS parsing
   - Multiple entries in single file
   - Malformed input handling
   - Empty file handling

4. **Fetching**
   - Valid PMID/DOI fetch (mocked)
   - Not found handling
   - Network error handling
   - Timeout handling

5. **Rate Limiting**
   - Delay enforcement between requests
   - Singleton per API type
   - API key affects rate limit
   - Reset for test isolation

6. **Import Orchestration**
   - Single file import
   - Multiple identifier import
   - Mixed success/failure
   - Duplicate detection integration
   - Force flag behavior

### Integration Tests

1. End-to-end import flow
2. stdin input handling
3. Multiple input types in single command
4. Error message formatting (normal vs verbose)

## Performance Considerations

- Parallel fetching: Fetch multiple PMIDs/DOIs concurrently (with rate limiting)
- Timeout handling: Set reasonable timeouts for API calls (10s default)
- Rate limiting:
  - PMID: 3 req/sec (without API key) or 10 req/sec (with API key)
  - DOI: Respect Crossref API rate limits
- Batch requests: PMC API supports multiple IDs per request (`&id=1&id=2`)
- Response caching: Cache API responses to avoid redundant requests

### Response Cache

To reduce API calls and respect rate limits, fetched metadata is cached in memory.

**Design**:
- In-memory cache (Map-based) with TTL
- Keyed by identifier (PMID or DOI)
- Separate caches for PMID and DOI
- TTL: 1 hour (configurable)
- Cache hit returns cached CslItem directly, bypassing API call
- Cache is per-process (shared between CLI invocations in server mode)

**Cache behavior**:
| Scenario | Behavior |
|----------|----------|
| First fetch | API call, store in cache |
| Repeated fetch within TTL | Return cached result |
| Fetch after TTL expired | API call, update cache |
| Fetch failure | Not cached (allows retry) |

**Why in-memory only**:
- Per ADR-001, no persistent cache files on disk
- Simple implementation without file I/O complexity
- Cache is warm during interactive sessions (server mode)
- CLI invocations start fresh (acceptable for single-command use)

**Module**: `src/features/import/cache.ts`

## Migration Notes

This extends existing `add` command. Breaking changes:
- `[file]` argument becomes `[input...]` (variadic)
- Backward compatible: `ref add paper.json` still works

## Related Specifications

- `spec/core/data-model.md`: CSL-JSON structure
- `spec/features/duplicate-detection.md`: Duplicate detection rules
- `spec/architecture/cli.md`: CLI framework
- `spec/guidelines/future.md`: Lists this as planned extension
