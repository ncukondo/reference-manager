import type { CslItem } from "../../core/csl-json/types.js";
import type { IdentifierType } from "../../core/library-interface.js";
import type { UpdateOperationResult } from "../../features/operations/update.js";
import type { ExecutionContext } from "../execution-context.js";

/**
 * Operator type for --set option.
 */
export type SetOperator = "=" | "+=" | "-=";

/**
 * Parsed result of a --set option.
 */
export interface SetOperation {
  field: string;
  operator: SetOperator;
  value: string;
}

/**
 * Parse a --set option string.
 *
 * @param input - Input string in format "field=value", "field+=value", or "field-=value"
 * @returns Parsed SetOperation
 * @throws Error if syntax is invalid
 */
export function parseSetOption(input: string): SetOperation {
  // Match: field(+=|-=|=)value
  // Field can contain dots (e.g., custom.tags, issued.raw)
  const match = input.match(/^([a-zA-Z][a-zA-Z0-9_.]*)([\+\-]?=)(.*)$/);

  if (!match) {
    throw new Error(
      `Invalid --set syntax: "${input}". Use field=value, field+=value, or field-=value`
    );
  }

  // Safe to use non-null assertion: regex guarantees match[1], [2], [3] exist
  return {
    field: match[1] as string,
    operator: match[2] as SetOperator,
    value: match[3] as string,
  };
}

/**
 * Protected fields that cannot be set via --set option.
 */
const PROTECTED_FIELDS = new Set([
  "custom.uuid",
  "custom.created_at",
  "custom.timestamp",
  "custom.fulltext",
]);

/**
 * Simple string fields that can be set directly.
 */
const STRING_FIELDS = new Set([
  "title",
  "abstract",
  "type",
  "DOI",
  "PMID",
  "PMCID",
  "ISBN",
  "ISSN",
  "URL",
  "publisher",
  "publisher-place",
  "page",
  "volume",
  "issue",
  "container-title",
  "note",
  "id",
]);

/**
 * Array fields that support +=/-= operators.
 */
const ARRAY_FIELDS = new Set(["custom.tags", "custom.additional_urls", "keyword"]);

/**
 * Name fields (author, editor).
 */
const NAME_FIELDS = new Set(["author", "editor"]);

/**
 * Date raw fields (issued.raw, accessed.raw).
 */
const DATE_RAW_FIELDS = new Set(["issued.raw", "accessed.raw"]);

/**
 * Parse author value into CSL name objects.
 *
 * @param value - Author string in format "Family, Given" or "Family, Given; Family2, Given2"
 * @returns Array of CSL name objects
 */
function parseAuthorValue(value: string): Array<{ family: string; given?: string }> {
  return value.split(";").map((author) => {
    const trimmed = author.trim();
    const parts = trimmed.split(",").map((p) => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return { family: parts[0], given: parts[1] };
    }
    return { family: trimmed };
  });
}

/**
 * Apply array operator to get the value object.
 */
function applyArrayOperator(
  operator: SetOperator,
  value: string
): unknown[] | { $add: string } | { $remove: string } {
  if (operator === "+=") return { $add: value };
  if (operator === "-=") return { $remove: value };
  return value.split(",").map((v) => v.trim());
}

/**
 * Handle custom.* array fields.
 */
function handleCustomArrayField(
  result: Record<string, unknown>,
  field: string,
  operator: SetOperator,
  value: string
): void {
  const child = field.split(".")[1];
  if (!child) return;
  if (!result.custom) result.custom = {};
  (result.custom as Record<string, unknown>)[child] = applyArrayOperator(operator, value);
}

/**
 * Apply a single set operation to the result object.
 */
function applySingleOperation(result: Record<string, unknown>, op: SetOperation): void {
  const { field, operator, value } = op;

  if (PROTECTED_FIELDS.has(field)) {
    throw new Error(`Cannot set protected field: ${field}`);
  }

  if (STRING_FIELDS.has(field)) {
    result[field] = value === "" ? undefined : value;
    return;
  }

  if (ARRAY_FIELDS.has(field)) {
    if (field.startsWith("custom.")) {
      handleCustomArrayField(result, field, operator, value);
    } else {
      result[field] = applyArrayOperator(operator, value);
    }
    return;
  }

  if (NAME_FIELDS.has(field)) {
    result[field] = parseAuthorValue(value);
    return;
  }

  if (DATE_RAW_FIELDS.has(field)) {
    const dateField = field.split(".")[0];
    if (dateField) result[dateField] = { raw: value };
    return;
  }

  throw new Error(`Unsupported field: ${field}`);
}

/**
 * Apply set operations to create a partial CslItem updates object.
 *
 * @param operations - Array of set operations
 * @returns Partial CslItem object with updates
 * @throws Error if a protected or unsupported field is specified
 */
export function applySetOperations(operations: SetOperation[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const op of operations) {
    applySingleOperation(result, op);
  }
  return result;
}

/**
 * Options for the update command.
 */
export interface UpdateCommandOptions {
  identifier: string;
  updates: Partial<CslItem>;
  idType?: IdentifierType;
}

/**
 * Result from update command execution.
 */
export type UpdateCommandResult = UpdateOperationResult;

/**
 * Execute update command.
 * Uses context.library.update() which works for both local and server modes.
 *
 * @param options - Update command options
 * @param context - Execution context
 * @returns Update result
 */
export async function executeUpdate(
  options: UpdateCommandOptions,
  context: ExecutionContext
): Promise<UpdateCommandResult> {
  const { identifier, updates, idType = "id" } = options;

  return context.library.update(identifier, updates, { idType });
}

/**
 * Format update result for CLI output.
 *
 * @param result - Update result
 * @param identifier - The identifier that was used
 * @returns Formatted output string
 */
export function formatUpdateOutput(result: UpdateCommandResult, identifier: string): string {
  if (!result.updated) {
    if (result.idCollision) {
      return `Update failed: ID collision for ${identifier}`;
    }
    return `Reference not found: ${identifier}`;
  }

  const item = result.item;
  const parts: string[] = [];

  if (item) {
    parts.push(`Updated: [${item.id}] ${item.title || "(no title)"}`);
  } else {
    parts.push(`Updated reference: ${identifier}`);
  }

  if (result.idChanged && result.newId) {
    parts.push(`ID changed to: ${result.newId}`);
  }

  return parts.join("\n");
}
