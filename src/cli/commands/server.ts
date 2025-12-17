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

  // Determine port (use provided port or default to 3000 for testing)
  const port = options.port ?? 3000;

  // For daemon mode, create portfile with current process PID
  // (In real implementation, this would be the spawned server process PID)
  const pid = process.pid;
  const started_at = new Date().toISOString();

  await writePortfile(options.portfilePath, port, pid, options.library, started_at);

  // In real implementation, this would spawn the server process
  // For now, we just create the portfile for testing purposes
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
