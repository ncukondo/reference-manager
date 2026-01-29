/**
 * Edit command implementation
 *
 * Opens references in external editor for interactive editing.
 */

import type { Config } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
import { type IdentifierType, MANAGED_CUSTOM_FIELDS } from "../../core/library-interface.js";
import { Library } from "../../core/library.js";
import { type EditFormat, executeEdit, resolveEditor } from "../../features/edit/index.js";
import { formatChangeDetails } from "../../features/operations/change-details.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import {
  ExitCode,
  isTTY,
  loadConfigWithOverrides,
  readIdentifiersFromStdin,
  setExitCode,
} from "../helpers.js";

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
 * State of an individual item after edit operation.
 */
export type EditItemState = "updated" | "unchanged" | "not_found" | "id_collision";

/**
 * Result for a single item in the edit operation.
 */
export interface EditItemResult {
  /** The identifier (id or uuid) used to locate this item */
  id: string;
  /** The state of this item after the edit operation */
  state: EditItemState;
  /** The updated item (when state is 'updated' or 'unchanged') */
  item?: CslItem;
  /** The original item before changes (when state is 'updated' or 'unchanged') */
  oldItem?: CslItem;
  /** True if the ID was changed due to collision resolution */
  idChanged?: boolean;
  /** The new ID after collision resolution (only when idChanged=true) */
  newId?: string;
}

/**
 * Result from edit command execution.
 */
export interface EditCommandResult {
  success: boolean;
  updatedCount: number;
  updatedIds: string[];
  /** Detailed results for each edited item */
  results: EditItemResult[];
  error?: string;
  aborted?: boolean;
}

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
    for (const field of MANAGED_CUSTOM_FIELDS) {
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
 * Convert UpdateResult to EditItemResult
 */
function toEditItemResult(
  editedId: string,
  result: import("../../core/library-interface.js").UpdateResult,
  oldItem: CslItem
): EditItemResult {
  // No changes case: item present but not updated
  if (!result.updated && result.item) {
    const editResult: EditItemResult = {
      id: editedId,
      state: "unchanged",
      item: result.item,
      oldItem,
    };
    if (result.idChanged && result.newId) {
      editResult.idChanged = true;
      editResult.newId = result.newId;
    }
    return editResult;
  }
  // Error case: not updated and no item
  if (!result.updated) {
    return {
      id: editedId,
      state: result.errorType === "id_collision" ? "id_collision" : "not_found",
      oldItem,
    };
  }
  // Success case: updated with item
  if (result.item) {
    const editResult: EditItemResult = {
      id: editedId,
      state: "updated",
      item: result.item,
      oldItem,
    };
    if (result.idChanged && result.newId) {
      editResult.idChanged = true;
      editResult.newId = result.newId;
    }
    return editResult;
  }
  // Fallback: updated but no item (shouldn't happen, but be defensive)
  return { id: editedId, state: "updated", oldItem };
}

/**
 * Update a single edited item in the library.
 */
async function updateEditedItem(
  editedItem: Record<string, unknown>,
  items: CslItem[],
  uuidToOriginal: Map<string, CslItem>,
  context: ExecutionContext
): Promise<EditItemResult> {
  const extractedUuid = editedItem._extractedUuid as string | undefined;
  const editedId = editedItem.id as string;
  const original = extractedUuid ? uuidToOriginal.get(extractedUuid) : undefined;

  if (original && extractedUuid) {
    const updates = mergeWithProtectedFields(original, editedItem);
    const result = await context.library.update(extractedUuid, updates, {
      idType: "uuid",
      onIdCollision: "suffix",
    });
    return toEditItemResult(editedId, result, original);
  }

  // Fallback: match by id
  const matchedOriginal = items.find((item) => item.id === editedId);
  if (!matchedOriginal) {
    return { id: editedId, state: "not_found" };
  }

  const matchedUuid = getUuidFromItem(matchedOriginal);
  const updates = mergeWithProtectedFields(matchedOriginal, editedItem);

  if (matchedUuid) {
    const result = await context.library.update(matchedUuid, updates, {
      idType: "uuid",
      onIdCollision: "suffix",
    });
    return toEditItemResult(editedId, result, matchedOriginal);
  }

  // Fallback: update by ID (UUID auto-generated by Reference constructor)
  const result = await context.library.update(editedId, updates, {
    idType: "id",
    onIdCollision: "suffix",
  });
  return toEditItemResult(editedId, result, matchedOriginal);
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
      results: [],
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
      results: [],
      error: editResult.error ?? "Edit failed",
    };
  }

  // 4. Update references
  const updatedIds: string[] = [];
  const results: EditItemResult[] = [];
  for (const editedItem of editResult.editedItems) {
    const updateResult = await updateEditedItem(editedItem, items, uuidToOriginal, context);
    results.push(updateResult);
    if (updateResult.state === "updated") {
      updatedIds.push(updateResult.newId ?? updateResult.id);
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
    results,
  };
}

