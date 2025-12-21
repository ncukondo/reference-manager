# HTTP Server

## Framework

- HTTP framework: **Hono**
- Binding: `127.0.0.1` only (localhost)

## Purpose

Performance optimization for large CSL files:
- Keep library in memory for fast access
- File watching for external change detection
- Shared across CLI invocations

## Port Management

- Dynamic port allocation by default
- `--port <port>` option for specific port
- Active port written to portfile

### Portfile

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

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/references` | List all references |
| `GET` | `/api/references?query=...` | Search references |
| `POST` | `/api/references` | Add reference(s) |
| `PUT` | `/api/references/:uuid` | Update reference |
| `DELETE` | `/api/references/:uuid` | Remove reference |
| `POST` | `/api/cite` | Generate citations |
| `GET` | `/health` | Health check |

**Note:** Internal API only, no public stability guarantee.

## File Watching

Server mode enables file watching (via `chokidar`):
- Detects external changes to library file
- Self-write detection via hash comparison
- Automatic reload on external changes

See `spec/features/file-monitoring.md` for details.

## Server Commands

```bash
reference-manager server start [--port <port>] [--daemon]
reference-manager server stop
reference-manager server status
```

| Option | Description |
|--------|-------------|
| `--port` | Specify port number |
| `--daemon` / `-d` | Run in background |

## Performance

| Library Size | Direct Access | Server API |
|--------------|---------------|------------|
| Small (< 100) | ~50ms | ~10ms |
| Medium (100-1000) | ~200ms | ~15ms |
| Large (1000-10000) | ~2s | ~20ms |
| Very Large (> 10000) | ~10s+ | ~30ms |
