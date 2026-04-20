/**
 * npm-global upgrade strategy.
 *
 * Without `--yes`: prints the exact `npm i -g …` command and exits without
 * mutating anything. With `--yes`: runs the command directly.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { UpgradeResult } from "./apply-binary.js";
import { type ReleaseInfo, getLatestVersion } from "./check.js";

const execFileAsync = promisify(execFile);

const PACKAGE_NAME = "@ncukondo/reference-manager";

export interface RunCommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface UpgradeNpmOptions {
  currentVersion: string;
  /** Explicit tag like "v0.34.0" or "0.34.0". Defaults to the getLatest result. */
  version?: string;
  /** `--check`: report only, no action. */
  check?: boolean;
  /** `--yes`: run npm instead of printing the command. */
  yes?: boolean;
  /** Injection points. */
  getLatest?: () => Promise<ReleaseInfo | null>;
  runCommand?: (command: string, args: string[]) => Promise<RunCommandResult>;
}

export type { UpgradeResult };

function stripV(tag: string): string {
  return tag.startsWith("v") ? tag.slice(1) : tag;
}

export async function defaultRunCommand(
  command: string,
  args: string[]
): Promise<RunCommandResult> {
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { encoding: "utf-8" });
    return { exitCode: 0, stdout, stderr };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      code?: number | string;
      stdout?: string;
      stderr?: string;
    };
    if (err.code === "ENOENT") {
      return {
        exitCode: 127,
        stdout: "",
        stderr: `${command} not found in PATH — install Node.js to use the npm-global upgrade path`,
      };
    }
    const exitCode = typeof err.code === "number" ? err.code : 1;
    return {
      exitCode,
      stdout: err.stdout ?? "",
      stderr: err.stderr ?? err.message ?? "",
    };
  }
}

export async function upgradeNpmGlobal(options: UpgradeNpmOptions): Promise<UpgradeResult> {
  const {
    currentVersion,
    version: pinnedVersion,
    check = false,
    yes = false,
    getLatest = getLatestVersion,
    runCommand = defaultRunCommand,
  } = options;

  let targetVersion: string;
  let specifier: string;
  if (pinnedVersion) {
    targetVersion = stripV(pinnedVersion);
    specifier = targetVersion;
  } else {
    const release = await getLatest();
    if (!release) {
      return {
        status: "error",
        fromVersion: currentVersion,
        error: "Could not determine the latest release. Check your network connection.",
      };
    }
    targetVersion = stripV(release.latest);
    specifier = "latest";
  }

  const commandArgs = ["i", "-g", `${PACKAGE_NAME}@${specifier}`];
  const commandLine = `npm ${commandArgs.join(" ")}`;

  if (!pinnedVersion && currentVersion === targetVersion && !check) {
    return {
      status: "already-up-to-date",
      fromVersion: currentVersion,
      toVersion: targetVersion,
      message: commandLine,
    };
  }

  if (check || !yes) {
    return {
      status: "guidance",
      fromVersion: currentVersion,
      toVersion: targetVersion,
      message: commandLine,
    };
  }

  const result = await runCommand("npm", commandArgs);
  if (result.exitCode !== 0) {
    const details = result.stderr.trim() || result.stdout.trim();
    return {
      status: "error",
      fromVersion: currentVersion,
      toVersion: targetVersion,
      message: commandLine,
      error: `npm exited with code ${result.exitCode}${details ? `: ${details}` : ""}`,
    };
  }

  return {
    status: "success",
    fromVersion: currentVersion,
    toVersion: targetVersion,
    message: commandLine,
  };
}
