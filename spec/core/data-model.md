# Data Model

## Canonical File

- Single CSL-JSON file (array of items)
- Example: `library.csl.json`
- No non-standard top-level extensions

## Identifiers

### CSL-JSON `id` (Citation Key)

- Serves as Pandoc citation key and BibTeX key equivalent
- Must be unique within library
- Human-readable, BibTeX-compatible (ASCII letters, digits, hyphens, underscores)

**Generation Format:**
```
<FirstAuthorFamily>-<Year>[-<TitleSlug>][<suffix>]
```

**Generation Rules:**
- First author family name (ASCII only)
- Year from `issued.date-parts`
- Title slug: first 32 chars, non-ASCII dropped (used when author or year missing)
- Collision suffix: `a`, `b`, ... `z`, `aa`, `ab`, ...

**Fallbacks:**
- No author → `Anon-<Year>-<TitleSlug>`
- No year → `<Author>-nd-<TitleSlug>`
- No title and no year → `<Author>-nd-Untitled`

### Internal UUID

Stored in `custom.uuid` field:
- Used for internal identity and 3-way merge
- Generated at load time if missing or invalid
- Not relied on for Pandoc citation

## Custom Metadata

The `custom` field stores reference-manager-specific metadata:

```json
"custom": {
  "uuid": "<uuid>",
  "created_at": "2024-01-01T00:00:00.000Z",
  "timestamp": "2024-01-02T10:30:00.000Z",
  "additional_urls": ["https://example.com/resource"]
}
```

| Field | Purpose |
|-------|---------|
| `uuid` | Internal stable identifier for merge |
| `created_at` | Creation time (immutable) |
| `timestamp` | Last modification time (for LWW conflict resolution) |
| `additional_urls` | Optional array of additional URLs |

## Standard Metadata Fields

| Field | Format | Notes |
|-------|--------|-------|
| `DOI` | `10.xxxx/...` | Normalized on read/write |
| `PMID` | Numeric string | e.g., `"12345678"` |
| `PMCID` | `PMC` + number | Normalized with prefix |
| `URL` | URL string | Primary URL |
| `keyword` | Semicolon-separated string | Parsed to array in memory |
