# CLI Commands Specification

## 1. `add` Command

### Purpose
Add new reference(s) to the library

### Syntax
```bash
# From stdin
cat data.json | reference-manager add
echo '{"type":"article",...}' | reference-manager add

# From file
reference-manager add <file.json>
```

### Input Format
- **Single reference**: JSON object `{"type": "article", ...}`
- **Multiple references**: JSON array `[{...}, {...}]`
- Accepts both stdin and file path argument

### Duplicate Detection
- **Default behavior**: Reject if duplicate detected
  - Display error message with details:
    - Which existing reference matches
    - Match reason (DOI / PMID / Title+Author+Year)
  - Exit code: 1
- **`--force` / `-f` flag**: Skip duplicate check, force add
  - Allows intentional duplicates
  - Exit code: 0 on success

### ID Collision Handling

When adding a reference, the following checks are performed in order:

1. **Content duplicate detection** (DOI / PMID / Title+Author+Year)
   - If duplicate found:
     - Without `--force`: Reject (exit code 1)
     - With `--force`: Proceed to step 2
   - If no duplicate: Proceed to step 2

2. **ID collision check** (CSL-JSON `id` field)
   - If `id` already exists in library:
     - Append suffix to avoid collision: `a`, `b`, `c`, ..., `z`, `aa`, `ab`, ...
     - Same algorithm as `generateId()` collision handling
     - Log warning: "ID collision detected. Changed 'Smith-2020' to 'Smith-2020a'"
   - If `id` is unique: Use as-is

3. **Add to library**

### ID Suffix Algorithm
- First collision: append `a`
- Second collision: append `b`
- ...
- 26th collision: append `z`
- 27th collision: append `aa`
- 28th collision: append `ab`
- ...

Same pattern as `src/core/identifier/generator.ts`

### Examples

#### Scenario 1: No duplicate, no ID collision
```bash
# Input: {"id": "Smith-2020", "type": "article", ...}
# Existing library: []
# Result: Added as "Smith-2020"
```

#### Scenario 2: Content duplicate detected
```bash
# Input: {"id": "Smith-2020-new", "DOI": "10.1234/existing", ...}
# Existing: {"id": "Smith-2020", "DOI": "10.1234/existing", ...}
# Result (without --force): Error - Duplicate detected (DOI match)
# Result (with --force): Both entries exist with different IDs
```

#### Scenario 3: No content duplicate, but ID collision
```bash
# Input: {"id": "Smith-2020", "DOI": "10.1234/new", ...}
# Existing: {"id": "Smith-2020", "DOI": "10.1234/existing", ...}
# Result: Added as "Smith-2020a" (ID suffix appended)
# Warning: "ID collision detected. Changed 'Smith-2020' to 'Smith-2020a'"
```

#### Scenario 4: Multiple ID collisions
```bash
# Input: {"id": "Smith-2020", ...}
# Existing: ["Smith-2020", "Smith-2020a", "Smith-2020b"]
# Result: Added as "Smith-2020c"
```

### Options
- `--force` / `-f`: Skip duplicate detection
- `--library <path>`: Override library file path
- `--log-level <level>`: Override log level

### Exit Codes
- `0`: Success
- `1`: Duplicate detected (without --force) or validation error
- `3`: Parse error (invalid JSON)
- `4`: I/O error

### Examples
```bash
# Add from stdin
cat article.json | reference-manager add

# Add from file
reference-manager add references.json

# Force add despite duplicates
reference-manager add --force duplicates.json
```

---

## 2. `list` Command

### Purpose
List all references in the library

### Syntax
```bash
reference-manager list [options]
```

### Behavior
- Equivalent to `search` without query (no filtering)
- Returns all references in the library

### Sorting
- **Default**: Registration order (order in CSL-JSON file)
- No custom sort options in initial implementation

### Output Options
Same as `search` command:
- Default: Pretty-printed format
- `--json`: Compact JSON
- `--ids-only`: Only citation keys (CSL-JSON `id` field)
- `--uuid`: Only internal UUIDs
- `--bibtex`: BibTeX format

### Options
- `--json`: JSON output
- `--ids-only`: Output only IDs
- `--uuid`: Output only UUIDs
- `--bibtex`: BibTeX format
- `--library <path>`: Override library file path
- `--log-level <level>`: Override log level

### Mutual Exclusivity
Output format options are **mutually exclusive**. Only one can be specified.

### Exit Codes
- `0`: Success
- `4`: I/O error

### Examples
```bash
# List all (pretty format)
reference-manager list

# List as JSON
reference-manager list --json

# List only IDs
reference-manager list --ids-only
```

---

## 3. `remove` Command

### Purpose
Remove a reference from the library

### Syntax
```bash
# Remove by citation key (CSL-JSON id)
reference-manager remove <identifier>

# Remove by UUID
reference-manager remove --uuid <uuid>
```

