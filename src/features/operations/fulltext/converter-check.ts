/**
 * Converter availability checking utilities.
 */

import { exec, execFile } from "node:child_process";

/** Check if a command is available on the system using which/where */
export async function isCommandAvailable(command: string): Promise<boolean> {
  const lookupCmd = process.platform === "win32" ? "where" : "which";
  return new Promise((resolve) => {
    execFile(lookupCmd, [command], (err) => {
      resolve(err === null);
    });
  });
}

/** Run a custom check command to verify converter availability */
export async function runCheckCommand(checkCommand: string): Promise<boolean> {
  return new Promise((resolve) => {
    exec(checkCommand, (err) => {
      resolve(err === null);
    });
  });
}
