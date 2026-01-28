import { ISO_DATE_REGEX } from "./field-transformer.js";

export interface EditValidationError {
  field: string;
  message: string;
}

export interface EditValidationResult {
  valid: boolean;
  errors: Map<number, EditValidationError[]>;
}

const DATE_FIELDS = ["issued", "accessed"] as const;
const DATE_ERROR_MESSAGE = "Invalid date format (use YYYY, YYYY-MM, or YYYY-MM-DD)";

export function validateEditFormat(items: Record<string, unknown>[]): EditValidationResult {
  const errors = new Map<number, EditValidationError[]>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Record<string, unknown>;
    const itemErrors: EditValidationError[] = [];

    for (const field of DATE_FIELDS) {
      const value = item[field];
      if (typeof value === "string" && !ISO_DATE_REGEX.test(value)) {
        itemErrors.push({ field, message: DATE_ERROR_MESSAGE });
      }
    }

    if (itemErrors.length > 0) {
      errors.set(i, itemErrors);
    }
  }

  return { valid: errors.size === 0, errors };
}
