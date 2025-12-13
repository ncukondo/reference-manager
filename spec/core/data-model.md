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

- Stored in `custom.uuid` field
- Format:
  ```json
  "custom": {
    "uuid": "<uuid>",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "additional_urls": ["https://example.com/resource"]
  }
  ```
- `uuid` field:
  - Used for internal identity
  - Used for 3-way merge
  - Generated at load time if missing or invalid
- `timestamp` field:
  - ISO 8601 format timestamp
  - Records when the reference was first added to the library
  - Generated at load time if missing or invalid
- `additional_urls` field:
  - Optional array of additional URLs related to the reference
  - Each element is a string representing a URL
