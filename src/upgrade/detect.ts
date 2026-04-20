/**
 * Install-method detection.
 *
 * Resolves `argv1` (defaults to `process.argv[1]`) through `realpathSync` and
 * pattern-matches the resolved path to determine how the user installed `ref`.
 *
 * TODO(stage2): Wire this into `ref upgrade` (see Step 4/6 of
 * `spec/tasks/20260420-01-self-upgrade.md`). It is currently only used by
 * tests and will select the upgrade strategy once the command lands.
 */

import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, sep } from "node:path";

export type InstallMethod = "binary" | "npm-global" | "dev" | "npx";

/**
 * Typical install locations for the single-binary `ref`. Matched as an
 * embedded path chain so a resolved path like `/home/user/.local/bin/ref`
 * wins over a `.git` directory in an ancestor (e.g. a dotfiles repo at $HOME).
 */
const BINARY_PATH_CHAINS: readonly string[][] = [
  [".local", "bin"],
  ["usr", "local", "bin"],
  ["opt", "homebrew", "bin"],
  ["opt", "local", "bin"],
];

function safeRealpath(p: string): string {
  try {
    return realpathSync(p);
  } catch {
    return p;
  }
}

function containsSegment(path: string, segment: string): boolean {
  const wrapped = `${sep}${segment}${sep}`;
  return path.includes(wrapped) || path.endsWith(`${sep}${segment}`);
}

function containsPathChain(path: string, chain: readonly string[]): boolean {
  const wrapped = `${sep}${chain.join(sep)}${sep}`;
  return path.includes(wrapped);
}

function isTypicalBinaryPath(path: string): boolean {
  return BINARY_PATH_CHAINS.some((chain) => containsPathChain(path, chain));
}

/**
 * True only when `startPath` is inside a git worktree that looks like a
 * reference-manager checkout (i.e. the repo root contains `package.json`).
 *
 * The `package.json` check avoids false positives for unrelated ancestor
 * repos — e.g. a dotfiles repo at $HOME picking up a plain binary installed
 * at `~/.local/bin/ref`.
 */
function isInsideGitWorktree(startPath: string): boolean {
  let current: string;
  try {
    current = statSync(startPath).isDirectory() ? startPath : dirname(startPath);
  } catch {
    current = dirname(startPath);
  }
  while (true) {
    if (existsSync(`${current}${sep}.git`)) {
      return existsSync(`${current}${sep}package.json`);
    }
    const parent = dirname(current);
    if (parent === current) return false;
    current = parent;
  }
}

export function detectInstallMethod(argv1?: string): InstallMethod {
  const source = argv1 ?? process.argv[1];
  if (!source) return "binary";

  const resolved = safeRealpath(source);

  if (containsSegment(resolved, "_npx")) return "npx";
  if (isTypicalBinaryPath(resolved)) return "binary";
  if (isInsideGitWorktree(resolved)) return "dev";
  if (containsSegment(resolved, "node_modules")) return "npm-global";
  return "binary";
}
