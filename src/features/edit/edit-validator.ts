import { CslItemSchema } from "../../core/csl-json/types.js";
import { ISO_DATE_REGEX, transformDateFromEdit } from "./field-transformer.js";

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

/**
 * Stage 2: Validates items against CslItemSchema after transforming date fields.
 */
export function validateCslItems(items: Record<string, unknown>[]): EditValidationResult {
  const errors = new Map<number, EditValidationError[]>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Record<string, unknown>;
    const transformed = transformDatesForValidation(item);
    const parseResult = CslItemSchema.safeParse(transformed);

    if (!parseResult.success) {
      const itemErrors: EditValidationError[] = parseResult.error.issues.map((issue) => ({
        field: issue.path.join(".") || issue.code,
        message: issue.message,
      }));
      errors.set(i, itemErrors);
    }
  }

  return { valid: errors.size === 0, errors };
}

/**
 * Combined two-stage validation: edit-format first, then CSL schema.
 * Short-circuits on Stage 1 failure.
 */
export function validateEditedItems(items: Record<string, unknown>[]): EditValidationResult {
  const stage1 = validateEditFormat(items);
  if (!stage1.valid) {
    return stage1;
  }
  return validateCslItems(items);
}

function transformDatesForValidation(item: Record<string, unknown>): Record<string, unknown> {
  const result = { ...item };
  for (const field of DATE_FIELDS) {
    const value = result[field];
    if (typeof value === "string" && ISO_DATE_REGEX.test(value)) {
      result[field] = transformDateFromEdit(value);
    }
  }
  return result;
}
