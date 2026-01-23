# ADR-013: Attachments Architecture for File Management

Date: 2025-01-24

## Status

Accepted

## Context

The reference manager needs to support attaching files to references beyond just PDF and Markdown full-text documents. Users require:

1. **Supplementary materials**: Official supplements accompanying papers (tables, figures, datasets)
2. **User-created notes**: Summaries and analysis documents too large for the `note` field
3. **Draft versions**: Different versions of papers (initial submission, revised, etc.)
4. **Custom file types**: Slides, posters, code, and other research artifacts

### Problems with Original Design

The original `fulltext` implementation had limitations:

```json
"custom": {
  "fulltext": {
    "pdf": "Smith-2024-PMID12345678-uuid.pdf",
    "markdown": "Smith-2024-PMID12345678-uuid.md"
  }
}
```

1. **Limited to two files**: Only one PDF and one Markdown per reference
2. **No categorization**: Cannot distinguish between paper body and supplements
3. **Flat directory structure**: All files in single directory, hard to manage manually
4. **No extensibility**: Adding new file types requires schema changes

### Requirements

1. Support multiple files per reference with flexible categorization
2. Enable manual file management (drag-and-drop to directories)
3. Maintain `fulltext` command for backward compatibility in user experience
4. Support cross-platform file opening (macOS, Linux, Windows, WSL)
5. Pre-release phase: no backward compatibility constraints

## Decision

Replace the `fulltext` data model with a comprehensive `attachments` system featuring per-reference directories and a flexible role-based categorization scheme.

### Data Model

```json
"custom": {
  "attachments": {
    "directory": "Smith-2024-PMID12345678-123e4567",
    "files": [
      { "filename": "fulltext.pdf", "role": "fulltext", "format": "pdf" },
      { "filename": "fulltext.md", "role": "fulltext", "format": "markdown" },
      { "filename": "supplement-table-s1.xlsx", "role": "supplement", "format": "xlsx", "label": "Table S1" },
      { "filename": "notes.md", "role": "notes", "format": "markdown" },
      { "filename": "slides-conference.pdf", "role": "slides", "format": "pdf", "label": "Conference 2024" }
    ]
  }
}
```

### Directory Structure

Per-reference directories instead of flat structure:

```
attachments/
├── Smith-2024-PMID12345678-123e4567/
│   ├── fulltext.pdf
│   ├── fulltext.md
│   ├── supplement-table-s1.xlsx
│   └── notes.md
└── Jones-2023-b5c6d7e8/
    ├── fulltext.pdf
    └── notes-chapter1.md
```

### Directory Naming Convention

```
{id}[-PMID{pmid}]-{uuid-prefix}/
```

- `id`: Citation key (guaranteed unique within library)
- `pmid`: PMID if available (aids identification)
- `uuid-prefix`: First 8 characters of UUID

#### UUID Prefix Rationale

Full UUID v4 is 36 characters (`123e4567-e89b-12d3-a456-426614174000`), which makes directory names unwieldy. Analysis of UUID v4 structure:

| Portion | Bits | Fixed/Random |
|---------|------|--------------|
| Total | 128 | - |
| Version (position 13) | 4 | Fixed (`4`) |
| Variant (position 17) | 2 | Fixed (`10xx`) |
| **Random** | **122** | Random |

The first 8 characters (32 bits) are entirely random, providing ~4.3 billion unique values. Since `id` is already unique within the library, the UUID prefix serves as:

1. **Correlation aid**: Links directory to reference metadata
2. **Debugging helper**: Quickly identify reference from directory name
3. **Future-proofing**: Enables tracking if id changes

Collision between UUID prefixes is irrelevant because different `id` values produce different directory names regardless of UUID prefix.

### Role System

#### Reserved Roles

