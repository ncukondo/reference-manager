# Edit Command

Edit references interactively using an external editor.

## Purpose

Enable users to edit one or more references by opening them in their preferred text editor:
- Direct editing of CSL-JSON fields in human-readable format
- Batch editing of multiple references at once
- Validation and error recovery workflow

## Command Interface

```bash
ref edit <identifier>...
ref edit --uuid <uuid>...
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<identifier>...` | One or more citation keys or UUIDs |

### Options

| Flag | Short | Description |
|------|-------|-------------|
| `--uuid` | | Interpret identifiers as UUIDs |
| `--format <format>` | `-f` | Output format: `yaml` (default), `json` |

### Examples

```bash
# Edit single reference by citation key
ref edit Smith-2024

# Edit multiple references
ref edit Smith-2024 Doe-2023 Johnson-2022

# Edit by UUID
ref edit --uuid 550e8400-e29b-41d4-a716-446655440000

# Edit in JSON format
ref edit Smith-2024 --format json
```

## Behavior

### Editor Selection

Editor resolution order (same as Git):
1. `$VISUAL` environment variable
2. `$EDITOR` environment variable
3. Platform-specific fallback:
   - Linux/macOS: `vi`
   - Windows: `notepad`

### Edit Workflow

1. **Load**: Fetch specified references from library
2. **Serialize**: Convert to YAML (or JSON) with protected fields as comments
3. **Write**: Create temporary file with appropriate extension (`.yaml` or `.json`)
4. **Edit**: Open editor synchronously and wait for exit
5. **Parse**: Read and parse edited content
6. **Validate**: Two-stage validation (see Validation Pipeline)
7. **On error**: Insert error details into file, prompt user (see Validation Error Handling)
   - Re-edit → go to step 4
   - Restore original → go to step 2
   - Abort → go to step 8
8. **Update**: If all valid, update references in library
9. **Cleanup**: Delete temporary file

### YAML Format (Default)

```yaml
# === Protected Fields (do not edit) ===
# uuid: 550e8400-e29b-41d4-a716-446655440000
# created_at: 2024-01-01T00:00:00.000Z
# timestamp: 2024-03-15T10:30:00.000Z
# fulltext:
#   pdf: Smith-2024-PMID12345678-550e8400.pdf
# ========================================

- id: Smith-2024
  type: article-journal
  title: "Machine Learning in Medicine: A Review"
  author:
    - family: Smith
      given: John
    - family: Doe
      given: Jane
  issued: "2024-03-15"
  container-title: Nature Medicine
  volume: "30"
  issue: "3"
  page: "100-120"
  DOI: "10.1038/s41591-024-01234-5"
  PMID: "12345678"
  abstract: |
    This is a multi-line abstract that demonstrates
    how YAML handles long text naturally without
    escaping or special formatting.
  keyword:
    - machine learning
    - deep learning
    - neural networks
  custom:
    tags:
      - review
      - important
    additional_urls:
      - "https://example.com/supplementary"
```

### Field Transformations

The following fields are transformed for better editability:

| Field | Internal Format | Edit Format | Notes |
|-------|-----------------|-------------|-------|
| `issued` | `{ "date-parts": [[2024, 3, 15]] }` | `"2024-03-15"` | ISO 8601 partial date |
| `accessed` | `{ "date-parts": [[2024, 3, 15]] }` | `"2024-03-15"` | ISO 8601 partial date |
| `keyword` | `["a", "b"]` (internal) / `"a; b"` (file) | `["a", "b"]` | YAML array |

**Date format examples:**
- Year only: `"2024"`
- Year-month: `"2024-03"`
- Full date: `"2024-03-15"`

On save, these are converted back to their internal/file formats.

### Validation Pipeline

Two-stage validation is applied after parsing edited content:

**Stage 1 — Edit-format validation (pre-transform):**
- Date fields (`issued`, `accessed`): if present and string, must match `ISO_DATE_REGEX` (`/^\d{4}(-\d{2})?(-\d{2})?$/`)
- Error message: `"Invalid date format (use YYYY, YYYY-MM, or YYYY-MM-DD)"`

**Stage 2 — CSL schema validation (post-transform):**
- After date transformation, validate each item against `CslItemSchema` (Zod)
- Reports Zod error paths and messages (e.g., `author: Expected array, received string`)

