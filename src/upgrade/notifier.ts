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

interface ParsedVersion {
  core: number[];
  prerelease: string[];
}

function parseVersion(version: string): ParsedVersion | null {
  const [core = "", prerelease] = version.split("-", 2);
  const parts = core.split(".").map((part) => Number.parseInt(part, 10));
  if (parts.length === 0 || parts.some((part) => Number.isNaN(part))) return null;
  return { core: parts, prerelease: prerelease ? prerelease.split(".") : [] };
}

function comparePrereleaseIds(a: string, b: string): number {
  const aNum = /^\d+$/.test(a) ? Number.parseInt(a, 10) : null;
  const bNum = /^\d+$/.test(b) ? Number.parseInt(b, 10) : null;
  // Numeric identifiers sort below alphanumeric ones (semver §11).
  if (aNum !== null && bNum !== null) return aNum === bNum ? 0 : aNum < bNum ? -1 : 1;
  if (aNum !== null) return -1;
  if (bNum !== null) return 1;
  return a === b ? 0 : a < b ? -1 : 1;
}

/**
 * Returns true when `latest` is strictly newer than `current` per semver
 * precedence. Falls back to plain inequality when either side is unparseable,
 * matching the old "notify on any mismatch" behavior for exotic versions.
 */
export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  if (!a || !b) return latest !== current;

  const length = Math.max(a.core.length, b.core.length);
  for (let i = 0; i < length; i++) {
    const left = a.core[i] ?? 0;
    const right = b.core[i] ?? 0;
    if (left !== right) return left > right;
  }

  // Equal cores: a release without prerelease outranks one with it.
  if (a.prerelease.length === 0) return b.prerelease.length > 0;
  if (b.prerelease.length === 0) return false;
  const idCount = Math.min(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < idCount; i++) {
    const order = comparePrereleaseIds(a.prerelease[i] ?? "", b.prerelease[i] ?? "");
    if (order !== 0) return order > 0;
  }
  return a.prerelease.length > b.prerelease.length;
}

export function flushUpdateNotice(): void {
  if (!state || state.printed) return;
  const { result, currentVersion, output } = state;
  if (!result) return;
  if (!isNewerVersion(result.latest, currentVersion)) return;
  state.printed = true;
  output.write(
    `\n>>> New version available: ${currentVersion} -> ${result.latest}\n    Run: ref upgrade\n`
  );
}
