# JSON Output Format

## Purpose

Provide machine-readable JSON output for external tool integration.

## Common Options

```
--output <format>    Output format: json|text (default: text)
-o <format>          Short for --output
--full               Include full CSL-JSON data in JSON output
```

## Supported Commands

| Command | `--output json` | `--full` |
|---------|-----------------|----------|
| `add` | Yes | Yes |
| `remove` | Yes | Yes |
| `update` | Yes | Yes |
| `list` | Use `--json` | N/A (always full) |
| `search` | Use `--json` | N/A (always full) |

**Note**: `list` and `search` use `--json` flag for backward compatibility.

## Output Destination

| Mode | stdout | stderr |
|------|--------|--------|
| `--output text` | (none) | Human-readable messages |
| `--output json` | JSON | (none, except fatal errors) |

## Types

### Common Types

```typescript
type DuplicateType =
  | "doi"              // DOI match
  | "pmid"             // PMID match
  | "isbn"             // ISBN match (book)
  | "isbn-title"       // ISBN + title match (book-section)
  | "title-author-year"; // Title + authors + year match

type FailureReason =
  | "not_found"        // Identifier not found
  | "fetch_error"      // Network/API error
  | "parse_error"      // Parse error
  | "validation_error" // Validation error
  | "unknown";         // Other errors
```

## Command Specifications

### add

**Schema:**

```typescript
interface AddJsonOutput {
  summary: {
    total: number;
    added: number;
    skipped: number;
    failed: number;
  };

  added: Array<{
    source: string;        // Input source (DOI, PMID, file path, etc.)
    id: string;            // Generated citation key
    uuid: string;          // Internal UUID
    title: string;         // Title
    idChanged?: boolean;   // True if ID was changed due to collision
    originalId?: string;   // Original ID before collision resolution
    item?: CslItem;        // Full CSL-JSON (--full only)
  }>;

  skipped: Array<{
    source: string;        // Input source
    reason: "duplicate";   // Skip reason
    existingId: string;    // Existing entry's citation key
    duplicateType: DuplicateType;  // Type of duplicate match (hyphen-case)
  }>;

  failed: Array<{
    source: string;        // Input source
    reason: FailureReason; // Failure category
    error: string;         // Error message detail
  }>;
}
```

**Example:**

```json
{
  "summary": { "total": 3, "added": 1, "skipped": 1, "failed": 1 },
  "added": [
    {
      "source": "12345678",
      "id": "smith-2024",
      "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Article Title"
    }
  ],
  "skipped": [
    {
      "source": "10.1000/existing",
      "reason": "duplicate",
      "existingId": "existing-2024",
      "duplicateType": "doi"  // or "pmid", "isbn", "isbn-title", "title-author-year"
    }
  ],
  "failed": [
    {
      "source": "99999999",
      "reason": "not_found",
      "error": "PMID 99999999 not found in PubMed"
    }
  ]
}
```

**Exit Codes:**

| Code | Condition |
|------|-----------|
| `0` | At least one item added |
| `1` | All items failed or skipped |

### remove

**Schema:**

```typescript
interface RemoveJsonOutput {
  success: boolean;
  id: string;          // Specified ID
  uuid?: string;       // Removed item's UUID (success only)
  title?: string;      // Removed item's title (success only)
  item?: CslItem;      // Full CSL-JSON (--full only, success only)
  error?: string;      // Error message (failure only)
}
```

**Example (success):**

```json
{
  "success": true,
  "id": "smith-2024",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Article Title"
}
```

**Example (failure):**

```json
{
  "success": false,
  "id": "nonexistent-id",
  "error": "Reference not found: nonexistent-id"
}
```

**Exit Codes:**

| Code | Condition |
|------|-----------|
| `0` | Successfully removed |
| `1` | Not found |

### update

**Schema:**

```typescript
interface UpdateJsonOutput {
  success: boolean;
  id: string;           // Updated item's ID
  uuid?: string;        // UUID (success only)
  title?: string;       // Updated title (success only)
  idChanged?: boolean;  // True if ID was changed
  previousId?: string;  // Previous ID (idChanged only)
  before?: CslItem;     // Before update (--full only, success only)
  after?: CslItem;      // After update (--full only, success only)
  error?: string;       // Error message (failure only)
}
```

**Example (success):**

```json
{
  "success": true,
  "id": "smith-2024",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Updated Title"
}
```

**Example (with ID change):**

```json
{
  "success": true,
  "id": "jones-2024",
  "uuid": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "title": "Article",
  "idChanged": true,
  "previousId": "smith-2024"
}
```

**Example (failure):**

```json
{
  "success": false,
  "id": "nonexistent-id",
  "error": "Reference not found: nonexistent-id"
}
```

**Exit Codes:**

| Code | Condition |
|------|-----------|
| `0` | Successfully updated |
| `1` | Not found or validation error |

## Fatal Error Output

When a fatal error occurs (e.g., library file read failure):

```json
{
  "success": false,
  "error": "Failed to load library: ENOENT"
}
```

## Usage Examples

```bash
# Basic JSON output
ref add 12345678 -o json

# With full CSL-JSON data
ref add 12345678 -o json --full

# Parse results with jq
ref add paper.bib -o json | jq '.added[].id'

# Check for failures
ref add "$doi" -o json | jq -e '.summary.failed == 0'

# Get added IDs and cite them
ref add 12345678 -o json | jq -r '.added[].id' | xargs ref cite

# Remove with confirmation data
ref remove smith-2024 -o json --full > removed.json
```
