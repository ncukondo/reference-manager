# Metadata Fields

## DOI

- Stored in standard `DOI` field
- Normalized to:
  ```
  10.xxxx/...
  ```
- Normalized on read and write

## PMID

- Stored in `note`
- Canonical form:
  ```
  PMID:12345678
  ```

Parsing tolerance:
- Case-insensitive
- `PMID 12345678`, `PMID=12345678` accepted
- Multiple PMIDs allowed
