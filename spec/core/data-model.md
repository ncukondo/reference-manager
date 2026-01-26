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
  "additional_urls": ["https://example.com/resource"],
  "tags": ["review", "important"],
  "attachments": {
    "directory": "Smith-2024-PMID12345678-<uuid-prefix>",
    "files": [
      { "filename": "fulltext.pdf", "role": "fulltext", "format": "pdf" },
      { "filename": "fulltext.md", "role": "fulltext", "format": "markdown" },
      { "filename": "supplement-table-s1.xlsx", "role": "supplement", "format": "xlsx", "label": "Table S1" }
    ]
  }
}
```

| Field | Purpose |
|-------|---------|
| `uuid` | Internal stable identifier for merge |
| `created_at` | Creation time (immutable) |
| `timestamp` | Last modification time (for LWW conflict resolution) |
| `additional_urls` | Optional array of additional URLs |
| `tags` | User-defined tags for categorization (see `features/metadata.md`) |
| `attachments` | Attached files (see `features/attachments.md`) |
| `attachments.directory` | Per-reference directory name |
| `attachments.files` | Array of attached file metadata |

### Unknown Fields (Passthrough)

Unknown keys in the `custom` field are preserved:

- **Read**: Ignored by reference-manager, but kept in memory
- **Write**: Preserved as-is in output

This ensures:
- Compatibility with external tools (e.g., Zotero)
- Forward compatibility with future versions
- User-added custom data is not lost

## Standard Metadata Fields

| Field | Format | Notes |
|-------|--------|-------|
| `DOI` | `10.xxxx/...` | Normalized on read/write |
| `PMID` | Numeric string | e.g., `"12345678"` |
| `PMCID` | `PMC` + number | Normalized with prefix |
| `ISBN` | 10 or 13 digits | Normalized: hyphens removed, X uppercase |
| `URL` | URL string | Primary URL |
| `keyword` | Semicolon-separated string | Parsed to array in memory |

## Operation Results

### UpdateResult

Result of a reference update operation:

```typescript
interface UpdateResult {
  updated: boolean;
  item?: CslItem;
  idChanged?: boolean;
  newId?: string;
  errorType?: 'not_found' | 'id_collision';
}
```

| Field | Description |
|-------|-------------|
| `updated` | `true` if data was actually changed |
| `item` | The item (returned when reference is found, regardless of changes) |
| `idChanged` | `true` if ID was changed due to collision resolution |
| `newId` | The new ID after collision resolution |
| `errorType` | Error type: `'not_found'` or `'id_collision'` |

**State interpretation:**

| State | updated | item | errorType |
|-------|---------|------|-----------|
| Changed | `true` | present | - |
| No changes | `false` | present | - |
| Not found | `false` | - | `'not_found'` |
| ID collision | `false` | - | `'id_collision'` |

### Change Detection

Updates only occur when data actually changes:

- **Changed fields**: Comparison excludes `custom.timestamp`, `custom.uuid`, `custom.created_at`
- **No changes**: Returns `updated: false` with `item` present
- **timestamp**: Only updated when actual changes are made
