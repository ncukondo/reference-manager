import { writeFileAtomic } from "../../utils/file.js";
import type { CslItem, CslLibrary } from "./types";

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
 * Convert a CSL item to its spec-compliant serializable form.
 *
 * The in-memory `keyword` field is an array, but CSL-JSON expects a
 * semicolon-separated string. This normalizes `keyword` and omits the field
 * when it is empty or undefined. Use this at any output boundary (storage
 * write, `export` command) so emitted CSL-JSON is always valid.
 *
 * @param item - CSL item with in-memory (array) keyword
 * @returns Item with `keyword` normalized to a string (or omitted)
 */
export function toSerializableCslItem(item: CslItem): Record<string, unknown> {
  const { keyword, ...rest } = item;
  const serializedKeyword = serializeKeyword(keyword);

  if (serializedKeyword === undefined) {
    return rest;
  }

  return {
    ...rest,
    keyword: serializedKeyword,
  };
}

/**
 * Convert a CSL library to its spec-compliant serializable form.
 * @param library - CSL-JSON library (array of items)
 * @returns Array of items with normalized keyword fields
 */
export function toSerializableCslLibrary(library: CslLibrary): Record<string, unknown>[] {
  return library.map(toSerializableCslItem);
}

/**
 * Serialize a CSL-JSON library to a formatted JSON string
 * @param library - CSL-JSON library (array of items)
 * @returns Formatted JSON string with 2-space indentation
 */
export function serializeCslJson(library: CslLibrary): string {
  return JSON.stringify(toSerializableCslLibrary(library), null, 2);
}

/**
 * Write a CSL-JSON library to a file
 * @param filePath - Path to write the CSL-JSON file
 * @param library - CSL-JSON library to write
 * @throws Error if file cannot be written
 */
export async function writeCslJson(filePath: string, library: CslLibrary): Promise<void> {
  // Serialize and write atomically
  const content = serializeCslJson(library);
  await writeFileAtomic(filePath, content);
}
