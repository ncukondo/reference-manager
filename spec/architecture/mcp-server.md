# MCP Server

## Framework

- MCP SDK: **@modelcontextprotocol/sdk**
- Transport: **stdio** (stdin/stdout)
- Protocol: JSON-RPC 2.0

## Purpose

Enable AI agents (Claude Code, Claude Desktop, etc.) to directly interact with reference management:
- Search and retrieve references
- Add new references from various sources
- Generate formatted citations
- Manage full-text attachments

## Command

```bash
reference-manager mcp [--library <path>]
```

| Option | Description |
|--------|-------------|
| `--library` | Override library file path |

## Output & Logging

- **stdout**: Reserved for JSON-RPC messages (MCP protocol)
- **stderr**: All logging output
- Never use `console.log()` in MCP mode

## Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `search` | Search references | `query: string`, pagination options |
| `list` | List all references | `format?`, pagination options |
| `add` | Add references | `input: string \| string[]` |
| `remove` | Remove reference | `id: string, force: boolean` |
| `cite` | Generate citations | `ids: string[], style?: string, format?: "text" \| "html"` |
| `fulltext_attach` | Attach file | `id: string, path: string` |
| `fulltext_get` | Get full-text | `id: string` |
| `fulltext_detach` | Detach file | `id: string` |

### Pagination Parameters

For `list` and `search` tools. See `spec/features/pagination.md` for details.

| Parameter | Type | Description |
|-----------|------|-------------|
| `sort` | `string` | Sort field: `created`, `updated`, `published`, `author`, `title`, `relevance` (search only) |
| `order` | `string` | Sort order: `asc`, `desc` |
| `limit` | `number` | Maximum results (default: 20) |
| `offset` | `number` | Skip count (default: 0) |

### Tool Behavior

- `remove` requires `force: true` to execute (safety)
- `add` accepts PMID, DOI, BibTeX, RIS, or CSL-JSON
- `cite` defaults to APA style, text format
- `list` and `search` default to limit=20 for token efficiency

## Resources

| URI | Description | MIME Type |
|-----|-------------|-----------|
| `library://references` | All references | `application/json` |
| `library://reference/{id}` | Single reference | `application/json` |
| `library://styles` | Citation styles | `application/json` |

### Full-text Resources

| Format | Delivery |
|--------|----------|
| PDF | File path only |
| Markdown | Direct content |

## File Watching

MCP server monitors library file for external changes:
- Reloads library when CLI or other tools modify it
- Uses `chokidar` for file watching

See `spec/features/file-monitoring.md` for details.

## Claude Code Integration

```bash
claude mcp add reference-manager -- npx -y @ncukondo/reference-manager mcp
```

With custom library:

```bash
claude mcp add reference-manager -- npx -y @ncukondo/reference-manager mcp --library ~/refs.json
```

## Claude Desktop Integration

Add to configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "reference-manager": {
      "command": "npx",
      "args": ["-y", "@ncukondo/reference-manager", "mcp"]
    }
  }
}
```

## Error Handling

Uses MCP standard error format:

| Error Code | Meaning |
|------------|---------|
| `-32600` | Invalid request |
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32000` | Application error |

## Architecture

### ILibraryOperations Pattern

MCP uses the same `ILibraryOperations` pattern as CLI (see ADR-009, ADR-010):

```
McpContext
└── libraryOperations: ILibraryOperations
      └── OperationsLibrary (wraps Library)
```

**Benefits**:
- Consistent pattern with CLI
- Tools use unified interface: `libraryOperations.search()`, `.list()`, `.cite()`, `.import()`
- Resources use inherited `ILibrary` methods: `.getAll()`, `.find()`
- Foundation for future HTTP-based mode

See: `src/mcp/context.ts`, `src/features/operations/library-operations.ts`

## Related

- ADR-008: MCP stdio Server
- ADR-009: ILibraryOperations Pattern for CLI
- ADR-010: MCP ILibraryOperations Pattern
- `spec/architecture/cli.md`: CLI commands
- `spec/features/file-monitoring.md`: File watching
