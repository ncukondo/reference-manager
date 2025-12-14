import { readFile } from "node:fs/promises";
import { ensureCustomMetadata } from "../identifier/uuid";
import { type CslLibrary, CslLibrarySchema } from "./types";

/**
 * Convert keyword field from semicolon-separated string to array
 * @param keyword - Semicolon-separated string or undefined
 * @returns Array of keywords or undefined
 */
function parseKeyword(keyword: unknown): string[] | undefined {
  if (typeof keyword !== "string") {
    return undefined;
  }

  if (keyword.trim() === "") {
    return undefined;
  }

  const keywords = keyword
    .split(";")
    .map((k) => k.trim())
    .filter((k) => k !== "");

  return keywords.length > 0 ? keywords : undefined;
}

/**
 * Parse a CSL-JSON file and ensure all entries have valid UUIDs and timestamps
 * @param filePath - Path to the CSL-JSON file
 * @returns Array of CSL-JSON items with guaranteed UUIDs and timestamps
 * @throws Error if file cannot be read or JSON is invalid
 */
export async function parseCslJson(filePath: string): Promise<CslLibrary> {
  // Read file
  const content = await readFile(filePath, "utf-8");

  // Parse JSON
  let rawData: unknown;
  try {
    rawData = JSON.parse(content);
  } catch (error) {
    throw new Error(
      `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // Convert keyword fields from string to array before validation
  if (Array.isArray(rawData)) {
    rawData = rawData.map((item: any) => {
      if (item && typeof item === "object" && "keyword" in item) {
        return {
          ...item,
          keyword: parseKeyword(item.keyword),
        };
      }
      return item;
    });
  }

  // Validate with zod
  const parseResult = CslLibrarySchema.safeParse(rawData);

  if (!parseResult.success) {
    throw new Error(`Invalid CSL-JSON structure: ${parseResult.error.message}`);
  }

  const library = parseResult.data;

  // Ensure all entries have valid UUIDs and timestamps
  const processedLibrary: CslLibrary = library.map((item) => {
    const updatedCustom = ensureCustomMetadata(item.custom);

    return {
      ...item,
      custom: updatedCustom,
    };
  });

  return processedLibrary;
}
