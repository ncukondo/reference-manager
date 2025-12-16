# CLI and Server Integration

## Overview

The CLI and HTTP server work together for optimal performance with large CSL files. CLI commands automatically use the server when available, or fall back to direct file access.

## Architecture

### Two Modes of Operation

#### Mode 1: Direct File Access

```
CLI Command → Read library file → Execute → Exit
```

- Used when server is not running (and auto_start = false)
- Simple, standalone operation
- Slower for large files

#### Mode 2: Server-Backed Access

```
CLI Command → Check portfile → HTTP API request → Fast response → Exit
```

- Used when server is running
- Optimal for large files (library in memory)
- Fast command execution

### Automatic Server Detection

Every CLI command follows this flow:

1. **Check portfile** (`~/.reference-manager/server.port`)
2. **If portfile exists and valid**:
   - Verify process is running
   - Verify library path matches
   - Use server API
3. **If no server available**:
   - Check `auto_start` config
   - If `auto_start = true`: Start server in daemon mode
   - If `auto_start = false`: Use direct file access

**User transparency**: Users don't need to know which mode is active.

## Configuration

### Server Auto-Start

```toml
[server]
# Auto-start server when not running (default: false)
auto_start = false

# Auto-stop server after idle time in minutes (default: 0 = disabled)
auto_stop_minutes = 0
```

### Behavior Matrix

| Config | Server Running | Command Behavior |
|--------|----------------|------------------|
| `auto_start = false` | No | Direct file access |
| `auto_start = false` | Yes | Use server API |
| `auto_start = true` | No | Start server → Use API |
| `auto_start = true` | Yes | Use server API |

### Auto-Stop Behavior

When `auto_stop_minutes > 0`:

- Server tracks last request time
- After N minutes of no requests, server shuts down gracefully
- Removes portfile on shutdown
- Next command will auto-start (if `auto_start = true`)

**Implementation**: Server sets a timer after each request, resets on new request.

## Portfile

### Location

`~/.reference-manager/server.port`

### Format (JSON)

```json
{
  "port": 3000,
  "pid": 12345,
  "library": "/path/to/library.json",
  "started_at": "2025-12-16T10:30:00Z"
}
```

### Fields

- `port`: HTTP server port number
- `pid`: Server process ID (for liveness check)
- `library`: Path to library file being served
- `started_at`: ISO 8601 timestamp

## Server Discovery Algorithm

```typescript
async function getServerConnection(libraryPath: string, config: Config): Promise<ServerConnection | null> {
  // Check if portfile exists
  const portfile = await tryReadPortfile();

  if (portfile && isValid(portfile, libraryPath)) {
    // Server is running and serving our library
    return createConnection(portfile);
  }

  // No server available
  if (config.server.auto_start) {
    // Auto-start server
    await startServerDaemon(libraryPath, config);
    // Wait for server to be ready
    await waitForServer(5000); // 5 second timeout
    // Retry connection
    return await getServerConnection(libraryPath, config);
  }

  // Use direct file access
  return null;
}

function isValid(portfile: Portfile, libraryPath: string): boolean {
  // Check process is running
  if (!isProcessRunning(portfile.pid)) {
    return false;
  }

  // Check library path matches
  if (portfile.library !== libraryPath) {
    return false;
  }

  return true;
}
```

## API Mapping

### Read Commands

| CLI Command | Server API Endpoint |
|-------------|---------------------|
| `reference-manager search "query"` | `GET /api/references?query=...` |
| `reference-manager list` | `GET /api/references` |
| `reference-manager search --json` | `GET /api/references?query=...&format=json` |
| `reference-manager search --bibtex` | `GET /api/references?query=...&format=bibtex` |

### Write Commands

| CLI Command | Server API Endpoint |
|-------------|---------------------|
| `reference-manager add` | `POST /api/references` |
| `reference-manager update <id>` | `PUT /api/references/:uuid` |
| `reference-manager remove <id>` | `DELETE /api/references/:uuid` |

## Error Handling

### Server Connection Failure

If server connection fails (network error, crashed, etc.):

1. Log warning: "Server connection failed, falling back to direct file access"
2. Fall back to direct file access
3. Continue execution
4. Remove stale portfile

**Result**: Command succeeds, slightly slower than expected.

### Server API Error (4xx, 5xx)

If server returns error response:

1. Parse error message from server
2. Display error to user
3. Exit with appropriate code

