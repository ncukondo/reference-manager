# Check Command

## Purpose

Detect status changes for references in the library by querying external sources (Crossref, PubMed). Catches retractions, expressions of concern, and preprint-to-published version changes.

## Syntax

```bash
reference-manager check [ids...] [options]
```

Multiple IDs can be specified (same as `cite`, `export`):

```bash
ref check Smith-2024 Jones-2023 preprint-2023a
```

## Options

| Flag | Short | Description |
|------|-------|-------------|
| `--all` | | Check all references in library |
| `--search <query>` | | Check references matching search query |
| `--uuid` | | Interpret identifiers as UUIDs |
| `--output <format>` | `-o` | Output format: `text` (default) / `json` |
| `--full` | | Include full details in JSON output |
| `--no-save` | | Report only, do not save results to library |
| `--fix` | | Interactive repair (TTY only) |
| `--days <n>` | | Skip references checked within n days (default: 7) |
| `--metadata` | | Compare local metadata against remote (default: enabled) |
| `--no-metadata` | | Skip metadata comparison |

**Selection modes** (mutually exclusive): `[ids...]`, `--all`, `--search`

Interactive selection if identifier omitted (TTY only, same as `remove`/`cite`).

## Detection Targets

| Type | Key | Description |
|------|-----|-------------|
| Retraction | `retracted` | Article has been retracted |
| Expression of Concern | `concern` | Publisher issued an expression of concern |
| Version change | `version_changed` | Preprint has a published version (new DOI available) |
| Metadata mismatch | `metadata_mismatch` | Local metadata significantly differs from remote (likely wrong registration) |
| Metadata outdated | `metadata_outdated` | Remote metadata has been updated since import |

## External API Strategy

| Source | Condition | Information |
|--------|-----------|-------------|
| **Crossref REST API** (`/works/{DOI}`) | DOI present | `update-to` field (retraction, correction, version); full metadata for comparison |
| **PubMed E-utilities** | PMID present | Publication status, retraction notices |

- DOI present → Crossref (primary)
- PMID only → PubMed
- Both present → Crossref + PubMed

References with neither DOI nor PMID are skipped (reported as `skipped` in output).

### Crossref `update-to` Field

Crossref provides update relationships via the `update-to` array:

```json
{
  "update-to": [{
    "type": "retraction",
    "DOI": "10.1234/retraction-notice",
    "label": "Retraction",
    "updated": { "date-parts": [[2024, 6, 1]] }
  }]
}
```

Relevant `type` values: `retraction`, `expression-of-concern`, `new_version`.

**Note**: The Crossref REST API is queried directly (not via citation-js) because `update-to` metadata is not exposed through citation-js DOI resolution.

### Metadata Comparison (enabled by default)

When `--metadata` is enabled (default), the checker compares local metadata against remote records from the same Crossref/PubMed response used for status checks (no additional API call).

#### Compared Fields

| Category | Fields | Role |
|----------|--------|------|
| Identity | `title`, `author`, `container-title`, `type` | Determines mismatch vs outdated |
| Publication | `page`, `volume`, `issue`, `issued` | Always classified as outdated |
| Excluded | `custom`, `id`, `abstract`, `score` | Not compared |

#### Classification Logic

The checker distinguishes two types of metadata drift:

1. **`metadata_mismatch`** — Identity fields differ significantly. Indicates the reference may have been registered with incorrect metadata (e.g., wrong DOI, manual entry error).

2. **`metadata_outdated`** — Only publication fields differ, or identity fields have minor changes. Indicates the remote record has been updated since import (e.g., preprint → published, page numbers added).

**Title similarity** (word-level, after normalization):
- Jaccard similarity = |A∩B| / |A∪B|
- Containment coefficient = |A∩B| / min(|A|, |B|)
- Title is "similar" if: Jaccard ≥ 0.5 OR Containment ≥ 0.8

**Author similarity** (family name overlap):
- Overlap = |local_families ∩ remote_families| / |local_families|
- Asymmetric: measures how many local authors appear in remote record
- Author is "similar" if: overlap ≥ 0.5
- Skipped if either side has no authors

**Overall classification**:
- Title mismatched OR author mismatched → `metadata_mismatch`
- Fields differ but title and author are similar → `metadata_outdated`
- No differences → no finding

Errs on the side of `metadata_mismatch` (safer: warns the user rather than treating wrong data as merely outdated).

### Rate Limiting

Uses existing rate limiters:

| API | Rate Limit |
|-----|------------|
| Crossref | 50 req/sec |
| PubMed (no API key) | 3 req/sec |
| PubMed (with API key) | 10 req/sec |

## Data Model

### Check Result Types

```typescript
type CheckStatus = "ok" | "retracted" | "concern" | "version_changed"
  | "metadata_mismatch" | "metadata_outdated";

interface CheckFinding {
  type: CheckStatus;
  message: string;
  details?: {
    retractionDoi?: string;
    retractionDate?: string;
    newDoi?: string;
    updatedFields?: string[];
    fieldDiffs?: Array<{
      field: string;
      local: string | null;
      remote: string | null;
    }>;
  };
}

interface CheckResult {
  id: string;
  uuid: string;
  status: "ok" | "warning" | "skipped";
  findings: CheckFinding[];
  checkedAt: string;          // ISO 8601
  checkedSources: string[];   // ["crossref", "pubmed"]
}
```

### Storage in `custom.check`

Check results are saved to `custom.check` by default:

