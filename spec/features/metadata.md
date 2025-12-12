# Metadata Fields

## DOI

- Stored in standard `DOI` field
- Normalized to:
  ```
  10.xxxx/...
  ```
- Normalized on read and write

## PMID

- Stored in standard `PMID` field (top-level CSL-JSON field per CSL 1.0.2 spec)
- Format: string containing numeric PMID
- Example:
  ```json
  "PMID": "12345678"
  ```
