# ADR-008: Add MCP stdio Server

Date: 2025-12-23

## Status

Accepted

## Context

reference-manager is a CLI tool for managing academic references. With the rise of AI coding assistants (Claude Code, OpenAI Agents, etc.), there is a need to enable these tools to interact directly with reference management functionality.

The Model Context Protocol (MCP) is an open standard by Anthropic that provides a unified way for AI applications to access external tools and data sources. MCP supports stdio transport, which is ideal for local tool integration.

Requirements:
- Enable AI agents to search, add, cite, and manage references
- Maintain consistency with existing CLI functionality
- Reuse existing `features/operations` layer
- Support file watching for external changes (e.g., CLI tool modifications)

## Decision

Implement an MCP-compliant stdio server as a new subcommand:

```bash
reference-manager mcp
```

### Architecture

1. **Independent from HTTP server**: The MCP server runs as a separate process, not sharing runtime state with the HTTP server.

2. **Shared operations layer**: Reuse `features/operations/*` for all business logic.

3. **No ExecutionContext**: Use a simplified context because:
   - Library is loaded at startup
   - Parameter structures differ from HTTP/CLI contexts
   - Simpler lifecycle management

4. **File watching enabled**: Monitor library file for external changes (e.g., CLI modifications) and reload automatically.

5. **Single package**: MCP functionality is part of the main `@ncukondo/reference-manager` package.

### MCP Primitives

#### Tools

| Tool | Description | Input Schema |
|------|-------------|--------------|
| `search` | Search references | `{ query: string }` |
| `list` | List all references | `{ format?: "json" \| "bibtex" \| "pretty" }` |
| `add` | Add references | `{ input: string \| string[] }` |
| `remove` | Remove reference | `{ id: string, force: boolean }` |
| `cite` | Generate citations | `{ ids: string[], style?: string, format?: "text" \| "html" }` |
| `fulltext_attach` | Attach file | `{ id: string, path: string }` |
| `fulltext_get` | Get full-text | `{ id: string }` |
| `fulltext_detach` | Detach file | `{ id: string }` |

#### Resources

| URI | Description | Content |
|-----|-------------|---------|
| `library://references` | All references | CSL-JSON array |
| `library://reference/{id}` | Single reference | CSL-JSON object |
| `library://styles` | Available citation styles | JSON array |

#### Full-text Content

| Format | Delivery |
|--------|----------|
| PDF | File path only (too large for inline) |
| Markdown | Direct string content |

### Directory Structure

```
src/
├── mcp/
│   ├── index.ts           # McpServer setup, transport
│   ├── context.ts         # MCP-specific context (Library + Config + FileWatcher)
│   ├── tools/
│   │   ├── index.ts       # Tool registration
│   │   ├── search.ts
│   │   ├── list.ts
│   │   ├── add.ts
│   │   ├── remove.ts
│   │   ├── cite.ts
│   │   └── fulltext.ts
│   └── resources/
│       ├── index.ts       # Resource registration
│       └── library.ts
└── cli/commands/
    └── mcp.ts             # CLI subcommand
```

### Dependencies

Add to `package.json`:
```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.25.0"
  }
}
```

## Rationale

1. **Reuse operations layer**: Avoids code duplication, ensures consistent behavior across CLI/HTTP/MCP interfaces.

2. **Independent from HTTP server**: Simpler architecture, no shared state complexity, each process manages its own Library instance.

3. **No ExecutionContext**: The MCP server has different lifecycle requirements. A simpler context reduces complexity.

4. **File watching enabled**: Essential for consistency when CLI tools modify the library file while MCP server is running.

5. **Single package**: Users install one package and get all interfaces. No additional dependency management.

6. **PDF as path only**: PDFs can be megabytes; embedding in MCP responses would be inefficient. Markdown is typically small enough for inline delivery.

## Consequences

### Positive

- AI agents can directly manage references without CLI subprocess calls
- Consistent behavior with existing CLI/HTTP interfaces
- File watching ensures data consistency
- Standard MCP protocol enables broad AI tool compatibility
- Single package simplifies installation

### Negative

- Additional dependency (`@modelcontextprotocol/sdk`)
- Memory overhead when both HTTP and MCP servers run simultaneously (separate Library instances)
- Logging must use stderr (stdout reserved for JSON-RPC)

### Neutral

- New code path to maintain alongside CLI and HTTP
- MCP protocol version updates may require SDK updates

## Alternatives Considered

### Option A: Use ExecutionContext

**Description**: Reuse the existing ExecutionContext pattern from HTTP server.

**Pros**:
- Consistent with HTTP server architecture
- Shared code for context management

**Cons**:
- ExecutionContext designed for request-scoped operations
- MCP has different parameter structures
- Adds unnecessary complexity for simpler MCP use case

**Why rejected**: The lifecycle and parameter requirements differ enough that a simpler dedicated context is more appropriate.

### Option B: Proxy through HTTP server

**Description**: MCP server proxies requests to HTTP server.

**Pros**:
- Single source of truth for business logic
- Shared Library instance

**Cons**:
- Requires HTTP server to be running
- Additional network hop latency
- Coupling between MCP and HTTP components

**Why rejected**: Adds deployment complexity and latency. Direct operations layer access is simpler.

### Option C: Separate package

**Description**: Publish MCP server as `@ncukondo/reference-manager-mcp`.

**Pros**:
- Smaller main package if MCP not needed
- Independent versioning

**Cons**:
- Additional package to manage
- Version synchronization challenges
- More complex installation for users

**Why rejected**: The overhead of separate package management outweighs the minimal size benefit.

### Option D: Disable file watching in MCP mode

**Description**: Only load library at startup, no runtime reload.

**Pros**:
- Simpler implementation
- Less resource usage

**Cons**:
- Stale data if CLI modifies library
- Inconsistent state between interfaces

**Why rejected**: Data consistency is critical. The CLI may modify the library while MCP server is running.

## References

- [MCP Specification (2025-06-18)](https://modelcontextprotocol.io/specification/2025-06-18)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [@modelcontextprotocol/sdk npm](https://www.npmjs.com/package/@modelcontextprotocol/sdk)
- [Build an MCP server](https://modelcontextprotocol.io/docs/develop/build-server)
- Related: ADR-005 (Hono for HTTP server)
