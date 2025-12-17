# HTTP Server (Localhost)

## Framework

- HTTP framework: **Hono**

## Port Management

- Dynamic port allocation
- Active port written to a portfile
- CLI discovers and connects via portfile

### Portfile Format

Location: `~/.reference-manager/server.port`

Format (JSON):
```json
{
  "port": 3000,
  "pid": 12345,
  "library": "/path/to/library.json",
  "started_at": "2025-12-16T10:30:00Z"
}
```

Fields:
- `port`: HTTP server port number
- `pid`: Server process ID (for liveness check)
- `library`: Path to library file being served (for CLI verification)
- `started_at`: ISO 8601 timestamp (when server started)

For detailed CLI-server integration, see [cli-server-integration.md](./cli-server-integration.md).

## API Scope

- Internal API only (no public stability guarantee)