**Do not** fall back to direct file access (server actively rejected request).

### Conflicting Libraries

If server is serving a different library:

1. Log debug: "Server serving different library, using direct access"
2. Use direct file access
3. Do not auto-start (server already running)

### Auto-Start Failure

If auto-start fails:

1. Log error: "Failed to auto-start server: <reason>"
2. Fall back to direct file access
3. Continue execution

**Result**: Command succeeds, but slower.

## Performance

### Expected Latency

| Library Size | Direct Access | Server API | Speedup |
|--------------|---------------|------------|---------|
| Small (< 100 refs) | ~50ms | ~10ms | 5x |
| Medium (100-1000 refs) | ~200ms | ~15ms | 13x |
| Large (1000-10000 refs) | ~2s | ~20ms | 100x |
| Very Large (> 10000 refs) | ~10s+ | ~30ms | 300x+ |

### Server Startup Time

- First command (auto-start): ~500ms overhead
- Subsequent commands: ~10-30ms (fast)
- Amortized cost negligible after 5-10 commands

## Write Operations

### Server-Backed Writes

When server is available, write operations are handled by server:

1. CLI sends write request to server API
2. Server applies modification to in-memory index
3. Server writes to file (atomic, with backup)
4. Server updates file hash (for self-write detection)
5. Server continues serving with updated index
6. Server returns success/error to CLI

**Benefits:**
- No file I/O in CLI
- Server handles all write safety logic
- In-memory index immediately updated
- File watching skips self-writes (hash comparison)

### Direct Writes (No Server)

When server not available:

1. CLI loads library from file
2. CLI applies modification
3. CLI validates
4. CLI writes to file (atomic, with backup)
5. CLI exits

**Note**: If server starts later, it will load updated file.

## Security

### Localhost Only

- Server binds to `127.0.0.1` only
- Not accessible from network
- No authentication required (localhost trusted)

### Process Verification

- CLI verifies server PID before connecting
- Prevents connecting to wrong process on recycled port

### Library Path Verification

- CLI checks server is serving correct library
- Prevents cross-library operations

## CLI Flags (Future)

Not implemented in Phase 4.2, but reserved for future:

```bash
--require-server  # Error if server not available (no fallback)
--no-server       # Force direct file access (ignore server)
```

## Implementation Notes

### CLI Code Structure

```typescript
async function executeCommand(command: Command, options: Options): Promise<void> {
  const libraryPath = resolveLibraryPath(options);
  const config = loadConfig(options);

  // Try server connection (with auto-start if configured)
  const server = await getServerConnection(libraryPath, config);

  if (server) {
    // Use server API
    return await executeViaServer(server, command, options);
  } else {
    // Use direct file access
    return await executeDirect(libraryPath, command, options);
  }
}
```

### Server API Client

```typescript
class ServerClient {
  constructor(private baseUrl: string) {}

  async search(query: string, format: OutputFormat): Promise<SearchResult[]> {
    const url = `${this.baseUrl}/api/references?query=${encodeURIComponent(query)}&format=${format}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  }

  async addReference(item: CslItem): Promise<Reference> {
    const response = await fetch(`${this.baseUrl}/api/references`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });
    if (!response.ok) throw new Error(await response.text());
    return await response.json();
  }
}
```

### Auto-Start Implementation

```typescript
async function startServerDaemon(libraryPath: string, config: Config): Promise<void> {
  const { spawn } = await import("node:child_process");

  // Spawn server in detached daemon mode
  const child = spawn(
    process.execPath,
    [
      process.argv[1], // reference-manager binary
      "server",
      "start",
      "--daemon",
      "--library", libraryPath
    ],
    {
      detached: true,
      stdio: "ignore"
    }
  );

  child.unref(); // Allow parent to exit

  // Wait for portfile to appear
  await waitForPortfile(5000); // 5 second timeout
}
```

## Benefits

1. **Performance**: Fast for large files with server
2. **Flexibility**: Works without server
3. **Automatic**: User doesn't manage server manually
4. **Configurable**: `auto_start` suits different workflows
5. **Reliable**: Automatic fallback if server unavailable

## Trade-offs

**Advantages:**
- Best of both worlds (performance + simplicity)
- Gradual optimization (start simple, add server when needed)
- No forced dependency

**Disadvantages:**
- More complex implementation (two code paths)
- Server detection/fallback logic
- CLI/server API must stay in sync

**Decision**: Complexity acceptable for performance benefits.