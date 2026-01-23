/**
 * Edit command implementation
 *
 * Opens references in external editor for interactive editing.
 */

import type { Config } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
import type { IdentifierType } from "../../core/library-interface.js";
import { Library } from "../../core/library.js";
import { type EditFormat, executeEdit, resolveEditor } from "../../features/edit/index.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import { isTTY, loadConfigWithOverrides, readIdentifiersFromStdin } from "../helpers.js";

/**
 * Options for the edit command.
 */
export interface EditCommandOptions {
  /** One or more identifiers (citation keys or UUIDs) */
  identifiers: string[];
  /** Edit format: yaml (default) or json */
  format: EditFormat;
  /** Whether identifiers are UUIDs */
  useUuid?: boolean;
  /** Custom editor command (overrides $VISUAL/$EDITOR) */
  editor?: string;
}

/**
 * Result from edit command execution.
 */
export interface EditCommandResult {
  success: boolean;
  updatedCount: number;
  updatedIds: string[];
  error?: string;
  aborted?: boolean;
}

/**
 * Protected fields that should not be updated from edited content.
 */
const PROTECTED_FIELDS = new Set(["uuid", "created_at", "timestamp", "fulltext"]);

/**
 * Merge edited item with original, preserving protected fields.
 */
function mergeWithProtectedFields(
  original: CslItem,
  edited: Record<string, unknown>
): Partial<CslItem> {
  // Create result excluding _extractedUuid
  const { _extractedUuid, ...rest } = edited;
  const result: Record<string, unknown> = { ...rest };

  // Merge custom field, preserving protected fields
  const originalCustom = original.custom as Record<string, unknown> | undefined;
  const editedCustom = result.custom as Record<string, unknown> | undefined;

  if (originalCustom) {
    const mergedCustom: Record<string, unknown> = { ...(editedCustom || {}) };

    // Copy protected fields from original
    for (const field of PROTECTED_FIELDS) {
      if (field in originalCustom) {
        mergedCustom[field] = originalCustom[field];
      }
    }

    result.custom = mergedCustom;
  }

  return result as Partial<CslItem>;
}

/**
 * Get UUID from custom field of an item.
 */
function getUuidFromItem(item: CslItem): string | undefined {
  return (item.custom as Record<string, unknown>)?.uuid as string | undefined;
}

/**
 * Resolve all identifiers to CslItems.
 */
async function resolveIdentifiers(
  identifiers: string[],
  idType: IdentifierType,
  context: ExecutionContext
): Promise<{ items: CslItem[]; uuidToOriginal: Map<string, CslItem>; error?: string }> {
  const items: CslItem[] = [];
  const uuidToOriginal = new Map<string, CslItem>();

  for (const identifier of identifiers) {
    const item = await context.library.find(identifier, { idType });
    if (!item) {
      return { items: [], uuidToOriginal, error: `Reference not found: ${identifier}` };
    }
    items.push(item);
    const uuid = getUuidFromItem(item);
    if (uuid) {
      uuidToOriginal.set(uuid, item);
    }
  }

  return { items, uuidToOriginal };
}

/**
 * Update a single edited item in the library.
 */
async function updateEditedItem(
  editedItem: Record<string, unknown>,
  items: CslItem[],
  uuidToOriginal: Map<string, CslItem>,
  context: ExecutionContext
): Promise<string | undefined> {
  const extractedUuid = editedItem._extractedUuid as string | undefined;
  const original = extractedUuid ? uuidToOriginal.get(extractedUuid) : undefined;

  if (original && extractedUuid) {
    const updates = mergeWithProtectedFields(original, editedItem);
    await context.library.update(extractedUuid, updates, { idType: "uuid" });
    return editedItem.id as string;
  }

  // Fallback: match by id
  const matchedOriginal = items.find((item) => item.id === editedItem.id);
  if (!matchedOriginal) {
    return undefined;
  }

  const matchedUuid = getUuidFromItem(matchedOriginal);
  if (matchedUuid) {
    const updates = mergeWithProtectedFields(matchedOriginal, editedItem);
    await context.library.update(matchedUuid, updates, { idType: "uuid" });
    return editedItem.id as string;
  }

  return undefined;
}

/**
 * Execute the edit command.
 *
 * @param options - Edit command options
 * @param context - Execution context
 * @returns Edit result
 */
