import { CslLibrarySchema } from "./types";
import type { CslLibrary } from "./types";

/**
 * Validate CSL-JSON library structure
 * @param data - Data to validate (can be any type)
 * @returns Validated CSL-JSON library
 * @throws Error if validation fails
 */
export function validateCslJson(data: unknown): CslLibrary {
  const parseResult = CslLibrarySchema.safeParse(data);

  if (!parseResult.success) {
    throw new Error(`Invalid CSL-JSON structure: ${parseResult.error.message}`);
  }

  return parseResult.data;
}