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
import { getCliSpawnArgs } from "../spawn-args.js";

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
  // Build CLI arguments without --daemon
  const cliArgs = ["server", "start", "--library", options.library];
  if (options.port !== undefined) {
    cliArgs.push("--port", String(options.port));
  }

  const { command, args } = getCliSpawnArgs(cliArgs);

  // Spawn detached process
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  // Wait briefly for the server to start
  await new Promise((resolve) => setTimeout(resolve, 500));

  process.stdout.write(`Server started in background (PID: ${child.pid})\n`);
}

/**
 * Run shutdown actions for a foreground server: close the HTTP server, flush
 * library state via dispose(), and remove the portfile.
 *
 * Intentionally does NOT set process.exitCode. dispose() sets exitCode=1 when
 * the shutdown save fails (see server/index.ts), and unconditionally writing
 * SUCCESS here would erase that signal and let the CLI exit 0 despite lost
 * writes. When everything succeeds we simply leave exitCode untouched —
 * Node exits 0 in that case.
 */
export async function runShutdown(
  server: { close: () => void },
  dispose: () => Promise<void>,
  portfilePath: string
): Promise<void> {
  process.stdout.write("\nShutting down...\n");
  server.close();
  await dispose();
  await removePortfile(portfilePath);
}

/**
 * Start server in foreground mode.
 * Server runs until interrupted (Ctrl+C).
 */
async function startServerForeground(options: ServerStartOptions): Promise<void> {
  const port = options.port ?? 0; // 0 = dynamic port allocation

  // Start server with file watcher
  const { app, dispose } = await startServerWithFileWatcher(options.library, options.config);

  // Start HTTP server and wait for it to be ready
  const actualPort = await new Promise<number>((resolve, reject) => {
    const server = serve({
      fetch: app.fetch,
      port,
      hostname: "127.0.0.1",
    });

    server.on("listening", () => {
      const addr = server.address() as { port: number };
      resolve(addr.port);

      const cleanup = () => runShutdown(server, dispose, options.portfilePath);

      // Handle termination signals
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);
    });

    server.on("error", (err) => {
      reject(err);
    });
  });

  // Write portfile
  const pid = process.pid;
  const started_at = new Date().toISOString();
  await writePortfile(options.portfilePath, actualPort, pid, options.library, started_at);

  process.stdout.write(`Server started on http://127.0.0.1:${actualPort}\n`);
  process.stdout.write(`Library: ${options.library}\n`);
  process.stdout.write(`PID: ${pid}\n`);
  process.stdout.write("Press Ctrl+C to stop\n");

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

  // Signal the server process so its SIGTERM handler can flush state
  // (library save, watcher close, portfile removal) before exit.
  try {
    process.kill(status.pid, "SIGTERM");
  } catch (error) {
    // ESRCH means the process died between the status check and now — treat as
    // the expected "already gone" case and continue with portfile cleanup.
    // Any other error (e.g. EPERM when the process is owned by another user)
    // is unexpected and must not be silently swallowed, otherwise we would
    // falsely report "Server stopped successfully" while the process keeps running.
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code !== "ESRCH") {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `Warning: failed to send SIGTERM to server (pid ${status.pid}): ${code ?? "UNKNOWN"}: ${message}\n`
      );
    }
  }

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
