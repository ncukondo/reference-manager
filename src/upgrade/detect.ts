/**
 * Install-method detection.
 *
 * Resolves `argv1` (defaults to `process.argv[1]`) through `realpathSync` and
 * pattern-matches the resolved path to determine how the user installed `ref`.
 */

import { existsSync, realpathSync, statSync } from "node:fs";
import { dirname, sep } from "node:path";

export type InstallMethod = "binary" | "npm-global" | "dev" | "npx";

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

function isInsideGitWorktree(startPath: string): boolean {
  let current: string;
  try {
    current = statSync(startPath).isDirectory() ? startPath : dirname(startPath);
  } catch {
    current = dirname(startPath);
  }
  while (true) {
    if (existsSync(`${current}${sep}.git`)) return true;
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
  if (isInsideGitWorktree(resolved)) return "dev";
  if (containsSegment(resolved, "node_modules")) return "npm-global";
  return "binary";
}
