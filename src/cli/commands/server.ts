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
 * Options for serverStop.
 */
export interface ServerStopOptions {
  /**
   * Interval (ms) between liveness probes while waiting for the server PID
   * to exit after SIGTERM. Lower values shorten worst-case shutdown latency
   * but add syscall overhead. Default: 100.
   */
  exitPollIntervalMs?: number;
  /**
   * Maximum time (ms) to wait for the server PID to exit after SIGTERM
   * before giving up and warning. Default: 5000.
   */
  exitWaitTimeoutMs?: number;
}

const DEFAULT_EXIT_POLL_INTERVAL_MS = 100;
const DEFAULT_EXIT_WAIT_TIMEOUT_MS = 5000;

/**
 * Outcome of a PID-exit wait, distinguished so the caller can write a
 * precise warning:
 * - "exited":      process confirmed gone (ESRCH).
 * - "timeout":     poll loop ran to the deadline with the process still
 *                  alive.
 * - "unreachable": a signal-0 probe threw a non-ESRCH error (e.g. EPERM),
 *                  so we cannot tell whether the process exited.
 */
export interface WaitForPidExitResult {
  status: "exited" | "timeout" | "unreachable";
  /** Error code from the probe that caused an "unreachable" result. */
  code?: string;
  /** Error message from the probe that caused an "unreachable" result. */
  message?: string;
}

/**
 * Poll the target PID with `process.kill(pid, 0)` until it throws ESRCH
 * (process gone) or the timeout elapses.
 *
 * Matches the liveness-probe pattern used by isProcessRunning().
 */
async function waitForPidExit(
  pid: number,
  pollIntervalMs: number,
  timeoutMs: number
): Promise<WaitForPidExitResult> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException | undefined)?.code;
      if (code === "ESRCH") {
        return { status: "exited" };
      }
      // EPERM or other: process exists but we cannot probe it. Bail with
      // a distinct "unreachable" status so the caller can word the warning
      // accurately instead of falsely claiming a timeout.
      const message = error instanceof Error ? error.message : String(error);
      return { status: "unreachable", code: code ?? "UNKNOWN", message };
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return { status: "timeout" };
}

/**
 * Stop running server.
 *
 * @param portfilePath - Path to the portfile
 * @param options - Shutdown-wait tuning (mostly for tests)
 */
export async function serverStop(
  portfilePath: string,
  options: ServerStopOptions = {}
): Promise<void> {
  const pollIntervalMs = options.exitPollIntervalMs ?? DEFAULT_EXIT_POLL_INTERVAL_MS;
  const timeoutMs = options.exitWaitTimeoutMs ?? DEFAULT_EXIT_WAIT_TIMEOUT_MS;

  // Check if server is running
  const status = await serverStatus(portfilePath);
  if (status === null) {
    throw new Error("Server is not running");
  }

  // Signal the server process so its SIGTERM handler can flush state
  // (library save, watcher close, portfile removal) before exit.
  //
  // waitResult captures what happened during the post-SIGTERM wait so
  // the caller can produce a precise warning: "exited" (success),
  // "timeout" (hung), or "unreachable" (probes failed with EPERM etc).
  // ESRCH on SIGTERM means it died between the status check and the
  // signal — same end-state as a successful wait.
  // Any other SIGTERM failure leaves the process running but unreachable;
  // we warn and skip the poll (it would only time out).
  let waitResult: WaitForPidExitResult = { status: "unreachable", code: "UNKNOWN" };
  let sigtermDelivered = false;
  try {
    process.kill(status.pid, "SIGTERM");
    sigtermDelivered = true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    if (code === "ESRCH") {
      waitResult = { status: "exited" };
    } else {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(
        `Warning: failed to send SIGTERM to server (pid ${status.pid}): ${code ?? "UNKNOWN"}: ${message}\n`
      );
    }
  }

  if (sigtermDelivered) {
    waitResult = await waitForPidExit(status.pid, pollIntervalMs, timeoutMs);
  }

  // Portfile fallback removal: the server's own SIGTERM cleanup (see
  // runShutdown) is expected to remove the portfile before exiting. We
  // remove it again here to handle the edge case where the process was
  // already dead (ESRCH) or unreachable (EPERM), which leaves a stale
  // portfile behind. removePortfile is idempotent, so the duplicate when
  // the server cleaned up first is harmless.
  await removePortfile(portfilePath);

  reportShutdownOutcome(status.pid, waitResult, sigtermDelivered, timeoutMs);
}

/**
 * Write the appropriate success / warning message for a shutdown attempt.
 * Extracted to keep serverStop() under the cognitive-complexity cap.
 */
function reportShutdownOutcome(
  pid: number,
  waitResult: WaitForPidExitResult,
  sigtermDelivered: boolean,
  timeoutMs: number
): void {
  if (waitResult.status === "exited") {
    process.stdout.write("Server stopped successfully\n");
    return;
  }
  if (waitResult.status === "timeout") {
    // SIGTERM was delivered but the PID is still alive after timeoutMs.
    // Do NOT claim success — surface the hang so the operator can
    // investigate (stuck save, blocked watcher close, etc.).
    process.stderr.write(
      `Warning: server (pid ${pid}) did not exit within ${timeoutMs}ms; portfile removed but process may still be running\n`
    );
    return;
  }
  // "unreachable": only warn here when SIGTERM succeeded — the pre-SIGTERM
  // EPERM branch already wrote its own warning above.
  if (!sigtermDelivered) return;
  const detail = waitResult.message ? `: ${waitResult.message}` : "";
  process.stderr.write(
    `Warning: could not confirm server (pid ${pid}) exit — signal probe unreachable (${waitResult.code ?? "UNKNOWN"}${detail}); portfile removed but process may still be running\n`
  );
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
