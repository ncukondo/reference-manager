# Attachments Management

## Purpose

Attach and manage files associated with references: full-text documents, supplementary materials, notes, drafts, and custom file types.

## Overview

- Each reference can have multiple attached files organized by role
- Files are stored in per-reference directories
- Supports reserved roles (fulltext, supplement, notes, draft) and custom roles
- `fulltext` command provides shorthand for paper-related operations
- `attach` command provides full control over all attachments

## Data Model

Attachment information is stored in the `custom.attachments` field:

```json
"custom": {
  "uuid": "123e4567-e89b-12d3-a456-426614174000",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "attachments": {
    "directory": "Smith-2024-PMID12345678-123e4567",
    "files": [
      { "filename": "fulltext.pdf", "role": "fulltext" },
      { "filename": "fulltext.md", "role": "fulltext" },
      { "filename": "supplement-table-s1.xlsx", "role": "supplement", "label": "Table S1" },
      { "filename": "notes.md", "role": "notes" },
      { "filename": "draft-v1.pdf", "role": "draft", "label": "v1" },
      { "filename": "slides-conference.pdf", "role": "slides", "label": "Conference 2024" }
    ]
  }
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `attachments.directory` | `string` | Yes | Directory name (relative to attachments base) |
| `attachments.files` | `array` | Yes | List of attached files |
| `files[].filename` | `string` | Yes | Filename (without path) |
| `files[].role` | `string` | Yes | Role identifier |
| `files[].label` | `string` | No | Human-readable label |

### Roles

#### Reserved Roles

| Role | Description | Constraints |
|------|-------------|-------------|
| `fulltext` | Paper body (PDF and/or Markdown) | Max 2 files (one PDF + one Markdown) |
| `supplement` | Official supplementary materials | Multiple allowed, any format |
| `notes` | User-created notes/summaries | Multiple allowed, any format |
| `draft` | Draft versions, revisions | Multiple allowed, any format |

#### Custom Roles

Any string not matching reserved roles is allowed as a custom role:
- `slides`, `poster`, `code`, `data`, `review`, etc.
- No constraints on count or format
- Enables user-defined workflows

## Directory Structure

### Base Directory

```toml
[attachments]
# directory defaults to {data}/attachments (platform-specific data directory)
```

### Per-Reference Directories

```
attachments/
├── Smith-2024-PMID12345678-123e4567/
│   ├── fulltext.pdf
│   ├── fulltext.md
│   ├── supplement-table-s1.xlsx
│   ├── notes.md
│   └── slides-conference.pdf
└── Jones-2023-b5c6d7e8/
    ├── fulltext.pdf
    └── notes-chapter1.md
```

### Directory Name Format

```
{id}[-PMID{pmid}]-{uuid-prefix}/
```

- `id`: Citation key
- `pmid`: PMID if available
- `uuid-prefix`: First 8 characters of UUID (sufficient for uniqueness within library)

Examples:
- With PMID: `Smith-2024-PMID12345678-123e4567/`
- Without PMID: `Smith-2024-123e4567/`

### File Name Format

```
{role}[-{label-slug}].{ext}
```

- `role`: Role identifier
- `label-slug`: Slugified label (optional, filesystem-safe)
- `ext`: File extension

Examples:
- `fulltext.pdf`
- `fulltext.md`
- `supplement-table-s1.xlsx`
- `notes-reading-analysis.md`
- `draft-v1.pdf`

### Directory Lifecycle

| Event | Action |
|-------|--------|
| First file attached | Create directory |
| `attach open <id>` called | Create directory if not exists |
| Last file detached | Delete directory |
| ID or PMID changed | Rename directory, update metadata |

**Manual file addition workflow (non-TTY):**

1. `ref attach open Smith-2024` → Creates and opens directory (even if empty)
2. User drags files into directory via file manager
3. `ref attach sync Smith-2024 --yes` → Registers files in metadata

**Manual file addition workflow (TTY - interactive):**

1. `ref attach open Smith-2024` → Shows naming convention, creates and opens directory
2. User drags files into directory via file manager (any filename is acceptable)
3. User presses Enter in terminal
4. Files matching naming convention are auto-registered
5. Files with non-standard names trigger interactive role assignment and optional rename

## Commands

### `fulltext` Command (Paper Shorthand)

Shorthand for `attach` operations with `--role fulltext`.

#### `fulltext attach`

```bash
# From file path (format auto-detected)
ref fulltext attach <ref-id> <file-path>

