# Data Model

## Canonical File

- Single CSL-JSON file (array of items)
- Example:
  ```
  library.csl.json
  ```
- No non-standard top-level extensions

## Identifiers

### CSL-JSON `id`

- Serves as:
  - Pandoc citation key
  - BibTeX-key–equivalent identifier
- Must be unique
- Human-readable, BibTeX-compatible
- Not relied on internally for identity

### Internal Stable Identifier (UUID)

- Stored in `custom` field
- Format:
  ```json
  "custom": {
    "uuid": "<uuid>",
    "created_at": "2024-01-01T00:00:00.000Z",
    "timestamp": "2024-01-02T10:30:00.000Z",
    "additional_urls": ["https://example.com/resource"]
  }
  ```
- `uuid` field:
  - Used for internal identity
  - Used for 3-way merge
  - Generated at load time if missing or invalid
- `created_at` field:
  - ISO 8601 format timestamp
  - **Creation time** - when reference was first added to library
  - Immutable after creation
  - Generated at load time if missing
  - Migrated from legacy `timestamp` field on first load
- `timestamp` field:
  - ISO 8601 format timestamp
  - **Last modification time** - updated on every change
  - Used for Last-Write-Wins conflict resolution in 3-way merge
  - Generated at load time if missing (defaults to `created_at`)
  - Automatically updated when reference is modified
- `additional_urls` field:
  - Optional array of additional URLs related to the reference
  - Each element is a string representing a URL