```json
"custom": {
  "check": {
    "checked_at": "2026-02-15T10:00:00.000Z",
    "status": "retracted",
    "findings": [
      {
        "type": "retracted",
        "message": "This article was retracted on 2024-06-01",
        "details": { "retraction_doi": "10.1234/retraction" }
      }
    ]
  }
}
```

Metadata drift example (only `updated_fields` saved; full diffs in output only):

```json
"custom": {
  "check": {
    "checked_at": "2026-02-16T10:00:00.000Z",
    "status": "metadata_outdated",
    "findings": [
      {
        "type": "metadata_outdated",
        "message": "Remote metadata has been updated since import",
        "details": { "updated_fields": ["page", "volume", "issued"] }
      }
    ]
  }
}
```

- Saved by default; use `--no-save` to skip saving
- `--days <n>` skips re-checking references whose `custom.check.checked_at` is within n days
- `custom.check` follows the passthrough convention (preserved by other operations)

## Output Formats

### Text Output (default)

```
Checking 5 references...

[RETRACTED] Smith-2024
  This article was retracted on 2024-06-01
  Retraction notice: https://doi.org/10.1234/retraction

[VERSION] preprint-2023a
  Published version available: 10.5678/published

[MISMATCH] wrong-doi-2024
  title: "Wrong Title" → "Correct Title"
  author: no overlap with remote authors
  ⚠ Local metadata significantly differs from the remote record.
  → Run: ref update wrong-doi-2024

[OUTDATED] jones-2023
  page: (none) → "123-145"
  volume: (none) → "42"
  ℹ Remote metadata has been updated since import.
  → Run: ref update jones-2023

[OK] tanaka-2024

Summary: 5 checked, 1 retracted, 1 version changed, 1 mismatch, 1 outdated, 1 ok
```

### JSON Output

```json
{
  "results": [
    {
      "id": "Smith-2024",
      "uuid": "...",
      "status": "warning",
      "findings": [
        {
          "type": "retracted",
          "message": "This article was retracted on 2024-06-01",
          "details": { "retractionDoi": "10.1234/retraction" }
        }
      ],
      "checkedAt": "2026-02-15T10:00:00.000Z",
      "checkedSources": ["crossref"]
    },
    {
      "id": "jones-2023",
      "uuid": "...",
      "status": "warning",
      "findings": [
        {
          "type": "metadata_outdated",
          "message": "Remote metadata has been updated since import",
          "details": {
            "updatedFields": ["page", "volume"],
            "fieldDiffs": [
              { "field": "page", "local": null, "remote": "123-145" },
              { "field": "volume", "local": null, "remote": "42" }
            ]
          }
        }
      ],
      "checkedAt": "2026-02-16T10:00:00.000Z",
      "checkedSources": ["crossref"]
    }
  ],
  "summary": {
    "total": 5,
    "ok": 1,
    "warnings": 3,
    "mismatch": 1,
    "outdated": 1,
    "skipped": 1
  }
}
```

## `--fix` Interactive Repair

When findings are detected, `--fix` presents actions interactively (TTY only):

### Retraction

```
[RETRACTED] Smith-2024
  Actions:
  1) Add tag "retracted"
  2) Add note with retraction details
  3) Remove from library
  4) Skip
```

### Version Change

```
[VERSION] preprint-2023a
  Actions:
  1) Update metadata from published version
  2) Add tag "has-published-version"
  3) Skip
```

### Metadata Mismatch

```
[MISMATCH] wrong-doi-2024
  title: "Wrong Title" → "Correct Title"
  Actions:
  1) Update all changed fields from remote
  2) Skip
```

### Metadata Outdated

```
[OUTDATED] jones-2023
  page: (none) → "123-145"
  Actions:
  1) Update all changed fields from remote
  2) Skip
```

Default `--fix` behavior updates all changed fields at once. Individual field selection is available via programmatic API (MCP/server) using `update_selected_fields` action with `fields` parameter.

Non-TTY: `--fix` exits with error.

## ILibraryOperations Integration

```typescript
interface CheckOperationOptions {
  identifiers?: string[];
  idType?: IdentifierType;
  all?: boolean;
  searchQuery?: string;
  skipDays?: number;
  save?: boolean;
  metadata?: boolean;  // default: true
}

interface CheckOperationResult {
  results: CheckResult[];
  summary: {
    total: number;
    ok: number;
    warnings: number;
    skipped: number;
  };
}
```

Added to `ILibraryOperations`:

```typescript
check(options: CheckOperationOptions): Promise<CheckOperationResult>;
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success (all OK, or warnings found and reported) |
| `1` | Error (fetch failure, invalid input) |

**Note**: Warnings (retraction, version change) are NOT errors. Exit code 0 even when issues are found — the findings are in the output.

## Examples

```bash
# Check a single reference
ref check Smith-2024

# Check multiple references
ref check Smith-2024 Jones-2023 preprint-2023a

# Check by UUIDs
ref check --uuid 123e4567-e89b-12d3 987fcdeb-51a2-3456

# Check all references
ref check --all

# Check only unchecked or stale (>30 days)
ref check --all --days 30

# Report only, do not save
ref check --all --no-save

# JSON output
ref check --all -o json

# Interactive repair
ref check --all --fix

# Check search results
ref check --search "2024"

# Skip metadata comparison (retraction/concern/version only)
ref check --all --no-metadata
```

## Dependencies

- Crossref REST API (direct HTTP, no additional npm packages)
- PubMed E-utilities (existing infrastructure)
- Existing rate limiter (`src/features/import/rate-limiter.ts`)
