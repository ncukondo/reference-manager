import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { CslLibrary } from "./types";

/**
 * Convert keyword array to semicolon-separated string
 * @param keywords - Array of keywords or undefined
 * @returns Semicolon-separated string or undefined
 */
function serializeKeyword(keywords: string[] | undefined): string | undefined {
  if (!keywords || keywords.length === 0) {
    return undefined;
  }

  return keywords.join("; ");
}

/**
 * Serialize a CSL-JSON library to a formatted JSON string
 * @param library - CSL-JSON library (array of items)
 * @returns Formatted JSON string with 2-space indentation
 */
export function serializeCslJson(library: CslLibrary): string {
  // Convert keyword arrays to semicolon-separated strings
  const libraryForJson = library.map((item) => {
    const { keyword, ...rest } = item;
    const serializedKeyword = serializeKeyword(keyword);

    if (serializedKeyword === undefined) {
      return rest;
    }

    return {
      ...rest,
      keyword: serializedKeyword,
    };
  });

  return JSON.stringify(libraryForJson, null, 2);
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
