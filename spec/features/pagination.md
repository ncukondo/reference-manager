# Pagination and Sorting

## Scope

Applies to commands returning multiple results:
- `list` - List all references
- `search` - Search references

Applies across all interfaces:
- CLI (`spec/architecture/cli.md`)
- HTTP API (`spec/architecture/http-server.md`)
- MCP Server (`spec/architecture/mcp-server.md`)

## Options

### Sort Field

CLI: `--sort <field>`

| Field | Alias | Description | Sort Target |
|-------|-------|-------------|-------------|
| `created` | `add` | Registration date | `custom.created_at` |
| `updated` | `mod` | Modification date | `custom.timestamp` |
| `published` | `pub` | Publication date | `issued.date-parts` |
| `author` | - | First author family name | First author's `family` |
| `title` | - | Title | `title` field |
| `relevance` | `rel` | Match strength (**search only**) | Search score |

### Sort Order

CLI: `--order <asc|desc>`

| Value | Description |
|-------|-------------|
| `asc` | Ascending (oldest first, A→Z) |
| `desc` | Descending (newest first, Z→A) |

### Limit

CLI: `--limit <n>`, `-n <n>`

Maximum number of results to return.

- Value: Non-negative integer
- `0` means unlimited

### Offset

CLI: `--offset <n>`

Number of results to skip (0-based).

- Value: Non-negative integer
- Default: `0`

## Defaults

### By Command

| Command | Default Sort | Default Order |
|---------|-------------|---------------|
| `list` | `updated` | `desc` |
| `search` | `updated` | `desc` |

### By Interface

| Interface | Default Limit |
|-----------|---------------|
| CLI | unlimited (`0`) |
| HTTP API | unlimited (`0`) |
| MCP | `20` (configurable) |

## Configuration

### Config File

```toml
[cli]
default_limit = 0          # 0 = unlimited
default_sort = "updated"
default_order = "desc"

[mcp]
default_limit = 20         # Token-saving default for AI agents
```

### Environment Variables

```
REFERENCE_MANAGER_CLI_DEFAULT_LIMIT=50
REFERENCE_MANAGER_MCP_DEFAULT_LIMIT=20
```

### Priority

1. CLI arguments / API parameters (highest)
2. Environment variables
3. Config file
4. Built-in defaults (lowest)

## Result Format

### JSON Output

```json
{
  "items": ["formatted string 1", "formatted string 2", ...],
  "total": 150,
  "limit": 10,
  "offset": 0,
  "nextOffset": 10
}
```

| Field | Type | Description |
|-------|------|-------------|
| `items` | `string[]` | Formatted results (format depends on output option) |
| `total` | `number` | Total count before pagination |
| `limit` | `number` | Applied limit (0 if unlimited) |
| `offset` | `number` | Applied offset |
| `nextOffset` | `number \| null` | Next page offset, `null` if no more results |

### Non-JSON Output (CLI)

Header line shows pagination info when limit is applied:

```
# Showing 1-10 of 150 references
[reference output...]
```

No header when showing all results.

## Secondary Sort

When primary sort values are equal:

| Primary Sort | Secondary Sort |
|--------------|----------------|
| Any except `relevance` | `created` (desc), then `id` (asc) |
| `relevance` | Year (desc) → Author (asc) → Title (asc) → `created` (desc) |

This ensures stable, deterministic ordering.

## Missing Values

References with missing sort field values are sorted to the end:

| Sort Field | Missing Value Handling |
|------------|------------------------|
| `created` | Epoch (1970-01-01) - sorted last in desc |
| `updated` | Use `created` value as fallback |
| `published` | No year - sorted last |
| `author` | "Anonymous" |
| `title` | Empty string |

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| `offset` >= `total` | Empty `items`, `nextOffset: null` |
| `limit` = `0` | All results (unlimited) |
| `limit` < `0` | Validation error |
| `offset` < `0` | Validation error |
| Empty library | `items: [], total: 0, nextOffset: null` |
| Invalid sort field | Validation error |
| Invalid order | Validation error |

## CLI Examples

```bash
# Basic usage
ref list --sort updated --order desc --limit 20
ref list -n 10                              # Short form for --limit

# Pagination
ref list --limit 10 --offset 0              # Results 1-10
ref list --limit 10 --offset 10             # Results 11-20
ref list -n 10 --offset 20                  # Results 21-30

# Using aliases
ref list --sort pub                         # Sort by published date
ref search "RNA" --sort mod                 # Sort by updated date

# Search with options
ref search "AI" --sort updated --order desc -n 5
ref search "machine learning" --limit 10    # Top 10 by updated date

# Combined with output format
ref list --sort author --order asc -n 50 --json
ref search "CRISPR" --limit 20 --bibtex
```

## API Parameters

### HTTP

```
GET /api/references?sort=updated&order=desc&limit=10&offset=0
GET /api/references?query=RNA&sort=updated&limit=5
```

Query parameters:
- `sort`: Sort field (see table above)
- `order`: `asc` or `desc`
- `limit`: Maximum results
- `offset`: Skip count

### MCP

Tool arguments:

```json
{
  "name": "list",
  "arguments": {
    "format": "json",
    "sort": "updated",
    "order": "desc",
    "limit": 10,
    "offset": 0
  }
}
```

```json
{
  "name": "search",
  "arguments": {
    "query": "RNA",
    "sort": "updated",
    "limit": 5
  }
}
```

## Type Definitions

See: `src/features/operations/pagination.ts`

```typescript
type SortField = "created" | "updated" | "published" | "author" | "title";
type SearchSortField = SortField | "relevance";
type SortOrder = "asc" | "desc";

interface PaginationOptions {
  limit?: number;
  offset?: number;
}

interface SortOptions<T extends string = SortField> {
  sort?: T;
  order?: SortOrder;
}

interface PaginatedResult<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  nextOffset: number | null;
}
```

## Related

- `spec/features/search.md` - Search query syntax
- `spec/architecture/cli.md` - CLI command options
- `spec/architecture/mcp-server.md` - MCP tool parameters
- `spec/architecture/http-server.md` - HTTP API endpoints