| Role | Description | Constraints |
|------|-------------|-------------|
| `fulltext` | Paper body (PDF/Markdown) | Max 2 files (1 PDF + 1 Markdown) |
| `supplement` | Official supplementary materials | Multiple allowed |
| `notes` | User-created notes/summaries | Multiple allowed |
| `draft` | Draft versions, revisions | Multiple allowed |

#### Custom Roles

Any string not matching reserved roles is accepted:

- Examples: `slides`, `poster`, `code`, `data`, `review`
- No constraints on count or format
- Enables user-defined workflows without schema changes

### File Naming Convention

```
{role}[-{label-slug}].{ext}
```

Examples:
- `fulltext.pdf`
- `supplement-table-s1.xlsx`
- `notes-reading-analysis.md`
- `slides-conference-2024.pdf`

This convention enables:
1. **Role inference**: `attach sync` can detect manually added files
2. **Human readability**: Clear purpose from filename
3. **Uniqueness**: Role + label combination ensures unique names within directory

### Command Structure

#### `fulltext` Command (Shorthand)

Preserved for common paper operations:

```bash
ref fulltext attach <id> paper.pdf
ref fulltext open <id>
ref fulltext get <id> --pdf
ref fulltext detach <id>
```

Internally maps to `attach` operations with `--role fulltext`.

#### `attach` Command (Full Control)

General-purpose attachment management:

```bash
# Open directory (interactive mode in TTY)
ref attach open <id>                    # TTY: interactive mode with auto-sync
ref attach open <id> --no-sync          # Skip interactive sync
ref attach open <id> <filename>         # Opens specific file
ref attach open <id> --role notes       # Opens file by role

# Add files
ref attach add <id> file.xlsx --role supplement --label "Table S1"

# List attachments
ref attach list <id>
ref attach list <id> --role supplement

# Sync manually added files
ref attach sync <id>
ref attach sync <id> --yes

# Remove files
ref attach detach <id> <filename>
ref attach detach <id> --role draft --all
```

#### Interactive Mode (`attach open` in TTY)

When `attach open <id>` is executed in a TTY environment without specifying a filename:

1. Display file naming convention guide
2. Create directory if not exists
3. Open directory in system file manager
4. Wait for user to press Enter
5. Automatically scan and sync new files to metadata

This streamlines the manual file addition workflow into a single command:

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

[User adds files via file manager, then presses Enter]

Scanning directory...

Found 2 new files:
  ✓ supplement-data.csv → role: supplement, label: "data"
  ✓ notes.md → role: notes

Updated metadata for Smith-2024.
```

In non-TTY environments or with `--no-sync`, only the directory is opened.

### Platform Support for File Opening

| Platform | Command | Notes |
|----------|---------|-------|
| macOS | `open` | Native, handles files and directories |
| Linux | `xdg-open` | Requires desktop environment |
| Windows | `cmd /c start ""` | Native support |
| WSL | `wslview` | From `wslu` package, opens in Windows |

#### WSL Detection

```typescript
function isWSL(): boolean {
  return process.platform === "linux" &&
    (process.env.WSL_DISTRO_NAME !== undefined ||
     fs.existsSync("/proc/sys/fs/binfmt_misc/WSLInterop"));
}
```

#### WSL Rationale

WSL users expect files to open in Windows applications. Options considered:

1. **`explorer.exe` + `wslpath`**: Requires path conversion, more complex
2. **`wslview`**: Handles path conversion automatically, cleaner interface

`wslview` from the `wslu` package is the standard solution and is pre-installed on many WSL distributions. If unavailable, the error message guides installation: `sudo apt install wslu`.

### Sync Command for Manual File Management

Users can manually add files to attachment directories. The `sync` command detects and registers them:

```bash
$ ref attach sync Smith-2024

Found 2 new files:
  supplement-data.csv → role: supplement, label: "data"
  my-notes.md → role: other, label: "my-notes"