# Explicit format
ref fulltext attach <ref-id> --pdf <file-path>
ref fulltext attach <ref-id> --markdown <file-path>

# From stdin
cat paper.pdf | ref fulltext attach <ref-id> --pdf
```

**Options:**
```
--pdf <path>       Attach as PDF
--markdown <path>  Attach as Markdown
--move             Move file instead of copy (default: copy)
--force            Overwrite existing attachment
```

#### `fulltext get`

```bash
ref fulltext get <ref-id>                    # Both paths
ref fulltext get <ref-id> --pdf              # PDF path only
ref fulltext get <ref-id> --markdown         # Markdown path only
ref fulltext get <ref-id> --pdf --stdout     # Output content
```

#### `fulltext open`

```bash
ref fulltext open <ref-id>                   # Open PDF (or Markdown if no PDF)
ref fulltext open <ref-id> --pdf             # Open PDF
ref fulltext open <ref-id> --markdown        # Open Markdown
```

**File Priority (when format not specified):**

| State | Behavior |
|-------|----------|
| PDF only | Open PDF |
| Markdown only | Open Markdown |
| Both exist | Open PDF |
| Neither exists | Error |

#### `fulltext detach`

```bash
ref fulltext detach <ref-id>                 # Detach both
ref fulltext detach <ref-id> --pdf           # Detach PDF only
ref fulltext detach <ref-id> --markdown      # Detach Markdown only
ref fulltext detach <ref-id> --delete        # Also delete files
```

### `attach` Command (General Purpose)

Full control over all attachments.

#### `attach open`

```bash
# Open attachments directory (interactive mode in TTY)
ref attach open <ref-id>

# Open specific file
ref attach open <ref-id> <filename>
ref attach open <ref-id> --role notes

# Output path instead of opening
ref attach open <ref-id> --print
ref attach open <ref-id> <filename> --print

# Skip interactive mode
ref attach open <ref-id> --no-sync
```

**Options:**
```
--print      Output path instead of opening
--role       Open file by role
--no-sync    Skip interactive sync prompt (TTY only)
```

**Behavior (directory mode, no filename specified):**

| Environment | Behavior |
|-------------|----------|
| TTY | Interactive mode: show convention, open directory, wait for Enter, auto-sync |
| Non-TTY | Open directory only |
| TTY + `--no-sync` | Open directory only (skip interactive sync) |

**TTY Interactive Mode:**

```
$ ref attach open Smith-2024

Opening attachments directory for Smith-2024...

File naming convention:
  fulltext.pdf / fulltext.md    - Paper body
  supplement-{label}.ext        - Supplementary materials
  notes-{label}.ext             - Your notes
  draft-{label}.ext             - Draft versions
  {custom}-{label}.ext          - Custom role

Directory: ~/.local/share/reference-manager/attachments/Smith-2024-PMID12345678-123e4567/

Press Enter when done editing...
```

*User edits files in file manager, then presses Enter*

```
Scanning directory...

Found 2 new files:
  ✓ supplement-data.csv → role: supplement, label: "data"
  ✓ notes.md → role: notes

Updated metadata for Smith-2024.
```

*If non-standard filenames are detected, interactive role assignment is triggered:*

```
Scanning directory...

  ✓ supplement-data.csv → role: supplement, label: "data"

  mmc1.pdf → role: unknown (suggested: supplement)
  Assign role for mmc1.pdf:
    [1] fulltext
    [2] supplement (suggested)
    [3] notes
    [4] draft
    [5] other
  > 2
  Label (optional, Enter to skip):

  Rename mmc1.pdf → supplement.pdf? (y/N) y

