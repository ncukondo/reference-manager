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
  "custom": "reference_manager_uuid=<uuid>"
  ```
- Used for:
  - Internal identity
  - 3-way merge
- Generated at load time if missing or invalid
