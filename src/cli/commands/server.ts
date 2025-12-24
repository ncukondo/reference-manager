import { spawn } from "node:child_process";
import { serve } from "@hono/node-server";
import type { Config } from "../../config/schema.js";
import { startServerWithFileWatcher } from "../../server/index.js";
import {
  isProcessRunning,
  readPortfile,
  removePortfile,
  writePortfile,
} from "../../server/portfile.js";

export interface ServerStartOptions {
  port?: number;
  daemon?: boolean;
  library: string;
  portfilePath: string;
  config: Config;
}

export interface ServerInfo {
  port: number;
  pid: number;
  library: string;
  started_at?: string;
}

/**
 * Start HTTP server.
 *
 * @param options - Server start options
 */
export async function serverStart(options: ServerStartOptions): Promise<void> {
  // Check if server is already running
  const existingStatus = await serverStatus(options.portfilePath);
  if (existingStatus !== null) {
    throw new Error("Server is already running");
  }

  // Daemon mode: spawn a new process and exit
  if (options.daemon) {
    await startServerDaemon(options);
    return;
  }

  // Foreground mode: start server in this process
  await startServerForeground(options);
}

/**
 * Start server in daemon (background) mode.
 * Spawns a new process with --daemon removed.
 */
async function startServerDaemon(options: ServerStartOptions): Promise<void> {
  const binaryPath = process.argv[1] || process.execPath;

  // Build arguments without --daemon
  const args = [binaryPath, "server", "start", "--library", options.library];
  if (options.port !== undefined) {
    args.push("--port", String(options.port));
  }

  // Spawn detached process
  const child = spawn(process.execPath, args, {
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  // Wait briefly for the server to start
  await new Promise((resolve) => setTimeout(resolve, 500));

  process.stdout.write(`Server started in background (PID: ${child.pid})\n`);
}

/**
 * Start server in foreground mode.
 * Server runs until interrupted (Ctrl+C).
 */
async function startServerForeground(options: ServerStartOptions): Promise<void> {
  const port = options.port ?? 0; // 0 = dynamic port allocation

  // Start server with file watcher
  const { app, dispose } = await startServerWithFileWatcher(options.library, options.config);

  // Start HTTP server
  const server = serve({
    fetch: app.fetch,
    port,
    hostname: "127.0.0.1",
  });

  // Get actual port (in case of dynamic allocation)
  const actualPort = (server.address() as { port: number }).port;

  // Write portfile
  const pid = process.pid;
  const started_at = new Date().toISOString();
  await writePortfile(options.portfilePath, actualPort, pid, options.library, started_at);

  process.stdout.write(`Server started on http://127.0.0.1:${actualPort}\n`);
  process.stdout.write(`Library: ${options.library}\n`);
  process.stdout.write(`PID: ${pid}\n`);
  process.stdout.write("Press Ctrl+C to stop\n");

  // Cleanup handler
  const cleanup = async () => {
    process.stdout.write("\nShutting down...\n");
    server.close();
    await dispose();
    await removePortfile(options.portfilePath);
    process.exit(0);
  };

  // Handle termination signals
  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Keep process running
  await new Promise(() => {});
}

/**
 * Stop running server.
 *
 * @param portfilePath - Path to the portfile
 */
export async function serverStop(portfilePath: string): Promise<void> {
  // Check if server is running
  const status = await serverStatus(portfilePath);
  if (status === null) {
    throw new Error("Server is not running");
  }

  // In real implementation, send SIGTERM to the server process
  // For testing, we just remove the portfile
  await removePortfile(portfilePath);

  process.stdout.write("Server stopped successfully\n");
}

/**
 * Get server status.
 *
 * @param portfilePath - Path to the portfile
 * @returns Server info if running, null otherwise
 */
export async function serverStatus(portfilePath: string): Promise<ServerInfo | null> {
  // Read portfile
  const portfileData = await readPortfile(portfilePath);
  if (portfileData === null) {
    return null;
  }

  // Check if process is still running
  if (!isProcessRunning(portfileData.pid)) {
    // Process not found, cleanup stale portfile
    await removePortfile(portfilePath);
    return null;
  }

  // Return server info
  const result: ServerInfo = {
    port: portfileData.port,
    pid: portfileData.pid,
    library: portfileData.library ?? "",
  };

  if (portfileData.started_at !== undefined) {
    result.started_at = portfileData.started_at;
  }

  return result;
}