export async function executeEditCommand(
  options: EditCommandOptions,
  context: ExecutionContext
): Promise<EditCommandResult> {
  const { identifiers, format, useUuid = false, editor: customEditor } = options;
  const idType: IdentifierType = useUuid ? "uuid" : "id";

  // 1. Resolve all identifiers to items
  const resolved = await resolveIdentifiers(identifiers, idType, context);
  if (resolved.error) {
    return {
      success: false,
      updatedCount: 0,
      updatedIds: [],
      error: resolved.error,
    };
  }

  const { items, uuidToOriginal } = resolved;

  // 2. Resolve editor
  const editor = customEditor || resolveEditor();

  // 3. Execute edit
  const editResult = await executeEdit(items, { format, editor });

  if (!editResult.success) {
    return {
      success: false,
      updatedCount: 0,
      updatedIds: [],
      error: editResult.error ?? "Edit failed",
    };
  }

  // 4. Update references
  const updatedIds: string[] = [];
  for (const editedItem of editResult.editedItems) {
    const updatedId = await updateEditedItem(editedItem, items, uuidToOriginal, context);
    if (updatedId) {
      updatedIds.push(updatedId);
    }
  }

  // 5. Save library
  if (updatedIds.length > 0) {
    await context.library.save();
  }

  return {
    success: true,
    updatedCount: updatedIds.length,
    updatedIds,
  };
}

/**
 * Format edit result for CLI output.
 *
 * @param result - Edit result
 * @returns Formatted output string
 */
export function formatEditOutput(result: EditCommandResult): string {
  if (result.aborted) {
    return "Edit aborted.";
  }

  if (!result.success) {
    return `Error: ${result.error || "Unknown error"}`;
  }

  const count = result.updatedCount;
  const refWord = count === 1 ? "reference" : "references";

  if (count === 0) {
    return "No references were updated.";
  }

  const lines = [`Updated ${count} ${refWord}:`];
  for (const id of result.updatedIds) {
    lines.push(`  - ${id}`);
  }

  return lines.join("\n");
}

/**
 * Options for handleEditAction.
 */
export interface EditActionOptions {
  uuid?: boolean;
  format?: EditFormat;
  editor?: string;
}

/**
 * Execute interactive edit: select references then open editor.
 */
async function executeInteractiveEdit(
  options: EditActionOptions,
  context: ExecutionContext,
  config: Config
): Promise<EditCommandResult> {
  const { selectReferencesOrExit } = await import("../../features/interactive/reference-select.js");

  const allReferences = await context.library.getAll();
  const identifiers = await selectReferencesOrExit(
    allReferences,
    { multiSelect: true },
    config.cli.tui
  );

  const format = options.format ?? config.cli.edit.defaultFormat;

  return executeEditCommand(
    {
      identifiers,
      format,
      ...(options.uuid && { useUuid: true }),
      ...(options.editor && { editor: options.editor }),
    },
    context
  );
}

/**
 * Handle 'edit' command action.
 */
export async function handleEditAction(
  identifiers: string[],
  options: EditActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    // Resolve identifiers: from args, stdin, or interactive selection
    let resolvedIdentifiers: string[];
    if (identifiers.length > 0) {
      resolvedIdentifiers = identifiers;
    } else if (isTTY()) {
      // TTY mode: interactive selection
      const result = await executeInteractiveEdit(options, context, config);
      const output = formatEditOutput(result);
      process.stderr.write(`${output}\n`);
      process.exit(result.success ? 0 : 1);
      return; // unreachable, but satisfies TypeScript
    } else {
      // Non-TTY mode: read from stdin (pipeline support)
      const stdinIds = await readIdentifiersFromStdin();
      if (stdinIds.length === 0) {
        process.stderr.write(
          "Error: No identifiers provided. Provide IDs, pipe them via stdin, or run interactively in a TTY.\n"
        );
        process.exit(1);
      }
      resolvedIdentifiers = stdinIds;
    }

    // Edit requires TTY for the editor
    if (!isTTY()) {
      process.stderr.write("Error: Edit command requires a TTY to open the editor.\n");
      process.exit(1);
    }

    const format = options.format ?? config.cli.edit.defaultFormat;
    const result = await executeEditCommand(
      {
        identifiers: resolvedIdentifiers,
        format,
        ...(options.uuid && { useUuid: true }),
        ...(options.editor && { editor: options.editor }),
      },
      context
    );

    const output = formatEditOutput(result);
    process.stderr.write(`${output}\n`);

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}
