import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { writeFileAtomic } from "../utils/file.js";

/**
 * Get the default portfile path.
 * @returns The path to the portfile in the system's temp directory.
 */
export function getPortfilePath(): string {
  const tmpDir = os.tmpdir();
  return path.join(tmpDir, "reference-manager", "server.port");
}

/**
 * Write port, PID, library path, and optionally started_at to the portfile.
 * @param portfilePath - Path to the portfile
 * @param port - Server port number
 * @param pid - Server process ID
 * @param library - Path to the library file
 * @param started_at - Optional ISO 8601 timestamp of when the server started
 */
export async function writePortfile(
  portfilePath: string,
  port: number,
  pid: number,
  library: string,
  started_at?: string
): Promise<void> {
  // Write portfile with port, pid, library, and optionally started_at
  const data: Record<string, unknown> = { port, pid, library };
  if (started_at !== undefined) {
    data.started_at = started_at;
  }
  const content = JSON.stringify(data, null, 2);
  await writeFileAtomic(portfilePath, content);
}

/**
 * Read port, PID, library, and optionally started_at from the portfile.
 * @param portfilePath - Path to the portfile
 * @returns Object with port, pid, library (if present), and started_at (if present), or null if file doesn't exist or is invalid
 */
export async function readPortfile(portfilePath: string): Promise<{
  port: number;
  pid: number;
  library?: string;
  started_at?: string;
} | null> {
  try {
    const content = await fs.readFile(portfilePath, "utf-8");
    const data = JSON.parse(content);

    // Validate required fields (port and pid are always required)
    if (typeof data.port !== "number" || typeof data.pid !== "number") {
      return null;
    }

    // Build result with required fields
    const result: {
      port: number;
      pid: number;
      library?: string;
      started_at?: string;
    } = {
      port: data.port,
      pid: data.pid,
    };

    // Add optional fields if present
    if (typeof data.library === "string") {
      result.library = data.library;
    }
    if (typeof data.started_at === "string") {
      result.started_at = data.started_at;
    }

    return result;
  } catch {
    // File doesn't exist or invalid JSON
    return null;
  }
}

/**
 * Check if the portfile exists.
 * @param portfilePath - Path to the portfile
 * @returns True if portfile exists, false otherwise
 */
export async function portfileExists(portfilePath: string): Promise<boolean> {
  try {
    await fs.access(portfilePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Remove the portfile.
 * @param portfilePath - Path to the portfile
 */
export async function removePortfile(portfilePath: string): Promise<void> {
  try {
    await fs.unlink(portfilePath);
  } catch {
    // Ignore if file doesn't exist
  }
}

/**
 * Check if a process with the given PID is running.
 * @param pid - Process ID to check
 * @returns True if process is running, false otherwise
 */
export function isProcessRunning(pid: number): boolean {
  if (pid <= 0) {
    return false;
  }

  try {
    // Sending signal 0 checks if the process exists without killing it
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
