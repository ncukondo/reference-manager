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
    "fulltext": {
      "pdf": "Smith-2024-PMID12345678-123e4567-e89b-12d3-a456-426614174000.pdf",
      "markdown": "Smith-2024-PMID12345678-123e4567-e89b-12d3-a456-426614174000.md"
    }
  }
  ```
- Fields:
  - `uuid`: Internal stable identifier (required, auto-generated)
  - `timestamp`: ISO 8601 timestamp when reference was added (required, auto-generated)
  - `additional_urls`: Optional array of additional URLs (optional)
  - `fulltext`: Attached full-text files (optional, see `fulltext.md`)
    - `pdf`: PDF filename in fulltext directory
    - `markdown`: Markdown filename in fulltext directory
- Unknown fields are preserved (passthrough) for external tool compatibility
