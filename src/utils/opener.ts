import { type ChildProcess, spawn } from "node:child_process";

/**
 * Get the system opener command for the specified platform.
 * @param platform - The platform (darwin, linux, win32)
 * @returns The command array to execute
 */
export function getOpenerCommand(platform: string): string[] {
  switch (platform) {
    case "darwin":
      return ["open"];
    case "linux":
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
  const commandParts = getOpenerCommand(platform);
  const [command, ...baseArgs] = commandParts;
  const args = [...baseArgs, filePath];

  return new Promise((resolve, reject) => {
    const proc: ChildProcess = spawn(command as string, args, {
      detached: true,
      stdio: "ignore",
    });

    proc.on("error", () => {
      reject(new Error(`Failed to open file: ${filePath}`));
    });

    proc.on("close", (code: number | null) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Failed to open file: ${filePath}`));
      }
    });

    proc.unref();
  });
}
