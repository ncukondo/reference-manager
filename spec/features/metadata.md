# Metadata Fields

## DOI

- Stored in standard `DOI` field
- Normalized to:
  ```
  10.xxxx/...
  ```
- Normalized on read and write

## URL

- Stored in standard `URL` field (top-level CSL-JSON field)
- Format: string containing a valid URL
- Example:
  ```json
  "URL": "https://example.com/article"
  ```
- Primary URL for the reference (additional URLs can be stored in `custom.additional_urls`)

## PMID

- Stored in standard `PMID` field (top-level CSL-JSON field per CSL 1.0.2 spec)
- Format: string containing numeric PMID
- Example:
  ```json
  "PMID": "12345678"
  ```

## PMCID

- Stored in standard `PMCID` field (top-level CSL-JSON field)
- Format: string containing PMCID (with or without "PMC" prefix)
- Normalized to include "PMC" prefix on read and write
- Example:
  ```json
  "PMCID": "PMC12345678"
  ```

## Keyword

- Stored in standard `keyword` field (top-level CSL-JSON field)
- **CSL-JSON file format**: string with semicolon-separated keywords
- **In-memory format**: array of strings
- Example (CSL-JSON file):
  ```json
  "keyword": "machine learning; deep learning; neural networks"
  ```
- Example (in-memory):
  ```typescript
  keyword: ["machine learning", "deep learning", "neural networks"]
  ```
- Conversion rules:
  - **Parsing (file → memory)**: Split by semicolon (`;`), trim whitespace from each keyword, remove empty strings
  - **Serialization (memory → file)**: Join array elements with `"; "` (semicolon + space)
- Empty keyword arrays serialize to undefined (field omitted from CSL-JSON)

## arXiv ID

- Stored in `custom.arxiv_id` field
- Format: string containing arXiv identifier (e.g. `"2301.13867"`, `"2301.13867v2"`)
- Version suffixes are preserved as-is
- Example:
  ```json
  "custom": {
    "arxiv_id": "2301.13867v2"
  }
  ```
- When a journal DOI is available, `DOI` field holds the journal DOI; arXiv ID is stored separately in `custom.arxiv_id`
- When no journal DOI exists, `DOI` field holds the arXiv DOI (`10.48550/arXiv.<id>`)
- `URL` field is set to `https://arxiv.org/abs/<id>` for quick access

## Custom Metadata

- Stored in `custom` field as an object
- Contains reference-manager-specific metadata
- Structure:
  ```json
  "custom": {
    "uuid": "123e4567-e89b-12d3-a456-426614174000",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "additional_urls": [
      "https://example.com/resource1",
      "https://example.com/resource2"
    ],
    "tags": ["review", "important", "to-read"],
    "arxiv_id": "2301.13867",
    "attachments": {
      "directory": "Smith-2024-PMID12345678-123e4567",
      "files": [
        { "filename": "fulltext.pdf", "role": "fulltext" },
        { "filename": "fulltext.md", "role": "fulltext" }
      ]
    },
    "check": {
      "checked_at": "2024-06-01T00:00:00.000Z",
      "status": "ok",
      "findings": []
    }
  }
  ```
- Fields:
  - `uuid`: Internal stable identifier (required, auto-generated)
  - `timestamp`: ISO 8601 timestamp when reference was added (required, auto-generated)
  - `additional_urls`: Optional array of additional URLs (optional)
  - `tags`: User-defined tags for categorization and search (optional, array of strings)
  - `arxiv_id`: arXiv identifier (optional, e.g. `"2301.13867"`)
  - `attachments`: Attachment metadata (optional, see `attachments.md`)
    - `directory`: Directory name relative to attachments base
    - `files`: Array of `{ filename, role, label? }` objects
  - `check`: Check result data (optional, see `check.md`)
    - `checked_at`: ISO 8601 timestamp of last check
    - `status`: Check status (`"ok"`, `"retracted"`, `"warning"`, etc.)
    - `findings`: Array of finding objects
- All typed fields are optional and validated by zod schema
- Unknown fields are preserved (passthrough) for external tool compatibility

## Tags

- Stored in `custom.tags` field
- Format: array of strings (stored as JSON array, not semicolon-separated like `keyword`)
- Example:
  ```json
  "custom": {
    "tags": ["review", "important", "RNA-seq"]
  }
  ```
- Search: Use `tag:` prefix or include in multi-field search (see `search.md`)
- Empty arrays are omitted from serialized output
