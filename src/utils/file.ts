import writeFileAtomicLib from "write-file-atomic";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

/**
 * Write file atomically with parent directory creation
 */
export async function writeFileAtomic(filePath: string, content: string): Promise<void> {
  await ensureDirectoryExists(dirname(filePath));
  await writeFileAtomicLib(filePath, content, { encoding: "utf-8" });
}

/**
 * Ensure directory exists, creating it recursively if necessary
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true });
}