### Identifier
- **Default**: CSL-JSON `id` field (citation key, e.g., `Smith-2020-machine`)
- **With `--uuid` flag**: Internal UUID

### Confirmation Prompt
- **Default**: Display confirmation prompt before deletion
  ```
  Remove reference [Smith-2020-machine]?
  Title: Machine Learning for Everyone
  Authors: Smith, J.; Doe, A.
  Continue? (y/N):
  ```
- **`--force` / `-f` flag**: Skip confirmation

### Error Handling
- Reference not found: Error message, exit code 1

### Options
- `--uuid`: Interpret identifier as UUID instead of citation key
- `--force` / `-f`: Skip confirmation prompt
- `--library <path>`: Override library file path
- `--log-level <level>`: Override log level

### Exit Codes
- `0`: Success
- `1`: Reference not found
- `2`: User cancelled (answered 'N' to prompt)
- `4`: I/O error

### Future Enhancement
- Multiple removal: `reference-manager remove <id1> <id2> ...`

### Examples
```bash
# Remove by citation key (with confirmation)
reference-manager remove Smith-2020-machine

# Remove by UUID (skip confirmation)
reference-manager remove --uuid 550e8400-e29b-41d4-a716-446655440000 --force
```

---

## 4. `update` Command

### Purpose
Update fields of an existing reference

### Syntax
```bash
# From stdin
cat update.json | reference-manager update <identifier>

# From file
reference-manager update <identifier> <file.json>
```

### Identifier
- **Default**: CSL-JSON `id` field (citation key)
- **With `--uuid` flag**: Internal UUID

### Update Behavior
- **Partial update**: Only specified fields are updated
- Unspecified fields remain unchanged
- `custom.timestamp` is automatically updated to current time
- `custom.created_at` remains unchanged

### Input Format
JSON object with fields to update:
```json
{
  "title": "Updated Title",
  "abstract": "New abstract text"
}
```

### Validation
- Uses `validateCslItem()` for updated reference
- Invalid updates are rejected with error message

### Options
- `--uuid`: Interpret identifier as UUID
- `--library <path>`: Override library file path
- `--log-level <level>`: Override log level

### Exit Codes
- `0`: Success
- `1`: Reference not found or validation error
- `3`: Parse error (invalid JSON)
- `4`: I/O error

### Future Enhancement
- CLI field options: `--title="..." --abstract="..."`
- Interactive editor integration

### Examples
```bash
# Update from stdin
echo '{"title":"New Title"}' | reference-manager update Smith-2020

# Update from file
reference-manager update Smith-2020 updates.json

# Update by UUID
reference-manager update --uuid 550e8400-... updates.json
```

---

## 5. `server` Command

### Purpose
Manage HTTP server for library access

### Syntax
```bash
# Start server
reference-manager server start [options]

# Stop server
reference-manager server stop

# Check server status
reference-manager server status
```

### Subcommands

#### `start`
Start HTTP server

**Options:**
- `--port <port>`: Specify port number (default: dynamic allocation)
- `--daemon` / `-d`: Run in background (daemon mode)
- `--library <path>`: Override library file path
- `--log-level <level>`: Override log level

**Behavior:**
- Default: Foreground execution
- Writes portfile: `~/.reference-manager/server.port`
- Checks existing portfile before starting
- If server already running: Error message, exit code 1

**Exit Codes:**
- `0`: Server started successfully (daemon mode) or stopped by user (foreground)
- `1`: Server already running or port conflict
- `4`: I/O error

#### `stop`
Stop running server

**Behavior:**
- Reads portfile to find server PID
- Sends termination signal to server process
- Removes portfile

**Exit Codes:**
- `0`: Server stopped successfully
- `1`: Server not running (no portfile or process not found)

#### `status`
Check server status

**Output:**
- If running: Port number, PID, library path
- If not running: "Server not running"

**Exit Codes:**
- `0`: Server is running
- `1`: Server not running

### Examples
```bash
# Start in foreground
reference-manager server start

# Start in background on specific port
reference-manager server start --daemon --port 3000

# Stop server
reference-manager server stop

# Check status
reference-manager server status
```

---

## 6. BibTeX Output Format

### Conversion Rules

#### Citation Key
- Use CSL-JSON `id` field directly (no modification)
- Ensures Pandoc compatibility

#### Entry Type Mapping
| CSL-JSON type | BibTeX entry type |
|---------------|-------------------|
| `article` | `@article` |
| `article-journal` | `@article` |
| `article-magazine` | `@article` |
| `article-newspaper` | `@article` |
| `book` | `@book` |
| `chapter` | `@inbook` |
| `paper-conference` | `@inproceedings` |
| `thesis` | `@phdthesis` |
| `report` | `@techreport` |
| `webpage` | `@misc` |
| Other types | `@misc` |

