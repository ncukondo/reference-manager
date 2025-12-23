# MCP Server

## Framework

- MCP SDK: **@modelcontextprotocol/sdk**
- Transport: **stdio** (stdin/stdout)
- Protocol: JSON-RPC 2.0

## Purpose

Enable AI agents (Claude Code, OpenAI Agents, etc.) to directly interact with reference management:
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

## Architecture

### Independence from HTTP Server

- Runs as separate process
- Does not share runtime state with HTTP server
- Uses own Library instance loaded at startup

### Shared Components

- Reuses `features/operations/*` for business logic
- Reuses `features/file-watcher` for library monitoring
- Shares configuration via `config.toml`

### No ExecutionContext

Uses simplified MCP-specific context:
- Library loaded at startup
- Config loaded at startup
- FileWatcher for change detection

## Tools

| Tool | Description | Input |
|------|-------------|-------|
| `search` | Search references | `{ query: string }` |
| `list` | List all references | `{ format?: "json" \| "bibtex" \| "pretty" }` |
| `add` | Add references | `{ input: string \| string[] }` |
| `remove` | Remove reference | `{ id: string, force: boolean }` |
| `cite` | Generate citations | `{ ids: string[], style?: string, format?: "text" \| "html" }` |
| `fulltext_attach` | Attach file to reference | `{ id: string, path: string }` |
| `fulltext_get` | Get full-text content | `{ id: string }` |
| `fulltext_detach` | Detach file from reference | `{ id: string }` |

### Tool Behavior

- `remove` requires `force: true` to execute (safety)
- `add` accepts PMID, DOI, BibTeX, RIS, or CSL-JSON
- `cite` defaults to APA style, text format

## Resources

| URI | Description | MIME Type |
|-----|-------------|-----------|
| `library://references` | All references | `application/json` |
| `library://reference/{id}` | Single reference by ID | `application/json` |
| `library://styles` | Available citation styles | `application/json` |

### Full-text Resources

| Format | Delivery |
|--------|----------|
| PDF | File path only (`{ path: string }`) |
| Markdown | Direct string content |

Rationale: PDFs are too large for inline delivery; Markdown is typically small.

## File Watching

Enabled in MCP mode:
- Monitors library file for external changes
- Reloads library when CLI or other tools modify it
- Uses same mechanism as HTTP server (`chokidar`)

See `spec/features/file-monitoring.md` for details.

## Directory Structure

```
src/mcp/
├── index.ts           # McpServer setup, transport connection
├── context.ts         # MCP context (Library + Config + FileWatcher)
├── tools/
│   ├── index.ts       # Tool registration
│   ├── search.ts
│   ├── list.ts
│   ├── add.ts
│   ├── remove.ts
│   ├── cite.ts
│   └── fulltext.ts
└── resources/
    ├── index.ts       # Resource registration
    └── library.ts
```

## Claude Code Integration

### Configuration

Add to Claude Code settings:

```json
{
  "mcpServers": {
    "reference-manager": {
      "command": "reference-manager",
      "args": ["mcp"]
    }
  }
}
```

Or via CLI:

```bash
claude mcp add reference-manager -- reference-manager mcp
```

### With Custom Library

```json
{
  "mcpServers": {
    "reference-manager": {
      "command": "reference-manager",
      "args": ["mcp", "--library", "/path/to/library.json"]
    }
  }
}
```

## Error Handling

Uses MCP standard error format with descriptive messages:

```json
{
  "error": {
    "code": -32000,
    "message": "Reference not found: smith2024"
  }
}
```

| Error Code | Meaning |
|------------|---------|
| `-32600` | Invalid request |
| `-32601` | Method not found |
| `-32602` | Invalid params |
| `-32000` | Application error (not found, duplicate, etc.) |

## Related

- ADR-008: MCP stdio Server
- `spec/architecture/http-server.md`: HTTP server (independent)
- `spec/architecture/cli.md`: CLI commands
- `spec/features/file-monitoring.md`: File watching details
