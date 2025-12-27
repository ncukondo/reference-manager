# Add Command

## Purpose

Add references to the library from multiple input formats.

## Syntax

```bash
reference-manager add [input...]
```

Where `input` can be:
- File path(s) - format detected by extension or content
- Identifier(s) - PMID or DOI
- stdin - when no arguments provided

## Options

```
-f, --force          Skip duplicate detection
--format <format>    Explicit format: json|bibtex|ris|pmid|doi|isbn|auto (default: auto)
--verbose            Show detailed error information
```

## Supported Formats

| Format | Extension | Auto-detection |
|--------|-----------|----------------|
| CSL-JSON | `.json` | Starts with `[` or `{` |
| BibTeX | `.bib` | Starts with `@` |
| RIS | `.ris` | Starts with `TY  -` |
| PMID | - | Numeric only, or `PMID:` prefix |
| DOI | - | Starts with `10.` or DOI URL |
| ISBN | - | `ISBN:` prefix required (see below) |

### DOI Input Patterns

All recognized as DOI:
- `10.1000/xyz123`
- `https://doi.org/10.1000/xyz123`
- `http://dx.doi.org/10.1000/xyz123`

### ISBN Input Patterns

ISBN requires explicit prefix or `--format isbn` option:
- `ISBN:978-4-00-000000-0` (with prefix)
- `isbn:4000000000` (case-insensitive prefix)
- `9784000000000 --format isbn` (explicit format)

**Note**: Pure numeric strings are interpreted as PMID by default. Use `ISBN:` prefix or `--format isbn` for ISBNs.

Supported formats:
- ISBN-13: 13 digits (starting with 978 or 979)
- ISBN-10: 10 digits (last may be X for check digit)

## Behavior

### Input Detection

1. Path exists as file → Read as file
2. Path does not exist → Interpret as identifier (PMID/DOI)

### Format Detection (auto mode)

- **Files**: Extension priority, then content-based
- **Identifiers**: `10.` prefix or DOI URL → DOI; numeric only → PMID

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

# Multiple inputs
reference-manager add paper.json 12345678 10.1000/abc

# From stdin
cat refs.json | reference-manager add

# Force add despite duplicates
reference-manager add --force paper.json
```

## Dependencies

- `@citation-js/plugin-bibtex`: BibTeX parsing
- `@citation-js/plugin-ris`: RIS parsing
- `@citation-js/plugin-doi`: DOI fetching
- `@citation-js/plugin-isbn`: ISBN fetching (Google Books API, Open Library)

PMID fetching uses PMC Citation Exporter API directly (see ADR-007).

## Rate Limiting

| API | Rate Limit |
|-----|------------|
| PubMed (no API key) | 3 req/sec |
| PubMed (with API key) | 10 req/sec |
| Crossref (DOI) | 50 req/sec |
| Google Books (ISBN) | 1,000 req/day |