#### Field Mapping
| CSL-JSON field | BibTeX field | Notes |
|----------------|--------------|-------|
| `title` | `title` | Direct copy |
| `author` | `author` | Convert to "Family, Given" format |
| `issued.date-parts[0][0]` | `year` | Extract year |
| `container-title` | `journal` (article), `booktitle` (proceedings) | Context-dependent |
| `DOI` | `doi` | Direct copy |
| `URL` | `url` | Direct copy |
| `PMID` | `note` | Format: "PMID: 12345678" |
| `PMCID` | `note` | Format: "PMCID: PMC1234567" |
| `volume` | `volume` | Direct copy |
| `issue` | `number` | Direct copy |
| `page` | `pages` | Direct copy |
| `publisher` | `publisher` | Direct copy |
| `abstract` | `abstract` | Direct copy |

#### Author Formatting
CSL-JSON format:
```json
[
  {"family": "Smith", "given": "John"},
  {"family": "Doe", "given": "Alice"}
]
```

BibTeX format:
```
author = {Smith, John and Doe, Alice}
```

#### Undefined Fields
- Fields not present in CSL-JSON: Omitted from BibTeX output
- Required BibTeX fields missing: Generate warning, use placeholder or omit entry

#### Implementation
- Self-implemented (no external BibTeX library dependency)
- Template-based generation for each entry type

### Example Output
```bibtex
@article{Smith-2020-machine,
  title = {Machine Learning for Everyone},
  author = {Smith, John and Doe, Alice},
  year = {2020},
  journal = {Journal of AI},
  volume = {10},
  number = {3},
  pages = {123--145},
  doi = {10.1234/example},
  url = {https://example.com/article},
  note = {PMID: 12345678}
}
```

---

## 7. Pretty Output Format

### Layout
```
[Smith-2020-machine] Machine Learning for Everyone
  Authors: Smith, J.; Doe, A.
  Year: 2020
  Type: article
  DOI: 10.1234/example
  UUID: 550e8400-e29b-41d4-a716-446655440000

[Jones-2021] Another Paper
  Authors: Jones, B.
  Year: 2021
  Type: book
  UUID: 660e8400-e29b-41d4-a716-446655440001
```

### Formatting Rules
- **Separator**: Empty line between references
- **Header line**: `[id] title`
  - ID in brackets
  - Title immediately after
- **Field lines**: Indented with 2 spaces
  - Format: `Field: Value`
- **Displayed fields** (in order):
  1. Authors (abbreviated: "Family, Given-Initial.")
  2. Year (from `issued.date-parts`)
  3. Type (CSL-JSON `type` field)
  4. DOI (if present)
  5. PMID (if present)
  6. PMCID (if present)
  7. URL (if present)
  8. UUID (always)

### Field Formatting

#### Authors
- Format: "Family, Given-Initial."
- Multiple authors: Separated by "; "
- Example: `Smith, J.; Doe, A.; Johnson, B.`

#### Year
- Extracted from `issued.date-parts[0][0]`
- Missing: Display "(no year)"

#### Type
- Display CSL-JSON type as-is

#### Identifiers
- DOI: `10.1234/example`
- PMID: `12345678`
- URL: `https://example.com`
- UUID: Full UUID

### Future Enhancements
- Terminal color support (author names, DOI links)
- Terminal width consideration (wrapping)
- Configurable field selection
- Pager integration for long output

---

## 8. Output Option Mutual Exclusivity

### Rule
Output format options for `search` and `list` commands are **mutually exclusive**.

### Affected Options
- `--json`
- `--ids-only`
- `--uuid`
- `--bibtex`
- (Default: pretty format when none specified)

### Behavior
- **Zero options**: Use pretty format (default)
- **One option**: Use specified format
- **Multiple options**: Error message, exit code 1

### Error Message
```
Error: Multiple output formats specified. Only one of --json, --ids-only, --uuid, --bibtex can be used.
```

### Validation
- Performed before query execution
- Commander flag conflict detection

### Examples
```bash
# Valid: No option (pretty format)
reference-manager search "Smith"

# Valid: Single option
reference-manager search "Smith" --json

# Invalid: Multiple options
reference-manager search "Smith" --json --bibtex
# Error: Multiple output formats specified
```

---

## Global Options

These options are available for all commands:

### Configuration Override
- `--library <path>`: Override library file path
- `--log-level <level>`: Override log level (`silent`, `info`, `debug`)

### Standard Options
- `--help` / `-h`: Display help (provided by commander)
- `--version` / `-v`: Display version (provided by commander)

### Priority
CLI arguments > Environment variables > Config file > Defaults

---

## Exit Codes Summary

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | General error (command failed, validation error, not found, etc.) |
| `2` | Conflict (merge conflict, user cancelled) |
| `3` | Parse error (invalid JSON) |
| `4` | I/O error (file read/write failure) |