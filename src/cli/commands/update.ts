import { z } from "zod";
import type { Config } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
import type { IdentifierType } from "../../core/library-interface.js";
import { Library } from "../../core/library.js";
import type { UpdateOperationResult } from "../../features/operations/update.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import {
  isTTY,
  loadConfigWithOverrides,
  parseJsonInput,
  readIdentifierFromStdin,
  readJsonInput,
} from "../helpers.js";

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
 * Check if updates contain $add or $remove operations that need resolution.
 */
export function hasArrayOperations(updates: Record<string, unknown>): boolean {
  for (const value of Object.values(updates)) {
    if (typeof value !== "object" || value === null) continue;
    const obj = value as Record<string, unknown>;
    if ("$add" in obj || "$remove" in obj) return true;
    if (hasArrayOperations(obj)) return true;
  }
  return false;
}

/**
 * Resolve $add/$remove operations against existing item data.
 *
 * @param updates - Updates object potentially containing $add/$remove operations
 * @param existingItem - The existing item to resolve against
 * @returns Updates object with $add/$remove resolved to actual arrays
 */
export function resolveArrayOperations(
  updates: Record<string, unknown>,
  existingItem: CslItem
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(updates)) {
    if (key === "custom" && typeof value === "object" && value !== null) {
      result.custom = resolveCustomArrayOperations(
        value as Record<string, unknown>,
        existingItem.custom as Record<string, unknown> | undefined
      );
    } else if (isArrayOperation(value)) {
      result[key] = resolveTopLevelArrayOperation(
        value as { $add?: string; $remove?: string },
        (existingItem as Record<string, unknown>)[key] as string[] | undefined
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

function isArrayOperation(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  return "$add" in obj || "$remove" in obj;
}

function resolveCustomArrayOperations(
  customUpdates: Record<string, unknown>,
  existingCustom: Record<string, unknown> | undefined
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [customKey, customValue] of Object.entries(customUpdates)) {
    if (isArrayOperation(customValue)) {
      const op = customValue as { $add?: string; $remove?: string };
      const existingArray = (existingCustom?.[customKey] as string[] | undefined) ?? [];
      result[customKey] = applyArrayOperation(existingArray, op);
    } else {
      result[customKey] = customValue;
    }
  }

  return result;
}

function resolveTopLevelArrayOperation(
  op: { $add?: string; $remove?: string },
  existingArray: string[] | undefined
): string[] {
  return applyArrayOperation(existingArray ?? [], op);
}

function applyArrayOperation(
  existingArray: string[],
  op: { $add?: string; $remove?: string }
): string[] {
  const newArray = [...existingArray];

  if ("$add" in op && op.$add && !newArray.includes(op.$add)) {
    newArray.push(op.$add);
  }
  if ("$remove" in op && op.$remove) {
    const idx = newArray.indexOf(op.$remove);
    if (idx >= 0) newArray.splice(idx, 1);
  }

  return newArray;
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
  const { identifier, idType = "id" } = options;
  let { updates } = options;

  // If updates contain $add/$remove operations, resolve them against existing item
  if (hasArrayOperations(updates as Record<string, unknown>)) {
    const existingItem = await context.library.find(identifier, { idType });
    if (!existingItem) {
      return { updated: false };
    }
    updates = resolveArrayOperations(
      updates as Record<string, unknown>,
      existingItem
    ) as Partial<CslItem>;
  }

  const result = await context.library.update(identifier, updates, { idType });

  // Save the library if update was successful
  if (result.updated) {
    await context.library.save();
  }

  return result;
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

/**
 * Options for handleUpdateAction.
 */
export interface UpdateActionOptions {
  uuid?: boolean;
  set?: string[];
  output?: "json" | "text";
  full?: boolean;
}

/**
 * Execute interactive update: select a single reference.
 */
async function executeInteractiveUpdate(
  context: ExecutionContext,
  config: Config
): Promise<string> {
  const { selectReferencesOrExit } = await import("../../features/interactive/reference-select.js");

  const allReferences = await context.library.getAll();
  const identifiers = await selectReferencesOrExit(
    allReferences,
    { multiSelect: false },
    config.cli.interactive
  );

  // Type assertion is safe: selectReferencesOrExit guarantees non-empty array
  return identifiers[0] as string;
}

/**
 * Resolve identifier from argument, stdin, or interactive selection.
 */
async function resolveUpdateIdentifier(
  identifierArg: string | undefined,
  hasSetOptions: boolean,
  context: ExecutionContext,
  config: Config
): Promise<string> {
  if (identifierArg) {
    return identifierArg;
  }

  if (isTTY()) {
    return executeInteractiveUpdate(context, config);
  }

  if (hasSetOptions) {
    // Non-TTY mode with --set: read identifier from stdin (pipeline support)
    const stdinId = await readIdentifierFromStdin();
    if (!stdinId) {
      process.stderr.write(
        "Error: No identifier provided. Provide an ID, pipe one via stdin, or run interactively in a TTY.\n"
      );
      process.exit(1);
    }
    return stdinId;
  }

  // Non-TTY mode without --set: stdin is used for JSON, so identifier is required
  process.stderr.write(
    "Error: No identifier provided. When using stdin for JSON input, identifier must be provided as argument.\n"
  );
  process.exit(1);
}

/**
 * Parse update input from --set options or file.
 */
function parseUpdateInput(
  setOptions: string[] | undefined,
  file: string | undefined
): Promise<Partial<CslItem>> | Partial<CslItem> {
  if (setOptions && setOptions.length > 0 && file) {
    throw new Error("Cannot use --set with a file argument. Use one or the other.");
  }

  if (setOptions && setOptions.length > 0) {
    const operations = setOptions.map((s) => parseSetOption(s));
    return applySetOperations(operations) as Partial<CslItem>;
  }

  return readJsonInput(file).then((inputStr) => {
    const updates = parseJsonInput(inputStr);
    const updatesSchema = z.record(z.string(), z.unknown());
    return updatesSchema.parse(updates) as Partial<CslItem>;
  });
}

/**
 * Handle update error.
 */
function handleUpdateError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Parse error")) {
    process.stderr.write(`Error: ${message}\n`);
    process.exit(3);
  }
  if (message.includes("not found") || message.includes("validation")) {
    process.stderr.write(`Error: ${message}\n`);
    process.exit(1);
  }
  process.stderr.write(`Error: ${message}\n`);
  process.exit(4);
}

/**
 * Handle update error with format support.
 */
function handleUpdateErrorWithFormat(
  error: unknown,
  identifier: string,
  outputFormat: "json" | "text"
): never {
  const message = error instanceof Error ? error.message : String(error);
  if (outputFormat === "json") {
    process.stdout.write(`${JSON.stringify({ success: false, id: identifier, error: message })}\n`);
    process.exit(message.includes("not found") || message.includes("validation") ? 1 : 4);
  }
  handleUpdateError(error);
}

/**
 * Handle 'update' command action.
 */
export async function handleUpdateAction(
  identifierArg: string | undefined,
  file: string | undefined,
  options: UpdateActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  const { formatUpdateJsonOutput } = await import("../../features/operations/json-output.js");
  const outputFormat = options.output ?? "text";
  const hasSetOptions = Boolean(options.set && options.set.length > 0);

  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    const identifier = await resolveUpdateIdentifier(identifierArg, hasSetOptions, context, config);
    const validatedUpdates = await parseUpdateInput(options.set, file);

    const idType = options.uuid ? "uuid" : "id";
    const beforeItem = options.full
      ? await context.library.find(identifier, { idType })
      : undefined;

    const updateOptions: UpdateCommandOptions = {
      identifier,
      updates: validatedUpdates,
      ...(options.uuid && { idType: "uuid" }),
    };

    const result = await executeUpdate(updateOptions, context);

    if (outputFormat === "json") {
      const jsonOptions = {
        ...(options.full && { full: true }),
        ...(beforeItem && { before: beforeItem }),
      };
      const jsonOutput = formatUpdateJsonOutput(result, identifier, jsonOptions);
      process.stdout.write(`${JSON.stringify(jsonOutput)}\n`);
    } else {
      const output = formatUpdateOutput(result, identifier);
      process.stderr.write(`${output}\n`);
    }

    process.exit(result.updated ? 0 : 1);
  } catch (error) {
    handleUpdateErrorWithFormat(error, identifierArg ?? "", outputFormat);
  }
}

/**
 * Collect multiple --set options into an array.
 */
export function collectSetOption(value: string, previous: string[]): string[] {
  return previous.concat([value]);
}
