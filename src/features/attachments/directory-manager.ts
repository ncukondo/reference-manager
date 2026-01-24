import fs from "node:fs/promises";
import path from "node:path";
import { normalizePathForOutput } from "../../utils/path.js";
import { generateDirectoryName } from "./directory.js";
import type { Attachments } from "./types.js";

/**
 * Reference with attachment-related fields
 */
interface ReferenceForAttachments {
  id: string;
  PMID?: string;
  custom?: {
    uuid?: string;
    attachments?: Attachments;
  };
}

/**
 * Get the full directory path for a reference's attachments
 *
 * Uses existing directory name from metadata if available,
 * otherwise generates a new one.
 */
export function getDirectoryPath(ref: ReferenceForAttachments, baseDir: string): string {
  const existingDir = ref.custom?.attachments?.directory;
  if (existingDir) {
    // Normalize to forward slashes for consistent cross-platform output
    return normalizePathForOutput(path.join(baseDir, existingDir));
  }

  // Generate new directory name
  const dirName = generateDirectoryName(ref as Parameters<typeof generateDirectoryName>[0]);
  // Normalize to forward slashes for consistent cross-platform output
  return normalizePathForOutput(path.join(baseDir, dirName));
}

/**
 * Ensure the attachments directory exists for a reference
 *
 * Creates the directory if it doesn't exist.
 * Returns the full directory path.
 */
export async function ensureDirectory(
  ref: ReferenceForAttachments,
  baseDir: string
): Promise<string> {
  const dirPath = getDirectoryPath(ref, baseDir);

  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    // Ignore if directory already exists
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
      throw error;
    }
  }

  return dirPath;
}

/**
 * Delete a directory if it's empty
 *
 * Does nothing if the directory is not empty or doesn't exist.
 */
export async function deleteDirectoryIfEmpty(dirPath: string): Promise<void> {
  try {
    const files = await fs.readdir(dirPath);
    if (files.length === 0) {
      await fs.rmdir(dirPath);
    }
  } catch (error) {
    // Ignore if directory doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

/**
 * Rename a directory
 *
 * Does nothing if the paths are the same or old directory doesn't exist.
 */
export async function renameDirectory(oldPath: string, newPath: string): Promise<void> {
  if (oldPath === newPath) {
    return;
  }

  try {
    await fs.rename(oldPath, newPath);
  } catch (error) {
    // Ignore if old directory doesn't exist
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}