Validation is per-item. If ANY item fails, all items are blocked until errors are resolved or user aborts.

### JSON Format

```json
[
  {
    "_protected": {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2024-01-01T00:00:00.000Z",
      "timestamp": "2024-03-15T10:30:00.000Z",
      "fulltext": {
        "pdf": "Smith-2024-PMID12345678-550e8400.pdf"
      }
    },
    "id": "Smith-2024",
    "type": "article-journal",
    "title": "Machine Learning in Medicine: A Review",
    "issued": "2024-03-15",
    "keyword": ["machine learning", "deep learning"]
  }
]
```

Note: In JSON format, protected fields are nested under `_protected` key and ignored on save.
Same field transformations (date, keyword) apply as in YAML format.

### Protected Fields

The following fields are managed internally and cannot be edited:

| Field | Reason |
|-------|--------|
| `custom.uuid` | Internal identifier for merge operations |
| `custom.created_at` | Immutable creation timestamp |
| `custom.timestamp` | Auto-updated on modification |
| `custom.fulltext` | Managed by `fulltext` command |

Changes to protected fields are silently ignored.

### Validation Error Handling

When validation fails after editing, a three-part error recovery flow is triggered:

#### Terminal Display

Shown before the interactive prompt:

```
Validation errors (2 of 3 entries):
  Entry 1 (Smith-2024): issued
  Entry 3 (Doe-2023): author, type

What would you like to do?
❯ Re-edit (errors shown in file)
  Restore original (discard changes)
  Abort (exit without saving)
```

#### YAML Re-edit File Format

When re-editing after validation failure, error details are inserted as comments:

```yaml
# ⚠ Validation Errors (2 of 3 entries)
# ─────────────────────────────────────
# Smith-2024: issued
# Doe-2023: author, type
# ─────────────────────────────────────
---
# ⚠ Errors:
#   issued: Invalid date format (use YYYY, YYYY-MM, or YYYY-MM-DD)
#
# === Protected Fields (do not edit) ===
# uuid: 550e8400-...
- id: Smith-2024
  issued: "hello"
  ...
---
# === Protected Fields (do not edit) ===
# uuid: 661f9500-...
- id: Jones-2024
  ...
---
# ⚠ Errors:
#   author: Expected array, received string
#   type: Required
#
# === Protected Fields (do not edit) ===
# uuid: 772a0600-...
- id: Doe-2023
  author: John
  ...
```

- File top: summary listing which entries have errors and which fields
- Before each errored entry: detailed error messages as `# ⚠ Errors:` comment block
- Entries without errors: no error comments, only protected field comments as usual
- Error comments are stripped on re-parse (existing `#` comment stripping handles this)

#### JSON Re-edit File Format

When re-editing after validation failure, error details are added as `_errors` keys:

```json
[
  {
    "_errors": [
      "issued: Invalid date format (use YYYY, YYYY-MM, or YYYY-MM-DD)"
    ],
    "_protected": { "uuid": "550e8400-..." },
    "id": "Smith-2024",
    "issued": "hello"
  },
  {
    "_protected": { "uuid": "661f9500-..." },
    "id": "Jones-2024"
  },
  {
    "_errors": [
      "author: Expected array, received string",
      "type: Required"
    ],
    "_protected": { "uuid": "772a0600-..." },
    "id": "Doe-2023",
    "author": "John"
  }
]
```

- `_errors` key: array of error message strings, present only on items with errors
- `_errors` is stripped on re-parse (alongside `_protected`)
- No file-level summary in JSON (per-item `_errors` serves this purpose; terminal prompt shows the summary)

#### Prompt Options

| Choice | Behavior |
|--------|----------|
| Re-edit | Re-open editor with current (invalid) content + error annotations |
| Restore original | Overwrite temp file with original content, re-open editor |
| Abort | Exit without saving any changes |

### Multiple References

When editing multiple references:
- All references are placed in a single file as a YAML list (or JSON array)
- Each reference is identified by its `id` field
- References are matched by `custom.uuid` (from protected comments) for updating

## Technical Specifications

### Temporary File

- Location: System temp directory (`os.tmpdir()`)
- Naming: `ref-edit-{timestamp}.{yaml|json}`
- Encoding: UTF-8
- Deleted after successful save or abort

