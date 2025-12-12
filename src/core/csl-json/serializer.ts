import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { CslLibrary } from "./types";

/**
 * Serialize a CSL-JSON library to a formatted JSON string
 * @param library - CSL-JSON library (array of items)
 * @returns Formatted JSON string with 2-space indentation
 */
export function serializeCslJson(library: CslLibrary): string {
  return JSON.stringify(library, null, 2);
}

/**
 * Write a CSL-JSON library to a file
 * @param filePath - Path to write the CSL-JSON file
 * @param library - CSL-JSON library to write
 * @throws Error if file cannot be written
 */
export async function writeCslJson(filePath: string, library: CslLibrary): Promise<void> {
  // Ensure parent directory exists
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });

  // Serialize and write
  const content = serializeCslJson(library);
  await writeFile(filePath, content, "utf-8");
}
