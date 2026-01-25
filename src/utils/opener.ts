import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";

/**
 * Detect if running in Windows Subsystem for Linux (WSL)
 */
export function isWSL(): boolean {
  // Check for WSL_DISTRO_NAME environment variable
  if (process.env.WSL_DISTRO_NAME !== undefined) {
    return true;
  }

  // Check for WSLInterop file
  try {
    return fs.existsSync("/proc/sys/fs/binfmt_misc/WSLInterop");
  } catch {
    return false;
  }
}

/**
 * Get the system opener command for the specified platform.
 * @param platform - The platform (darwin, linux, win32)
 * @param wsl - Whether running in WSL (defaults to isWSL())
 * @returns The command array to execute
 */
export function getOpenerCommand(platform: string, wsl: boolean = isWSL()): string[] {
  switch (platform) {
    case "darwin":
      return ["open"];
    case "linux":
      if (wsl) {
        return ["wslview"];
      }
      return ["xdg-open"];
    case "win32":
      return ["cmd", "/c", "start", ""];
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}

/**
 * Open a file with the system's default application.
 * @param filePath - The path to the file to open
 * @param platform - The platform (defaults to process.platform)
 */
export async function openWithSystemApp(
  filePath: string,
  platform: string = process.platform
): Promise<void> {
  const wsl = isWSL();
  const commandParts = getOpenerCommand(platform, wsl);
  const [command, ...baseArgs] = commandParts;
  const args = [...baseArgs, filePath];

  // Use a timer to keep the event loop alive while waiting for the close event.
  // In Node.js 22+, after enquirer prompts complete, the event loop may have no
  // active handles. Combined with proc.unref(), this can cause Node.js to exit
  // before the close event fires.
  const keepAliveTimer = setInterval(() => {
    // No-op: timer exists solely to keep event loop active
  }, 60000);

  return new Promise<void>((resolve, reject) => {
    const proc: ChildProcess = spawn(command as string, args, {
      detached: true,
      stdio: "ignore",
    });

    const cleanup = (): void => {
      clearInterval(keepAliveTimer);
    };

    proc.on("error", (err: NodeJS.ErrnoException) => {
      cleanup();
      // Check if the command was not found (ENOENT)
      if (err.code === "ENOENT") {
        if (wsl && command === "wslview") {
          reject(new Error("wslview not found. Install with: sudo apt install wslu"));
        } else if (command === "xdg-open") {
          reject(new Error("xdg-open not found. Install a desktop environment or xdg-utils."));
        } else {
          reject(new Error(`Opener command '${command}' not found`));
        }
      } else {
        reject(new Error(`Failed to open: ${filePath}`));
      }
    });

    proc.on("close", (code: number | null) => {
      cleanup();
      // wslview may return non-zero exit codes even on success
      // We treat the operation as successful if the process exited without error
      if (code === 0 || (wsl && command === "wslview")) {
        resolve();
      } else {
        reject(new Error(`Failed to open: ${filePath}`));
      }
    });

    proc.unref();
  });
}
