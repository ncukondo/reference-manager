import { execFile } from "node:child_process";
import fs from "node:fs";

export interface ClipboardCommand {
  command: string;
  args: string[];
}

export interface ClipboardResult {
  success: boolean;
  error?: string;
}

/**
 * Detect if running in Windows Subsystem for Linux (WSL)
 */
function isWSL(): boolean {
  if (process.env.WSL_DISTRO_NAME !== undefined) {
    return true;
  }
  try {
    return fs.existsSync("/proc/sys/fs/binfmt_misc/WSLInterop");
  } catch {
    return false;
  }
}

/**
 * Detect available system clipboard command.
 * Detection order: pbcopy (macOS) → clip.exe (WSL) → wl-copy (Wayland) → xclip (X11)
 */
export function detectClipboardCommand(): ClipboardCommand | null {
  if (process.platform === "darwin") {
    return { command: "pbcopy", args: [] };
  }

  if (process.platform === "linux") {
    if (isWSL()) {
      return { command: "clip.exe", args: [] };
    }
    if (process.env.WAYLAND_DISPLAY) {
      return { command: "wl-copy", args: [] };
    }
    if (process.env.DISPLAY) {
      return { command: "xclip", args: ["-selection", "clipboard"] };
    }
  }

  return null;
}

/**
 * Copy text to system clipboard.
 * Returns success status and optional error message.
 */
export function copyToClipboard(text: string): Promise<ClipboardResult> {
  const clipboardCmd = detectClipboardCommand();
  if (!clipboardCmd) {
    return Promise.resolve({ success: false, error: "No clipboard command available" });
  }

  return new Promise<ClipboardResult>((resolve) => {
    const child = execFile(clipboardCmd.command, clipboardCmd.args, (error: Error | null) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true });
      }
    });

    if (child.stdin) {
      child.stdin.write(text);
      child.stdin.end();
    }
  });
}
