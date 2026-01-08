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