Updated metadata for Smith-2024.
```

**File mode behavior:**
- With filename: Opens the specified file
- With filename or role: Opens the specified file

#### `attach add`

```bash
ref attach add <ref-id> <file-path> --role <role> [--label <label>]
```

**Options:**
```
--role <role>      Role for the file (required)
--label <label>    Human-readable label (optional)
--move             Move instead of copy
--force            Overwrite existing
```

**Examples:**
```bash
ref attach add Smith-2024 supp.xlsx --role supplement --label "Table S1"
ref attach add Smith-2024 notes.md --role notes
ref attach add Smith-2024 slides.pdf --role slides --label "Conference 2024"
```

#### `attach list`

```bash
ref attach list <ref-id>                     # All attachments
ref attach list <ref-id> --role supplement   # Filter by role
```

**Output format:**
```
Attachments for Smith-2024 (Smith-2024-PMID12345678-123e4567/):

fulltext:
  fulltext.pdf
  fulltext.md

supplement:
  supplement-table-s1.xlsx - "Table S1"

notes:
  notes.md
```

#### `attach get`

```bash
ref attach get <ref-id> <filename>           # Get file path
ref attach get <ref-id> <filename> --stdout  # Output content
```

#### `attach detach`

```bash
ref attach detach <ref-id> <filename>        # Detach specific file
ref attach detach <ref-id> --role draft --all  # Detach all files of role
ref attach detach <ref-id> --role draft --all --delete  # Also delete
```

#### `attach sync`

Synchronize metadata with files on disk.

```bash
ref attach sync <ref-id>                     # Show diff (dry-run)
ref attach sync <ref-id> --yes               # Apply changes
ref attach sync <ref-id> --fix               # Remove missing files from metadata
ref attach sync --all                        # Sync all references
```

**Behavior:**

1. Scan directory for files not in metadata
2. Infer role/label from filename pattern
3. For ambiguous files (role = "other"), apply context-based suggestion and/or interactive prompt
4. Report or apply changes

**Filename inference:**

| Pattern | Inferred Role | Inferred Label |
|---------|---------------|----------------|
| `fulltext.{pdf,md}` | fulltext | - |
| `supplement-{label}.ext` | supplement | {label} |
| `notes-{label}.ext` | notes | {label} |
| `draft-{label}.ext` | draft | {label} |
| `{role}-{label}.ext` | {role} | {label} |
| Other | other | filename |

**Context-based role suggestion (for "other" files):**

When filename inference yields `role: "other"`, the system suggests a more likely role based on context:

| Condition | Suggested Role |
|-----------|---------------|
| `.pdf`/`.md` file, no fulltext attachment exists | fulltext |
| `.pdf`/`.md` file, fulltext already exists | supplement |
| Data file (`.xlsx`, `.csv`, `.tsv`, `.zip`, `.tar.gz`) | supplement |
| Otherwise | other (no suggestion) |

Suggestions are used as default values in interactive prompts and are informational only — they do not override the user's choice.

**Interactive role assignment (TTY only):**

In TTY mode, when new files have ambiguous roles (inferred as "other"), the user is prompted to assign a role:

```
$ ref attach sync Smith-2024

Found 2 new files:
  supplement-data.csv → role: supplement, label: "data"

  mmc1.pdf → role: unknown (suggested: supplement)
  Assign role for mmc1.pdf:
    [1] fulltext
    [2] supplement (suggested)
    [3] notes
    [4] draft
    [5] other
  > 2
  Label (optional, Enter to skip): table-s1

  Rename mmc1.pdf → supplement-table-s1.pdf? (y/N) y

Add new files to metadata? (y/N) y
Changes applied.
```

Files matching the naming convention skip the prompt entirely.

**Rename offer (TTY only):**

After role and label assignment, if the file's current name doesn't match the naming convention (`{role}[-{label}].{ext}`), a rename is offered. If accepted:
- The file is renamed on disk
- Metadata records the new filename

If declined, the file keeps its original name in both disk and metadata.

**Role overrides (programmatic):**

The sync operation accepts optional `roleOverrides` for programmatic callers (scripts, MCP server, HTTP API):
- Key: current filename
- Value: `{ role, label? }`
- Applied when `--yes` is active

**Non-TTY example output:**
```
$ ref attach sync Smith-2024