Run with --yes to add new files
```

Role inference from filename patterns:

| Pattern | Inferred Role |
|---------|---------------|
| `fulltext.{pdf,md}` | fulltext |
| `supplement-{label}.ext` | supplement |
| `notes-{label}.ext` | notes |
| `draft-{label}.ext` | draft |
| `{custom}-{label}.ext` | {custom} |

## Rationale

### Per-Reference Directories vs. Role-Based Directories

**Considered alternatives:**

1. **Role-based directories**: `attachments/fulltext/`, `attachments/supplement/`, etc.
2. **Per-reference directories**: `attachments/Smith-2024-uuid/`
3. **Hybrid**: `attachments/Smith-2024-uuid/fulltext/`, etc.

**Decision: Per-reference directories**

| Criterion | Role-based | Per-reference | Hybrid |
|-----------|------------|---------------|--------|
| "Show all files for paper X" | Multiple dirs | Single dir | Single dir |
| "Show all PDFs" | Single dir | Scan all | Scan all |
| Manual file management | Scattered | Intuitive | Complex |
| Directory deletion on remove | Multiple ops | Single op | Single op |
| Filesystem depth | Shallow | Shallow | Deep |

User's primary operation unit is the reference, not the file type. Per-reference directories align with this mental model.

### Reserved Roles with Custom Extension

**Considered alternatives:**

1. **Fixed enum**: Only predefined roles allowed
2. **Free-form strings**: Any role name accepted
3. **Reserved + custom**: Predefined roles with special handling, plus arbitrary custom roles

**Decision: Reserved + custom**

- Reserved roles (`fulltext`, `supplement`, `notes`, `draft`) have enforced constraints
- Custom roles enable user workflows without schema changes
- Future commonly-used custom roles can be "promoted" to reserved status

### Preserving `fulltext` Command

**Considered alternatives:**

1. **Replace with `attach`**: Single command for all operations
2. **Keep `fulltext`**: Dedicated command for paper body operations
3. **Alias**: `fulltext` as alias for `attach --role fulltext`

**Decision: Keep `fulltext` as dedicated command**

- Most common operation (attaching/opening papers) remains simple
- Clear semantic distinction: `fulltext` = paper body, `attach` = everything else
- User experience continuity

## Consequences

### Positive

- Unlimited files per reference with flexible categorization
- Intuitive manual file management via file manager
- Extensible without schema changes (custom roles)
- Cross-platform file opening including WSL
- Sync command enables hybrid CLI/GUI workflow
- Clear separation: `fulltext` for papers, `attach` for everything

### Negative

- More complex data model than original `fulltext`
- Directory management overhead (create/delete/rename)
- Sync command adds complexity for edge cases
- WSL support requires external package (`wslu`)

### Neutral

- Configuration key changes: `fulltext.directory` → `attachments.directory`
- Existing `fulltext` command interface largely unchanged
- File opening implementation shared between commands

## Implementation Notes

### Migration

Not required (pre-release phase, no existing users with data to migrate).

### Directory Lifecycle

| Event | Action |
|-------|--------|
| First attachment added | Create directory |
| `attach open <id>` called | Create directory if not exists (enables manual file addition) |
| Last attachment removed | Delete directory |
| Reference id/PMID changed | Rename directory, update metadata |
| Reference removed | Delete directory (with `--force`) |

The `attach open` command creates the directory even if no attachments exist yet. This enables the workflow:

1. `ref attach open Smith-2024` → Creates and opens empty directory
2. User drags files into directory via file manager
3. `ref attach sync Smith-2024 --yes` → Registers files in metadata

### Error Handling

- Missing `wslview` on WSL: Suggest installation command
- Directory already exists with different UUID: Error (indicates data inconsistency)
- File already exists: Prompt for overwrite (or `--force`)

## References

- [UUID v4 Specification (RFC 4122)](https://datatracker.ietf.org/doc/html/rfc4122)
- [wslu - Windows Subsystem for Linux Utilities](https://github.com/wslutilities/wslu)
- [XDG Base Directory Specification](https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html)
