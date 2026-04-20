/**
 * `ref upgrade` command — applies a new release via the detected install method.
 *
 * See: spec/features/self-upgrade.md
 */

import { realpathSync } from "node:fs";
import { join } from "node:path";
import type { Command } from "commander";
import packageJson from "../../../package.json" with { type: "json" };
import {
  type UpgradeBinaryOptions,
  type UpgradeResult,
  upgradeBinary,
} from "../../upgrade/apply-binary.js";
import { type UpgradeNpmOptions, upgradeNpmGlobal } from "../../upgrade/apply-npm.js";
import { type InstallMethod, detectInstallMethod } from "../../upgrade/detect.js";
import { ExitCode, setExitCode } from "../helpers.js";

export interface UpgradeCommandOptions {
  check?: boolean;
  version?: string;
  yes?: boolean;
  installDir?: string;
}

export interface RunUpgradeDeps {
  installMethod?: InstallMethod;
  argv1?: string;
  currentVersion?: string;
  upgradeBinaryFn?: (options: UpgradeBinaryOptions) => Promise<UpgradeResult>;
  upgradeNpmFn?: (options: UpgradeNpmOptions) => Promise<UpgradeResult>;
  stdout?: NodeJS.WritableStream;
  stderr?: NodeJS.WritableStream;
}

export interface RunUpgradeResult {
  exitCode: 0 | 1 | 2;
  method: InstallMethod;
  result?: UpgradeResult;
}

function resolveDestPath(argv1: string, installDir: string | undefined): string {
  if (installDir) {
    const basename = process.platform === "win32" ? "ref.exe" : "ref";
    return join(installDir, basename);
  }
  try {
    return realpathSync(argv1);
  } catch {
    return argv1;
  }
}

function devGuidance(method: "dev" | "npx"): string {
  if (method === "npx") {
    return (
      "Detected an npx invocation (cache-resident copy). `ref upgrade` does nothing here — " +
      "npx fetches the latest on each run, or pin a version with `npx @ncukondo/reference-manager@<tag>`.\n"
    );
  }
  return (
    "Detected a dev install (npm link or in-tree). `ref upgrade` does not modify dev trees. " +
    "Use `git pull && npm run build` in the source checkout, or reinstall with `install.sh` " +
    "or `npm i -g @ncukondo/reference-manager`.\n"
  );
}

function exitCodeFor(status: UpgradeResult["status"]): 0 | 1 {
  return status === "error" ? 1 : 0;
}

export function formatUpgradeResult(result: UpgradeResult): string {
  const from = result.fromVersion ?? "?";
  const to = result.toVersion ?? "?";
  switch (result.status) {
    case "success":
      return `Upgraded ref ${from} -> ${to}`;
    case "already-up-to-date":
      return `Already up to date (${to})`;
    case "guidance": {
      const base = result.message ?? `Run the upgrade for ${from} -> ${to}`;
      return result.url ? `${base} (${result.url})` : base;
    }
    case "error":
      return `Error: ${result.error ?? "upgrade failed"}`;
  }
}

function buildBinaryOptions(
  options: UpgradeCommandOptions,
  argv1: string,
  currentVersion: string
): UpgradeBinaryOptions {
  const destPath = resolveDestPath(argv1, options.installDir);
  const out: UpgradeBinaryOptions = { destPath, currentVersion };
  if (options.check !== undefined) out.check = options.check;
  if (options.version !== undefined) out.version = options.version;
  return out;
}

function buildNpmOptions(
  options: UpgradeCommandOptions,
  currentVersion: string
): UpgradeNpmOptions {
  const out: UpgradeNpmOptions = { currentVersion };
  if (options.check !== undefined) out.check = options.check;
  if (options.yes !== undefined) out.yes = options.yes;
  if (options.version !== undefined) out.version = options.version;
  return out;
}

export async function runUpgrade(
  options: UpgradeCommandOptions,
  deps: RunUpgradeDeps = {}
): Promise<RunUpgradeResult> {
  const installMethod = deps.installMethod ?? detectInstallMethod(deps.argv1 ?? process.argv[1]);
  const argv1 = deps.argv1 ?? process.argv[1] ?? "";
  const currentVersion = deps.currentVersion ?? packageJson.version;
  const upgradeBinaryFn = deps.upgradeBinaryFn ?? upgradeBinary;
  const upgradeNpmFn = deps.upgradeNpmFn ?? upgradeNpmGlobal;
  const stdout = deps.stdout ?? process.stdout;
  const stderr = deps.stderr ?? process.stderr;

  if (installMethod === "dev" || installMethod === "npx") {
    stderr.write(devGuidance(installMethod));
    return { exitCode: 2, method: installMethod };
  }

  const result =
    installMethod === "binary"
      ? await upgradeBinaryFn(buildBinaryOptions(options, argv1, currentVersion))
      : await upgradeNpmFn(buildNpmOptions(options, currentVersion));

  const target = result.status === "error" ? stderr : stdout;
  target.write(`${formatUpgradeResult(result)}\n`);

  return { exitCode: exitCodeFor(result.status), method: installMethod, result };
}

export function registerUpgradeCommand(program: Command): void {
  program
    .command("upgrade")
    .description("Upgrade `ref` to the latest release (or a pinned version)")
    .option("--check", "Report current vs. latest without applying any upgrade")
    .option("--version <tag>", "Pin to a specific release tag (e.g. v0.33.4)")
    .option("-y, --yes", "Skip confirmation prompts (applies to npm-global strategy)")
    .option("--install-dir <path>", "Override install directory for the single-binary strategy")
    .action(async (options: UpgradeCommandOptions) => {
      const result = await runUpgrade(options);
      setExitCode(result.exitCode === 0 ? ExitCode.SUCCESS : result.exitCode);
    });
}