Found 2 new files:
  supplement-data.csv → role: supplement, label: "data"
  mmc1.pdf → role: other, label: "mmc1"

Missing files (in metadata but not on disk):
  supplement-old.xlsx

(dry-run: no changes made)
Run with --yes to add new files
Run with --fix to remove missing files
```

Non-TTY behavior is unchanged — files are classified by inference only, no interactive prompts.

## Platform Support

### File Opening

| OS | Command | Notes |
|----|---------|-------|
| macOS | `open` | Opens files and directories |
| Linux | `xdg-open` | Requires desktop environment |
| Windows | `cmd /c start ""` | Native support |
| WSL | `wslview` | Opens in Windows (requires wslu package) |

### WSL Detection

WSL is detected by:
- `WSL_DISTRO_NAME` environment variable exists, or
- `/proc/sys/fs/binfmt_misc/WSLInterop` exists

### WSL Notes

- `wslview` from `wslu` package is used
- If not installed, error message suggests: `sudo apt install wslu`
- Paths are automatically handled by wslview

## Configuration

```toml
[attachments]
# directory defaults to {data}/attachments
```

| Setting | Default | Description |
|---------|---------|-------------|
| `directory` | `{data}/attachments` | Base directory for attachments |

## Error Messages

| Situation | Message |
|-----------|---------|
| Reference not found | `Reference not found: Smith-2024` |
| No attachments | `No attachments for reference: Smith-2024` |
| No fulltext attached | `No fulltext attached to reference: Smith-2024` |
| File not found | `Attachment file not found: fulltext.pdf` |
| Role constraint violated | `fulltext role allows max 2 files (1 PDF + 1 Markdown)` |
| Opener not available (WSL) | `wslview not found. Install with: sudo apt install wslu` |
| Opener failed | `Failed to open: /path/to/file` |

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error (reference not found, file not found, etc.) |
| `4` | I/O error (file operation failed) |

## Reference Removal Integration

When removing a reference via `remove` command:

| Condition | Behavior |
|-----------|----------|
| No attachments | Normal removal |
| Has attachments | Warn and prompt for confirmation |
| With `--force` | Remove reference and delete attachment directory |

## Limitations

### Out of Scope

- Full-text search within file content
- PDF metadata extraction
- OCR for scanned PDFs
- Thumbnail generation
- File format conversion

### Platform Notes

- **Windows**: Path length limited to 260 characters
  - Recommendation: Use short base directory path
- **WSL**: Requires `wslu` package for file opening

## Examples

```bash
# === Fulltext (paper) operations ===
ref fulltext attach Smith-2024 ~/Downloads/paper.pdf
ref fulltext attach Smith-2024 ~/Downloads/paper.md
ref fulltext open Smith-2024
ref fulltext get Smith-2024 --pdf

# === Supplement operations ===
ref attach add Smith-2024 table-s1.xlsx --role supplement --label "Table S1"
ref attach add Smith-2024 figure-s2.png --role supplement --label "Figure S2"

# === Notes operations ===
ref attach add Smith-2024 reading-notes.md --role notes --label "Reading Notes"
ref attach add Smith-2024 summary.md --role notes --label "Summary"

# === Custom role ===
ref attach add Smith-2024 slides.pdf --role slides --label "Conference 2024"
ref attach add Smith-2024 poster.pdf --role poster

# === Draft versions ===
ref attach add Smith-2024 draft-v1.pdf --role draft --label "Initial submission"
ref attach add Smith-2024 draft-v2.pdf --role draft --label "Revised"

# === Open attachments directory ===
ref attach open Smith-2024

# === List all attachments ===
ref attach list Smith-2024

# === Sync manually added files ===
ref attach sync Smith-2024 --yes

# === Detach specific file ===
ref attach detach Smith-2024 supplement-table-s1.xlsx

# === Detach all drafts ===
ref attach detach Smith-2024 --role draft --all --delete
```
