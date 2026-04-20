/**
 * Binary upgrade strategy for `ref upgrade` on single-binary installs.
 *
 * Downloads the latest release asset for the current platform to
 * `{dest}.tmp.{pid}`, verifies it by invoking `--version`, then atomically
 * replaces the running binary.
 *
 * See: spec/features/self-upgrade.md §Atomic replace.
 */

import { execFile } from "node:child_process";
import { chmodSync, existsSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { type ReleaseInfo, getLatestVersion } from "./check.js";

const execFileAsync = promisify(execFile);

const REPO = "ncukondo/reference-manager";

export type UpgradeStatus = "success" | "already-up-to-date" | "guidance" | "error";

export interface UpgradeResult {
  status: UpgradeStatus;
  fromVersion?: string;
  toVersion?: string;
  url?: string;
  message?: string;
  error?: string;
}

export interface UpgradeBinaryOptions {
  /** Absolute path to the binary that should be replaced. */
  destPath: string;
  /** The version of the currently running `ref`, without leading `v`. */
  currentVersion: string;
  /** Explicit release tag (e.g. "v0.34.0" or "0.34.0"). When unset, uses `getLatest`. */
  version?: string;
  /** Report mode only: do not mutate anything. */
  check?: boolean;
  /** Defaults to `process.platform`. */
  platform?: NodeJS.Platform;
  /** Defaults to `process.arch`. */
  arch?: string;
  /** Defaults to `process.pid`. */
  pid?: number;
  /** Injection points. */
  fetch?: typeof globalThis.fetch;
  getLatest?: () => Promise<ReleaseInfo | null>;
  /**
   * Runs the downloaded binary's `--version` command and returns the stdout
   * (or null on failure). Injected so unit tests don't execute real children.
   */
  verifyBinary?: (path: string) => Promise<string | null>;
}

export function computeAssetName(platform: NodeJS.Platform, arch: string): string {
  const osName = mapPlatform(platform);
  const archName = mapArch(arch);
  const suffix = osName === "windows" ? ".exe" : "";
  return `ref-${osName}-${archName}${suffix}`;
}

function mapPlatform(platform: NodeJS.Platform): "linux" | "darwin" | "windows" {
  if (platform === "linux") return "linux";
  if (platform === "darwin") return "darwin";
  if (platform === "win32") return "windows";
  throw new Error(`unsupported platform: ${platform}`);
}

function mapArch(arch: string): "x64" | "arm64" {
  if (arch === "x64") return "x64";
  if (arch === "arm64") return "arm64";
  throw new Error(`unsupported arch: ${arch}`);
}

function normalizeTag(tag: string): string {
  return tag.startsWith("v") ? tag : `v${tag}`;
}

function stripV(tag: string): string {
  return tag.startsWith("v") ? tag.slice(1) : tag;
}

function buildAssetUrl(tag: string, assetName: string): string {
  return `https://github.com/${REPO}/releases/download/${tag}/${assetName}`;
}

function errorResult(
  fromVersion: string,
  error: string,
  extras: { toVersion?: string; url?: string } = {}
): UpgradeResult {
  return {
    status: "error",
    fromVersion,
    ...(extras.toVersion !== undefined && { toVersion: extras.toVersion }),
    ...(extras.url !== undefined && { url: extras.url }),
    error,
  };
}

/**
 * Default verifier: execs `{path} --version` with a short timeout. Returns the
 * trimmed stdout on success, or null if the binary fails to run.
 */
async function defaultVerifyBinary(path: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync(path, ["--version"], {
      timeout: 5000,
    });
    const trimmed = stdout.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

interface ResolvedTarget {
  targetTag: string;
  targetVersion: string;
  releaseHtmlUrl?: string;
}

async function resolveTarget(
  pinnedVersion: string | undefined,
  getLatest: () => Promise<ReleaseInfo | null>
): Promise<ResolvedTarget | { error: string }> {
  if (pinnedVersion) {
    const targetTag = normalizeTag(pinnedVersion);
    return { targetTag, targetVersion: stripV(targetTag) };
  }
  const release = await getLatest();
  if (!release) {
    return { error: "Could not determine the latest release. Check your network connection." };
  }
  const targetTag = normalizeTag(release.latest);
  return {
    targetTag,
    targetVersion: stripV(targetTag),
    releaseHtmlUrl: release.url,
  };
}

async function downloadAsset(
  url: string,
  tmpPath: string,
  fetchFn: typeof globalThis.fetch
): Promise<{ error?: string }> {
  let response: Response;
  try {
    response = await fetchFn(url);
  } catch (error) {
    return {
      error: `Download failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  if (response.status === 404) {
    return { error: `Download returned 404. Asset not found at: ${url}` };
  }
  if (!response.ok) {
    return { error: `Download failed with HTTP ${response.status}: ${url}` };
  }

  try {
    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(tmpPath, buffer);
    chmodSync(tmpPath, 0o755);
  } catch (error) {
    if (existsSync(tmpPath)) {
      try {
        rmSync(tmpPath, { force: true });
      } catch {
        // ignore
      }
    }
    return {
      error: `Failed to write downloaded binary: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return {};
}

function atomicReplace(
  tmpPath: string,
  destPath: string,
  platform: NodeJS.Platform
): { error?: string } {
  try {
    if (platform === "win32") {
      const oldPath = `${destPath}.old`;
      if (existsSync(oldPath)) {
        try {
          rmSync(oldPath, { force: true });
        } catch {
          // Best-effort: ignore if .old cannot be removed.
        }
      }
      if (existsSync(destPath)) {
        renameSync(destPath, oldPath);
      }
      renameSync(tmpPath, destPath);
    } else {
      if (existsSync(destPath)) {
        rmSync(destPath, { force: true });
      }
      renameSync(tmpPath, destPath);
    }
  } catch (error) {
    return {
      error: `Failed to replace ${destPath}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
  return {};
}

export async function upgradeBinary(options: UpgradeBinaryOptions): Promise<UpgradeResult> {
  const {
    destPath,
    currentVersion,
    version: pinnedVersion,
    check = false,
    platform = process.platform,
    arch = process.arch,
    pid = process.pid,
    fetch: fetchFn = globalThis.fetch,
    getLatest = getLatestVersion,
    verifyBinary = defaultVerifyBinary,
  } = options;

  const resolved = await resolveTarget(pinnedVersion, getLatest);
  if ("error" in resolved) {
    return errorResult(currentVersion, resolved.error);
  }
  const { targetTag, targetVersion, releaseHtmlUrl } = resolved;

  // Fast path: already up-to-date (skipped in check mode so we still report).
  if (!pinnedVersion && currentVersion === targetVersion && !check) {
    return {
      status: "already-up-to-date",
      fromVersion: currentVersion,
      toVersion: targetVersion,
      ...(releaseHtmlUrl !== undefined && { url: releaseHtmlUrl }),
    };
  }

  let assetName: string;
  try {
    assetName = computeAssetName(platform, arch);
  } catch (error) {
    return errorResult(currentVersion, error instanceof Error ? error.message : String(error), {
      toVersion: targetVersion,
    });
  }
  const assetUrl = buildAssetUrl(targetTag, assetName);

  if (check) {
    return {
      status:
        currentVersion === targetVersion && !pinnedVersion ? "already-up-to-date" : "guidance",
      fromVersion: currentVersion,
      toVersion: targetVersion,
      url: assetUrl,
    };
  }

  const tmpPath = `${destPath}.tmp.${pid}`;
  const dl = await downloadAsset(assetUrl, tmpPath, fetchFn);
  if (dl.error) {
    return errorResult(currentVersion, dl.error, { toVersion: targetVersion, url: assetUrl });
  }

  const verified = await verifyBinary(tmpPath);
  if (!verified) {
    return errorResult(
      currentVersion,
      `Verification failed: downloaded binary at ${tmpPath} did not report a version. The file has been left in place for inspection.`,
      { toVersion: targetVersion, url: assetUrl }
    );
  }

  const replaced = atomicReplace(tmpPath, destPath, platform);
  if (replaced.error) {
    return errorResult(currentVersion, replaced.error, {
      toVersion: targetVersion,
      url: assetUrl,
    });
  }

  return {
    status: "success",
    fromVersion: currentVersion,
    toVersion: targetVersion,
    url: assetUrl,
    message: verified,
  };
}
