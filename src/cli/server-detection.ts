import { spawn } from "node:child_process";
import type { Config } from "../config/schema.js";
import {
  getPortfilePath,
  isProcessRunning,
  portfileExists,
  readPortfile,
  removePortfile,
} from "../server/portfile.js";

/**
 * Server connection information.
 */
export interface ServerConnection {
  baseUrl: string;
  pid: number;
}

/**
 * Get server connection if available.
 * @param libraryPath - Path to the library file
 * @param config - Configuration
 * @returns Server connection or null if not available
 */
export async function getServerConnection(
  libraryPath: string,
  config: Config
): Promise<ServerConnection | null> {
  const portfilePath = getPortfilePath();
  const portfileData = await readPortfile(portfilePath);

  // Check if portfile exists
  if (!portfileData) {
    // No server running
    if (config.server.autoStart) {
      // Auto-start server
      await startServerDaemon(libraryPath, config);
      await waitForPortfile(5000); // 5 second timeout
      // Retry connection
      return await getServerConnection(libraryPath, config);
    }
    return null;
  }

  // Check if process is running
  if (!isProcessRunning(portfileData.pid)) {
    // Stale portfile, remove it
    await removePortfile(portfilePath);
    return null;
  }

  // Check if library path matches
  if (!portfileData.library || portfileData.library !== libraryPath) {
    // Server is serving a different library
    return null;
  }

  // Server is running and serving our library
  return {
    baseUrl: `http://localhost:${portfileData.port}`,
    pid: portfileData.pid,
  };
}

/**
 * Start server in daemon mode.
 * @param libraryPath - Path to the library file
 * @param _config - Configuration (reserved for future use)
 */
export async function startServerDaemon(libraryPath: string, _config: Config): Promise<void> {
  // Get the binary path (argv[1] is the script being executed)
  const binaryPath = process.argv[1] || process.execPath;

  // Spawn server in detached daemon mode
  const child = spawn(
    process.execPath,
    [binaryPath, "server", "start", "--daemon", "--library", libraryPath],
    {
      detached: true,
      stdio: "ignore",
    }
  );

  child.unref(); // Allow parent to exit
}

/**
 * Wait for portfile to appear.
 * @param timeoutMs - Timeout in milliseconds
 */
export async function waitForPortfile(timeoutMs: number): Promise<void> {
  const portfilePath = getPortfilePath();
  const startTime = Date.now();
  const checkInterval = 50; // Check every 50ms

  while (Date.now() - startTime < timeoutMs) {
    if (await portfileExists(portfilePath)) {
      return;
    }
    // Wait before next check
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }

  throw new Error(`Server failed to start: portfile not created within ${timeoutMs}ms`);
}
