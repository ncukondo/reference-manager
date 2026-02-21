# Add Command

## Purpose

Add references to the library from multiple input formats.

## Syntax

```bash
reference-manager add [input...]
```

Where `input` can be:
- File path(s) - format detected by extension or content
- Identifier(s) - PMID, DOI, ISBN, or arXiv ID
- stdin - when no arguments provided

## Options

```
-i, --input <format>  Input format: json|bibtex|ris|pmid|doi|isbn|arxiv|auto (default: auto)
-f, --force           Skip duplicate detection
-o, --output <format> Output format: json|text (default: text)
--full                Include full CSL-JSON data in JSON output
--verbose             Show detailed error information (text mode only)
```

### JSON Output

See `spec/features/json-output.md` for JSON output schema and examples.

## Supported Formats

| Format | Extension | Auto-detection |
|--------|-----------|----------------|
| CSL-JSON | `.json` | Starts with `[` or `{` |
| BibTeX | `.bib` | Starts with `@` |
| RIS | `.ris` | Starts with `TY  -` |
| NBIB (MEDLINE) | `.nbib` | Starts with `PMID-` |
| PMID | - | Numeric only, or `PMID:` prefix |
| DOI | - | Starts with `10.` or DOI URL |
| ISBN | - | `ISBN:` prefix required (see below) |
| arXiv | - | `NNNN.NNNNN` pattern, `arXiv:` prefix, or arXiv URL (see below) |

### NBIB (PubMed MEDLINE) Format

NBIB is the tagged MEDLINE format exported from PubMed's "Send to: Citation manager" feature.

- Extension: `.nbib`
- Parsed using RIS parser (citation-js) with MEDLINE tag compatibility
- Auto-detected by `PMID-` prefix in content

**Note**: NBIB and RIS share similar tagged structure. Some MEDLINE-specific fields may not be fully preserved during conversion to CSL-JSON.

### DOI Input Patterns

All recognized as DOI:
- `10.1000/xyz123`
- `https://doi.org/10.1000/xyz123`
- `http://dx.doi.org/10.1000/xyz123`

### ISBN Input Patterns

ISBN requires explicit prefix or `--input isbn` option:
- `ISBN:978-4-00-000000-0` (with prefix)
- `isbn:4000000000` (case-insensitive prefix)
- `9784000000000 --input isbn` (explicit format)

**Note**: Pure numeric strings are interpreted as PMID by default. Use `ISBN:` prefix or `--input isbn` for ISBNs.

Supported formats:
- ISBN-13: 13 digits (starting with 978 or 979)
- ISBN-10: 10 digits (last may be X for check digit)

### arXiv ID Input Patterns

All recognized as arXiv ID:
- `2301.13867` (bare ID)
- `2301.13867v2` (with version)
- `arXiv:2301.13867` (with prefix, case-insensitive)
- `https://arxiv.org/abs/2301.13867`
- `https://arxiv.org/pdf/2301.13867`
- `https://arxiv.org/html/2301.13867v2`

Normalized form: `2301.13867` or `2301.13867v2` (version preserved).

Pattern: `\d{4}\.\d{4,5}(v\d+)?` — does not conflict with PMID (no decimal point), DOI (starts with `10.`), or ISBN (requires prefix).

arXiv ID is stored in `custom.arxiv_id`. The `DOI` field receives the journal DOI if available from arXiv API, otherwise the arXiv DOI (`10.48550/arXiv.<id>`). See `spec/features/metadata.md` for details.

## Behavior

### Input Detection

1. Path exists as file → Read as file
2. Path does not exist → Interpret as identifier (PMID/DOI)

### Format Detection (auto mode)

- **Files**: Extension priority, then content-based
- **Identifiers**: `10.` prefix or DOI URL → DOI; `NNNN.NNNNN` pattern or arXiv URL → arXiv; `ISBN:` prefix → ISBN; numeric only → PMID

### Duplicate Detection

- Default: Reject if duplicate found (DOI, PMID, or Title+Author+Year match)
- `--force`: Skip duplicate check

### ID Collision Handling

If generated ID already exists:
- Append suffix: `a`, `b`, ... `z`, `aa`, `ab`, ...

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (at least one added, or partial success) |
| `1` | Complete failure (none added) |

## Examples

```bash
# Add from file
reference-manager add paper.bib

# Add by PMID
reference-manager add 12345678

# Add by DOI
reference-manager add 10.1000/xyz

# Add by arXiv ID
reference-manager add 2301.13867
reference-manager add arXiv:2301.13867v2

# Multiple inputs
reference-manager add paper.json 12345678 10.1000/abc

# From stdin (file content)
cat refs.json | reference-manager add

# From stdin (identifiers)
echo "10.1038/nature12373" | reference-manager add           # DOI (auto-detect)
echo "12345678" | reference-manager add --input pmid         # PMID
echo "12345678 23456789" | reference-manager add -i pmid     # Multiple PMIDs
echo "ISBN:978-4-00-000000-0" | reference-manager add -i isbn  # ISBN

# Force add despite duplicates
reference-manager add --force paper.json

# JSON output
reference-manager add 12345678 -o json
reference-manager add 12345678 -o json --full
```

## Dependencies

- `@citation-js/plugin-bibtex`: BibTeX parsing
- `@citation-js/plugin-ris`: RIS parsing
- `@citation-js/plugin-doi`: DOI fetching
- `@citation-js/plugin-isbn`: ISBN fetching (Google Books API, Open Library)

PMID fetching uses PMC Citation Exporter API directly (see ADR-007).
arXiv fetching uses arXiv Atom API directly (`http://export.arxiv.org/api/query`).

## Rate Limiting

| API | Rate Limit |
|-----|------------|
| PubMed (no API key) | 3 req/sec |
| PubMed (with API key) | 10 req/sec |
| Crossref (DOI) | 50 req/sec |
| Google Books (ISBN) | 1,000 req/day |
| arXiv | 1 req/3sec (see arXiv API ToS) |
