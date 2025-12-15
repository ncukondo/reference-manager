import { promises as fs } from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

/**
 * Get the default portfile path.
 * @returns The path to the portfile in the system's temp directory.
 */
export function getPortfilePath(): string {
  const tmpDir = os.tmpdir();
  return path.join(tmpDir, "reference-manager", "server.port");
}

/**
 * Write port and PID to the portfile.
 * @param portfilePath - Path to the portfile
 * @param port - Server port number
 * @param pid - Server process ID
 */
export async function writePortfile(
  portfilePath: string,
  port: number,
  pid: number
): Promise<void> {
  // Create parent directory if it doesn't exist
  const dir = path.dirname(portfilePath);
  await fs.mkdir(dir, { recursive: true });

  // Write portfile with port and pid
  const content = JSON.stringify({ port, pid }, null, 2);
  await fs.writeFile(portfilePath, content, "utf-8");
}

/**
 * Read port and PID from the portfile.
 * @param portfilePath - Path to the portfile
 * @returns Object with port and pid, or null if file doesn't exist or is invalid
 */
export async function readPortfile(
  portfilePath: string
): Promise<{ port: number; pid: number } | null> {
  try {
    const content = await fs.readFile(portfilePath, "utf-8");
    const data = JSON.parse(content);

    // Validate required fields
    if (typeof data.port !== "number" || typeof data.pid !== "number") {
      return null;
    }

    return { port: data.port, pid: data.pid };
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
