import type { Config } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
import type { IdentifierType } from "../../core/library-interface.js";
import { Library } from "../../core/library.js";
import type { FulltextType } from "../../features/fulltext/index.js";
import { type RemoveResult, getFulltextAttachmentTypes } from "../../features/operations/remove.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import { isTTY, loadConfigWithOverrides, readConfirmation } from "../helpers.js";

// Re-export for convenience
export { getFulltextAttachmentTypes };
export type { RemoveResult };

/**
 * Options for the remove command.
 */
export interface RemoveCommandOptions {
  identifier: string;
  idType?: IdentifierType;
  /** Directory containing fulltext files */
  fulltextDirectory?: string;
  /** Whether to delete associated fulltext files */
  deleteFulltext?: boolean;
}

/**
 * Result from remove command execution.
 */
export type RemoveCommandResult = RemoveResult;

/**
 * Execute remove command.
 * Uses context.library.remove() which works for both local and server modes.
 *
 * @param options - Remove command options
 * @param context - Execution context
 * @returns Remove result
 */
export async function executeRemove(
  options: RemoveCommandOptions,
  context: ExecutionContext
): Promise<RemoveCommandResult> {
  const { identifier, idType = "id", fulltextDirectory, deleteFulltext = false } = options;

  // For local library, use removeReference which handles fulltext deletion
  // For server mode, just call remove (fulltext deletion not supported yet)
  if (context.mode === "local" && deleteFulltext && fulltextDirectory) {
    // Import dynamically to avoid circular dependency
    const { removeReference } = await import("../../features/operations/remove.js");
    return removeReference(context.library, {
      identifier,
      idType,
      fulltextDirectory,
      deleteFulltext,
    });
  }

  const result = await context.library.remove(identifier, { idType });
  if (result.removed) {
    await context.library.save();
  }
  return result;
}

/**
 * Format remove result for CLI output.
 *
 * @param result - Remove result
 * @param identifier - The identifier that was used
 * @returns Formatted output string
 */
export function formatRemoveOutput(result: RemoveCommandResult, identifier: string): string {
  if (!result.removed) {
    return `Reference not found: ${identifier}`;
  }

  const item = result.removedItem;
  let output = "";

  if (item) {
    output = `Removed: [${item.id}] ${item.title || "(no title)"}`;
  } else {
    output = `Removed reference: ${identifier}`;
  }

  // Append fulltext deletion info if applicable
  if (result.deletedFulltextTypes && result.deletedFulltextTypes.length > 0) {
    const typeLabels = result.deletedFulltextTypes.map((t) => (t === "pdf" ? "PDF" : "Markdown"));
    output += `\nDeleted fulltext files: ${typeLabels.join(" and ")}`;
  }

  return output;
}

/**
 * Format fulltext warning message for remove confirmation.
 *
 * @param types - Attached fulltext types
 * @returns Warning message string
 */
export function formatFulltextWarning(types: FulltextType[]): string {
  const typeLabels = types.map((t) => (t === "pdf" ? "PDF" : "Markdown"));
  const fileTypes = typeLabels.join(" and ");
  return `Warning: This reference has fulltext files attached (${fileTypes}). Use --force to also delete the fulltext files.`;
}

/**
 * Options for handleRemoveAction.
 */
export interface RemoveActionOptions {
  uuid?: boolean;
  force?: boolean;
  output?: "json" | "text";
  full?: boolean;
}

/**
 * Confirm removal if needed (TTY, not forced).
 */
async function confirmRemoveIfNeeded(
  item: CslItem,
  hasFulltext: boolean,
  force: boolean
): Promise<boolean> {
  if (force || !isTTY()) {
    return true;
  }

  const authors = Array.isArray(item.author)
    ? item.author.map((a) => `${a.family || ""}, ${a.given?.[0] || ""}.`).join("; ")
    : "(no authors)";

  const fulltextTypes = hasFulltext ? getFulltextAttachmentTypes(item) : [];
  const warning = hasFulltext ? formatFulltextWarning(fulltextTypes) : "";
  const warningPart = warning ? `\n\n${warning}` : "";

  const confirmMsg = `Remove reference [${item.id}]?\nTitle: ${item.title || "(no title)"}\nAuthors: ${authors}${warningPart}\nContinue?`;
  return readConfirmation(confirmMsg);
}

/**
 * Execute interactive remove: select a reference then confirm removal.
 */
