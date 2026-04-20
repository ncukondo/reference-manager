/**
 * Update-check notifier.
 *
 * Kicks off an async version check at CLI entry, then prints a one-line notice
 * to stderr after the user's command completes — but only if the check has
 * already resolved by then. The user's command is never delayed.
 */

import packageJson from "../../package.json" with { type: "json" };
import { type ReleaseInfo, getLatestVersion } from "./check.js";

const SUPPRESSED_COMMANDS = new Set(["upgrade", "completion", "mcp", "server"]);

export interface NotifierOptions {
  isTty?: boolean;
  env?: NodeJS.ProcessEnv;
  currentVersion?: string;
  getLatest?: () => Promise<ReleaseInfo | null>;
  output?: NodeJS.WritableStream;
}

interface NotifierState {
  result: ReleaseInfo | null;
  currentVersion: string;
  output: NodeJS.WritableStream;
  printed: boolean;
}

let state: NotifierState | null = null;
let pending: Promise<void> | null = null;

function isSuppressed(command: string, env: NodeJS.ProcessEnv, isTty: boolean): boolean {
  if (!isTty) return true;
  if (env.REFERENCE_MANAGER_NO_UPDATE_CHECK === "1") return true;
  if (SUPPRESSED_COMMANDS.has(command)) return true;
  return false;
}

export function maybeStartUpdateCheck(command: string, options: NotifierOptions = {}): void {
  state = null;
  pending = null;

  const env = options.env ?? process.env;
  const isTty = options.isTty ?? process.stdout.isTTY === true;

  if (isSuppressed(command, env, isTty)) return;

  const currentVersion = options.currentVersion ?? packageJson.version;
  const output = options.output ?? process.stderr;
  const getLatest = options.getLatest ?? (() => getLatestVersion());

  const localState: NotifierState = {
    result: null,
    currentVersion,
    output,
    printed: false,
  };
  state = localState;

  pending = getLatest().then(
    (release) => {
      localState.result = release;
    },
    () => {
      // Errors are silent; nothing will be printed.
    }
  );
}

export function flushUpdateNotice(): void {
  if (!state || state.printed) return;
  const { result, currentVersion, output } = state;
  if (!result) return;
  if (result.latest === currentVersion) return;
  state.printed = true;
  output.write(
    `\n✨ New version available: ${currentVersion} → ${result.latest}\n   Run: ref upgrade\n`
  );
}

/** Test-only: returns the in-flight check promise (or null if none). */
export function __pendingForTesting(): Promise<void> | null {
  return pending;
}

/** Test-only: resets module state between tests. */
export function __resetForTesting(): void {
  state = null;
  pending = null;
}