/**
 * Format a list of items with a header
 */
function formatItemList(lines: string[], header: string, items: string[]): void {
  if (items.length === 0) return;
  if (header) lines.push(header);
  for (const item of items) {
    lines.push(`  - ${item}`);
  }
}

/**
 * Format failed items with their reasons
 */
function formatFailedItems(lines: string[], failed: EditItemResult[]): void {
  if (failed.length === 0) return;
  lines.push(`Failed: ${failed.length}`);
  for (const r of failed) {
    const reason = r.state === "id_collision" ? "ID collision" : "Not found";
    lines.push(`  - ${r.id} (${reason})`);
  }
}

/**
 * Format the summary header line
 */
function formatSummaryHeader(updatedCount: number, totalCount: number): string {
  if (totalCount === 0 || updatedCount === totalCount) {
    const refWord = updatedCount === 1 ? "reference" : "references";
    return `Updated ${updatedCount} ${refWord}:`;
  }
  return `Updated ${updatedCount} of ${totalCount} references:`;
}

/**
 * Format updated items with change details and ID change notation
 */
function formatUpdatedItems(
  lines: string[],
  updatedResults: EditItemResult[],
  updatedIds: string[]
): void {
  if (updatedResults.length > 0) {
    for (const r of updatedResults) {
      const displayId =
        r.idChanged && r.newId ? `${r.newId} (ID collision resolved: ${r.id} → ${r.newId})` : r.id;
      lines.push(`  - ${displayId}`);
      if (r.oldItem && r.item) {
        lines.push(...formatChangeDetails(r.oldItem, r.item).map((l) => `  ${l}`));
      }
    }
  } else {
    formatItemList(lines, "", updatedIds);
  }
}

/**
 * Format edit result for CLI output.
 */
export function formatEditOutput(result: EditCommandResult): string {
  if (result.aborted) return "Edit aborted.";
  if (!result.success) return `Error: ${result.error || "Unknown error"}`;

  const totalCount = result.results.length;
  const { updatedCount, updatedIds } = result;

  if (totalCount === 0 && updatedCount === 0) return "No references were updated.";

  const lines: string[] = [formatSummaryHeader(updatedCount, totalCount)];

  const updatedResults = result.results.filter((r) => r.state === "updated");
  formatUpdatedItems(lines, updatedResults, updatedIds);

  if (totalCount > 0) {
    const unchanged = result.results.filter((r) => r.state === "unchanged");
    const failed = result.results.filter(
      (r) => r.state === "not_found" || r.state === "id_collision"
    );
    formatItemList(
      lines,
      `No changes: ${unchanged.length}`,
      unchanged.map((r) => {
        if (r.idChanged && r.newId) {
          return `${r.id} (ID collision resolved: requested ID already exists → kept ${r.newId})`;
        }
        return r.id;
      })
    );
    formatFailedItems(lines, failed);
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
  const { withAlternateScreen } = await import("../../features/interactive/alternate-screen.js");
  const { selectReferencesOrExit } = await import("../../features/interactive/reference-select.js");

  const allReferences = await context.library.getAll();

  // Run TUI session in alternate screen to preserve terminal scrollback
  const identifiers = await withAlternateScreen(() =>
    selectReferencesOrExit(allReferences, { multiSelect: true }, config.cli.tui)
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
      setExitCode(result.success ? ExitCode.SUCCESS : ExitCode.ERROR);
      return; // unreachable, but satisfies TypeScript
    } else {
      // Non-TTY mode: read from stdin (pipeline support)
      const stdinIds = await readIdentifiersFromStdin();
      if (stdinIds.length === 0) {
        process.stderr.write(
          "Error: No identifiers provided. Provide IDs, pipe them via stdin, or run interactively in a TTY.\n"
        );
        setExitCode(ExitCode.ERROR);
        return;
      }
      resolvedIdentifiers = stdinIds;
    }

    // Edit requires TTY for the editor
    if (!isTTY()) {
      process.stderr.write("Error: Edit command requires a TTY to open the editor.\n");
      setExitCode(ExitCode.ERROR);
      return;
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

    setExitCode(result.success ? ExitCode.SUCCESS : ExitCode.ERROR);
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}
