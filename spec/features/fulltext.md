# Full-text Management

## Purpose

Attach and manage PDF and Markdown full-text files associated with references.

## Overview

- Each reference can have one PDF and/or one Markdown file attached
- Files are stored in a dedicated fulltext directory
- Filenames are auto-generated for consistency and uniqueness
- Metadata updates use existing `executeUpdate` infrastructure

## Data Model

Full-text information is stored in the `custom.fulltext` field:

```json
"custom": {
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "fulltext": {
    "pdf": "Smith-2024-PMID12345678-123e4567-e89b-12d3-a456-426614174000.pdf",
    "markdown": "Smith-2024-PMID12345678-123e4567-e89b-12d3-a456-426614174000.md"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `fulltext.pdf` | `string?` | PDF filename (without path) |
| `fulltext.markdown` | `string?` | Markdown filename (without path) |

Both fields are optional and independent (can coexist).

## Configuration

```toml
[fulltext]
directory = "~/.reference-manager/fulltext"
```

| Setting | Default | Description |
|---------|---------|-------------|
| `directory` | `~/.reference-manager/fulltext` | Directory for storing full-text files |

## Filename Generation

### Format

```
{id}[-PMID{PMID}]-{uuid}.{ext}
```

### Rules

1. Always include citation key (`id`)
2. If PMID exists, append `-PMID{PMID}`
3. Always include full UUID
4. Append appropriate extension (`.pdf` or `.md`)

### Examples

| Condition | Filename |
|-----------|----------|
| With PMID | `Smith-2024-PMID12345678-123e4567-e89b-12d3-a456-426614174000.pdf` |
| Without PMID | `Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf` |

### Uniqueness

UUID inclusion guarantees uniqueness; no suffix logic required.

### Stability

Filenames are fixed at creation time. If citation key changes, filename remains unchanged (UUID ensures correct association).

## Commands

### `fulltext attach`

Attach a full-text file to a reference.

```bash
# From file path (format auto-detected by extension)
reference-manager fulltext attach <ref-id> <file-path>

# Explicit format
reference-manager fulltext attach <ref-id> --pdf <file-path>
reference-manager fulltext attach <ref-id> --markdown <file-path>

# From stdin (format required)
cat paper.pdf | reference-manager fulltext attach <ref-id> --pdf
cat paper.md | reference-manager fulltext attach <ref-id> --markdown
```

#### Options

```
--pdf <path>       Attach as PDF
--markdown <path>  Attach as Markdown
--move             Move file instead of copy (default: copy)
--force            Overwrite existing attachment without confirmation
```

#### Behavior

1. **File operation**: Copy (or move with `--move`) to fulltext directory
2. **Metadata update**: Update `custom.fulltext` via `executeUpdate`
3. **Overwrite**: Prompt for confirmation if file already attached (skip with `--force`)

#### Format Detection

| Input | Detection |
|-------|-----------|
| File path with `.pdf` | PDF |
| File path with `.md` | Markdown |
| stdin | Requires `--pdf` or `--markdown` |

### `fulltext get`

Retrieve full-text file path or content.

```bash
# Output file path (default: both if available)
reference-manager fulltext get <ref-id>
reference-manager fulltext get <ref-id> --pdf
reference-manager fulltext get <ref-id> --markdown

# Output content to stdout
reference-manager fulltext get <ref-id> --pdf --stdout
reference-manager fulltext get <ref-id> --markdown --stdout
```

#### Options

```
--pdf        Get PDF file only
--markdown   Get Markdown file only
--stdout     Output file content to stdout instead of path
```

#### Output Format

Default (path mode):
```
pdf: /path/to/fulltext/Smith-2024-PMID12345678-uuid.pdf
markdown: /path/to/fulltext/Smith-2024-PMID12345678-uuid.md
```

With `--stdout`: Raw file content.

### `fulltext detach`

Remove full-text association from a reference.

```bash
reference-manager fulltext detach <ref-id>           # Detach both
reference-manager fulltext detach <ref-id> --pdf     # Detach PDF only
reference-manager fulltext detach <ref-id> --markdown  # Detach Markdown only
```

#### Options

```
--pdf        Detach PDF only
--markdown   Detach Markdown only
--delete     Also delete the file from disk
--force      Skip confirmation when using --delete
```

#### Behavior

- Default: Remove association from metadata only (file remains on disk)
- With `--delete`: Also delete the physical file

## Reference Removal Integration

When removing a reference via `remove` command:

| Condition | Behavior |
|-----------|----------|
| No fulltext attached | Normal removal |
| Fulltext attached | Warn and prompt for confirmation |
| Fulltext + `--force` | Remove reference and delete fulltext files |

## Server Integration

Full-text operations use existing infrastructure:

1. **File operations** (copy/move/delete): CLI handles directly
2. **Metadata updates**: Via `executeUpdate` (works with both direct file access and server mode)

No additional server API endpoints required.

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (reference not found, file not found, etc.) |
| `4` | I/O error (file operation failed) |

## Limitations

### Out of Scope

- Full-text search within PDF/Markdown content
- PDF metadata extraction
- OCR for scanned PDFs
- Thumbnail generation

### Platform Notes

- **Windows**: Total path length may be limited to 260 characters
  - Recommendation: Use a short fulltext directory path
  - Example: `C:\refs\fulltext` instead of deep user directories

## Examples

```bash
# Attach PDF to a reference
reference-manager fulltext attach Smith-2024 ~/Downloads/paper.pdf

# Attach Markdown from stdin
cat notes.md | reference-manager fulltext attach Smith-2024 --markdown

# Get PDF path
reference-manager fulltext get Smith-2024 --pdf
# Output: /home/user/.reference-manager/fulltext/Smith-2024-PMID12345678-uuid.pdf

# Output PDF content to stdout (e.g., for piping to another tool)
reference-manager fulltext get Smith-2024 --pdf --stdout | less

# Detach Markdown but keep file
reference-manager fulltext detach Smith-2024 --markdown

# Detach and delete PDF
reference-manager fulltext detach Smith-2024 --pdf --delete

# Remove reference with fulltext (force)
reference-manager remove Smith-2024 --force
```