### TTY Requirement

- **Requires TTY** for interactive editing
- Non-TTY environment: Exit with error code 1

```bash
# Works
ref edit Smith-2024

# Error: "Edit command requires a TTY"
echo "data" | ref edit Smith-2024
```

### Editor Invocation

```typescript
import { spawnSync } from 'node:child_process';

spawnSync(editor, [tempFilePath], {
  stdio: 'inherit',  // Connect to terminal
  shell: true,       // Handle editor with arguments
});
```

### UUID Matching

References are matched for update using the UUID from protected comments:
1. Parse protected comment block to extract UUID
2. Match edited content with original by UUID
3. If UUID missing or changed, match by `id` field as fallback

## Configuration

### Config File

```toml
[cli.edit]
default_format = "yaml"    # Default format: yaml, json
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `$VISUAL` | Preferred visual editor |
| `$EDITOR` | Fallback editor |

## Command Result

### EditCommandResult

```typescript
type EditItemState = 'updated' | 'unchanged' | 'not_found' | 'id_collision';

interface EditItemResult {
  id: string;
  state: EditItemState;
  item?: CslItem;      // Current/updated item (when reference is found)
  oldItem?: CslItem;   // Item before update (for diff calculation)
  idChanged?: boolean;  // True if ID was changed due to collision resolution
  newId?: string;       // Resolved ID after collision (when idChanged=true)
}

interface EditCommandResult {
  success: boolean;
  results: EditItemResult[];
  parseError?: string;
  aborted?: boolean;
}
```

### State Descriptions

| State | Description | item | oldItem | idChanged | newId |
|-------|-------------|------|---------|-----------|-------|
| `updated` | Reference was modified | Updated item | Original item | If resolved | Resolved ID |
| `unchanged` | No changes detected | Current item | - | - | - |
| `not_found` | Reference not found in library | - | - | - | - |
| `id_collision` | New ID conflicts with existing (fail mode only) | - | Original item | - | - |

### Change Detection

- Updates only occur when data actually changes
- Comparison excludes protected fields: `custom.timestamp`, `custom.uuid`, `custom.created_at`
- `timestamp` is only updated when actual changes are made

### Output Format

**Text output (with change details):**
```
Updated 2 of 3 references:
  - smith-2024a (was: smith-2024)
    id: smith-2024 → smith-2024a
    title: "Old Title" → "New Title"
  - jones-2023
    author: +1 entry
No changes: 1
  - unchanged-2024
```

When an edited ID collides with an existing ID, it is auto-resolved by appending a suffix (same as `ref add`).
The resolved ID is shown with `(was: <original>)` notation.

**Change detail format:**

| Field Type | Format | Example |
|------------|--------|---------|
| String | `"old" → "new"` | `title: "Old" → "New"` |
| Array (add) | `+N entries` | `author: +1 entry` |
| Array (remove) | `-N entries` | `keyword: -2 entries` |
| Array (mixed) | `+N/-M entries` | `author: +1/-1 entries` |
| Long string | Truncate at 25 chars | `abstract: "Long text..." → "New long..."` |
| Added field | `(added)` | `volume: (added) "10"` |
| Removed field | `(removed)` | `issue: "5" (removed)` |

## Error Handling

| Condition | Behavior |
|-----------|----------|
| Non-TTY environment | Error exit (code 1) |
| Reference not found | Included in results with `state: 'not_found'` |
| ID collision | Auto-resolved with suffix (e.g., `Smith-2020a`); reported via `idChanged`/`newId` |
| No editor configured | Use platform fallback |
| Editor exit non-zero | Prompt: retry, restore, or abort |
| Parse error | Show error, prompt: re-edit, restore, or abort (all items fail) |
| Validation error | Show details in terminal, insert errors in file, prompt: re-edit, restore, or abort |
| Write conflict | Follow write-safety merge protocol |

## Dependencies

- **js-yaml**: YAML parsing and serialization
- **React Ink**: Interactive prompts for error recovery
- **child_process**: Editor invocation

## Related

- `spec/architecture/cli.md` - CLI commands
- `spec/core/data-model.md` - CSL-JSON structure
- `spec/features/write-safety.md` - Write conflict handling
- `spec/guidelines/validation.md` - Zod validation
