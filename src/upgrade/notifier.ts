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
  /** When true, suppress the check (e.g. user passed `--no-update-check`). */
  noUpdateCheck?: boolean;
}

interface NotifierState {
  result: ReleaseInfo | null;
  currentVersion: string;
  output: NodeJS.WritableStream;
  printed: boolean;
}

let state: NotifierState | null = null;
let exitListenerRegistered = false;

function ensureExitListener(): void {
  if (exitListenerRegistered) return;
  exitListenerRegistered = true;
  process.on("exit", () => {
    flushUpdateNotice();
  });
}

function isSuppressed(
  command: string,
  env: NodeJS.ProcessEnv,
  isTty: boolean,
  noUpdateCheckFlag: boolean
): boolean {
  if (!isTty) return true;
  if (noUpdateCheckFlag) return true;
  if (env.REFERENCE_MANAGER_NO_UPDATE_CHECK === "1") return true;
  if (SUPPRESSED_COMMANDS.has(command)) return true;
  return false;
}

/**
 * Kicks off the async update check. Returns a promise that resolves once the
 * check is done (or immediately, if the check was suppressed). Production
 * callers typically ignore the returned promise; tests can await it.
 */
export function maybeStartUpdateCheck(
  command: string,
  options: NotifierOptions = {}
): Promise<void> {
  state = null;

  const env = options.env ?? process.env;
  const isTty = options.isTty ?? process.stdout.isTTY === true;
  const noUpdateCheck = options.noUpdateCheck ?? false;

  if (isSuppressed(command, env, isTty, noUpdateCheck)) return Promise.resolve();

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
  ensureExitListener();

  return getLatest().then(
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
