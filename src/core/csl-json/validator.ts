import { CslItemSchema, CslLibrarySchema } from "./types";
import type { CslItem, CslLibrary } from "./types";

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

/**
 * Validate a single CSL-JSON item
 * @param data - Data to validate (can be any type)
 * @returns Validation result with valid flag and errors
 */
export function validateCslItem(data: unknown): {
  valid: boolean;
  data?: CslItem;
  errors?: string[];
} {
  const parseResult = CslItemSchema.safeParse(data);

  if (!parseResult.success) {
    return {
      valid: false,
      errors: parseResult.error.issues.map((issue) => issue.message),
    };
  }

  return {
    valid: true,
    data: parseResult.data,
  };
}