async function executeInteractiveRemove(
  context: ExecutionContext,
  config: Config
): Promise<{ identifier: string; item: CslItem }> {
  const { runReferenceSelect } = await import("../../features/interactive/reference-select.js");

  const allReferences = await context.library.getAll();
  if (allReferences.length === 0) {
    process.stderr.write("No references in library.\n");
    process.exit(0);
  }

  const selectResult = await runReferenceSelect(
    allReferences,
    { multiSelect: false },
    config.cli.interactive
  );

  if (selectResult.cancelled || selectResult.selected.length === 0) {
    process.exit(0);
  }

  // Type assertion is safe here because we checked length > 0 above
  const selectedItem = selectResult.selected[0] as CslItem;
  return { identifier: selectedItem.id, item: selectedItem };
}

/**
 * Resolve identifier to reference item.
 */
async function resolveRemoveTarget(
  identifierArg: string | undefined,
  context: ExecutionContext,
  config: Config,
  useUuid: boolean
): Promise<{ identifier: string; item: CslItem }> {
  if (identifierArg) {
    const item = await context.library.find(identifierArg, { idType: useUuid ? "uuid" : "id" });
    if (!item) {
      throw new Error(`Reference not found: ${identifierArg}`);
    }
    return { identifier: identifierArg, item };
  }

  if (!isTTY()) {
    throw new Error("No identifier provided. Provide an ID or run interactively in a TTY.");
  }

  return executeInteractiveRemove(context, config);
}

/**
 * Output remove result.
 */
function outputResult(
  result: RemoveResult,
  identifier: string,
  outputFormat: "json" | "text",
  full: boolean | undefined,
  formatRemoveJsonOutput: typeof import(
    "../../features/operations/json-output.js"
  ).formatRemoveJsonOutput
): void {
  if (outputFormat === "json") {
    const jsonOutput = formatRemoveJsonOutput(result, identifier, {
      ...(full !== undefined && { full }),
    });
    process.stdout.write(`${JSON.stringify(jsonOutput)}\n`);
  } else {
    const output = formatRemoveOutput(result, identifier);
    process.stderr.write(`${output}\n`);
  }
}

/**
 * Handle remove error.
 */
function handleRemoveError(
  error: unknown,
  identifierArg: string | undefined,
  outputFormat: "json" | "text"
): never {
  const message = error instanceof Error ? error.message : String(error);
  if (outputFormat === "json") {
    process.stdout.write(
      `${JSON.stringify({ success: false, id: identifierArg ?? "", error: message })}\n`
    );
  } else {
    process.stderr.write(`Error: ${message}\n`);
  }
  // Exit code 1 for "not found" or "No identifier" errors (user input issues)
  // Exit code 4 for other errors (internal/system errors)
  const isUserError = message.includes("not found") || message.includes("No identifier");
  process.exit(isUserError ? 1 : 4);
}

/**
 * Handle 'remove' command action.
 */
export async function handleRemoveAction(
  identifierArg: string | undefined,
  options: RemoveActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  const { formatRemoveJsonOutput } = await import("../../features/operations/json-output.js");
  const outputFormat = options.output ?? "text";
  const useUuid = options.uuid ?? false;
  const force = options.force ?? false;

  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    const { identifier, item: refToRemove } = await resolveRemoveTarget(
      identifierArg,
      context,
      config,
      useUuid
    );

    const fulltextTypes = getFulltextAttachmentTypes(refToRemove);
    const hasFulltext = fulltextTypes.length > 0;

    // Non-TTY with fulltext requires --force
    if (hasFulltext && !isTTY() && !force) {
      process.stderr.write(`Error: ${formatFulltextWarning(fulltextTypes)}\n`);
      process.exit(1);
    }

    const confirmed = await confirmRemoveIfNeeded(refToRemove, hasFulltext, force);
    if (!confirmed) {
      process.stderr.write("Cancelled.\n");
      process.exit(2);
    }

    const removeOptions: RemoveCommandOptions = {
      identifier,
      idType: useUuid ? "uuid" : "id",
      fulltextDirectory: config.fulltext.directory,
      deleteFulltext: force && hasFulltext,
    };

    const result = await executeRemove(removeOptions, context);
    outputResult(result, identifier, outputFormat, options.full, formatRemoveJsonOutput);
    process.exit(result.removed ? 0 : 1);
  } catch (error) {
    handleRemoveError(error, identifierArg, outputFormat);
  }
}
