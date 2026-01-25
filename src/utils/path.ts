/**
 * Cross-platform path utilities
 *
 * IMPORTANT: Path handling conventions in this codebase:
 *
 * 1. File system operations (fs.readFile, fs.writeFile, etc.)
 *    → Use NATIVE paths (path.join result as-is)
 *
 * 2. User-facing output (CLI output, API responses, result.path)
 *    → Use NORMALIZED paths (forward slashes via normalizePathForOutput)
 *
 * 3. Test expectations for output paths
 *    → Use NORMALIZED paths to match actual output
 */

/**
 * Normalize path separators to forward slashes for consistent cross-platform output.
 *
 * Use this function ONLY for user-facing output, NOT for file system operations.
 *
 * @example
 * // In operation result
 * return { success: true, path: normalizePathForOutput(filePath) };
 *
 * // NOT for fs operations - use native path directly
 * await fs.readFile(filePath); // filePath from path.join, NOT normalized
 */
export function normalizePathForOutput(p: string): string {
  return p.replace(/\\/g, "/");
}
