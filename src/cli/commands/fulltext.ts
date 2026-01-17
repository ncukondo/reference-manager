/**
 * Fulltext CLI commands: attach, get, detach
 *
 * Uses ILibrary interface for unified operations across local and server modes.
 */

import type { Config } from "../../config/schema.js";
import type { IdentifierType } from "../../core/library-interface.js";
import { Library } from "../../core/library.js";
import type { FulltextType } from "../../features/fulltext/index.js";
import {
  type FulltextAttachResult,
  type FulltextDetachResult,
  type FulltextGetResult,
  type FulltextOpenResult,
  type FulltextAttachOptions as OperationAttachOptions,
  type FulltextDetachOptions as OperationDetachOptions,
  type FulltextGetOptions as OperationGetOptions,
  type FulltextOpenOptions as OperationOpenOptions,
  fulltextAttach,
  fulltextDetach,
  fulltextGet,
  fulltextOpen,
} from "../../features/operations/fulltext/index.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import { isTTY, loadConfigWithOverrides, readStdinBuffer } from "../helpers.js";

/**
 * Options for fulltext attach command
 */
export interface FulltextAttachOptions {
  identifier: string;
  filePath?: string;
  type?: FulltextType;
  move?: boolean;
  force?: boolean;
  idType?: IdentifierType;
  fulltextDirectory: string;
  stdinContent?: Buffer;
}

/**
 * Options for fulltext get command
 */
export interface FulltextGetOptions {
  identifier: string;
  type?: FulltextType;
  stdout?: boolean;
  idType?: IdentifierType;
  fulltextDirectory: string;
}

/**
 * Options for fulltext detach command
 */
export interface FulltextDetachOptions {
  identifier: string;
  type?: FulltextType;
  delete?: boolean;
  force?: boolean;
  idType?: IdentifierType;
  fulltextDirectory: string;
}

/**
 * Options for fulltext open command
 */
export interface FulltextOpenOptions {
  identifier: string;
  type?: FulltextType;
  idType?: IdentifierType;
  fulltextDirectory: string;
}

// Re-export result types
export type { FulltextAttachResult, FulltextGetResult, FulltextDetachResult, FulltextOpenResult };

/**
 * Execute fulltext attach command
 */
export async function executeFulltextAttach(
  options: FulltextAttachOptions,
  context: ExecutionContext
): Promise<FulltextAttachResult> {
  const operationOptions: OperationAttachOptions = {
    identifier: options.identifier,
    filePath: options.filePath,
    type: options.type,
    move: options.move,
    force: options.force,
    idType: options.idType,
    fulltextDirectory: options.fulltextDirectory,
    stdinContent: options.stdinContent,
  };

  return fulltextAttach(context.library, operationOptions);
}

/**
 * Execute fulltext get command
 */
export async function executeFulltextGet(
  options: FulltextGetOptions,
  context: ExecutionContext
): Promise<FulltextGetResult> {
  const operationOptions: OperationGetOptions = {
    identifier: options.identifier,
    type: options.type,
    stdout: options.stdout,
    idType: options.idType,
    fulltextDirectory: options.fulltextDirectory,
  };

  return fulltextGet(context.library, operationOptions);
}

/**
 * Execute fulltext detach command
 */
export async function executeFulltextDetach(
  options: FulltextDetachOptions,
  context: ExecutionContext
): Promise<FulltextDetachResult> {
  const operationOptions: OperationDetachOptions = {
    identifier: options.identifier,
    type: options.type,
    delete: options.delete,
    idType: options.idType,
    fulltextDirectory: options.fulltextDirectory,
  };

  return fulltextDetach(context.library, operationOptions);
}

/**
 * Execute fulltext open command
 */
export async function executeFulltextOpen(
  options: FulltextOpenOptions,
  context: ExecutionContext
): Promise<FulltextOpenResult> {
  const operationOptions: OperationOpenOptions = {
    identifier: options.identifier,
    type: options.type,
    idType: options.idType,
    fulltextDirectory: options.fulltextDirectory,
  };

  return fulltextOpen(context.library, operationOptions);
}

// ============================================================================
// Output formatting functions
// ============================================================================

/**
 * Format fulltext attach output
 */
export function formatFulltextAttachOutput(result: FulltextAttachResult): string {
  if (result.requiresConfirmation) {
    return `File already attached: ${result.existingFile}\nUse --force to overwrite.`;
  }

  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const parts: string[] = [];
  if (result.overwritten) {
    parts.push(`Attached ${result.type} (overwritten): ${result.filename}`);
  } else {
    parts.push(`Attached ${result.type}: ${result.filename}`);
  }

  return parts.join("\n");
}

/**
 * Format fulltext get output
 */
export function formatFulltextGetOutput(result: FulltextGetResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  if (result.content) {
    return result.content.toString();
  }

  const lines: string[] = [];
  if (result.paths?.pdf) {
    lines.push(`pdf: ${result.paths.pdf}`);
  }
  if (result.paths?.markdown) {
    lines.push(`markdown: ${result.paths.markdown}`);
  }

  return lines.join("\n");
}

/**
 * Format fulltext detach output
 */
export function formatFulltextDetachOutput(result: FulltextDetachResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  const lines: string[] = [];
  for (const type of result.detached ?? []) {
    if (result.deleted?.includes(type)) {
      lines.push(`Detached and deleted ${type}`);
    } else {
      lines.push(`Detached ${type}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format fulltext open output
 */
export function formatFulltextOpenOutput(result: FulltextOpenResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  return `Opened ${result.openedType}: ${result.openedPath}`;
}

/**
 * Get exit code for fulltext command result
 */
export function getFulltextExitCode(
  result: FulltextAttachResult | FulltextGetResult | FulltextDetachResult | FulltextOpenResult
): number {
  return result.success ? 0 : 1;
}

// ============================================================================
// Interactive mode and action handlers
// ============================================================================

/**
 * Execute interactive selection for fulltext commands (single-select).
 */
async function executeInteractiveSelect(
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
 * Options for fulltext attach action
 */
export interface FulltextAttachActionOptions {
  pdf?: string | boolean;
  markdown?: string | boolean;
  move?: boolean;
  force?: boolean;
  uuid?: boolean;
}

/**
 * Check if an option value is a valid file path (not a boolean flag)
 */
function isValidFilePath(value: string | boolean | undefined): value is string {
  return typeof value === "string" && value !== "" && value !== "true";
}

/**
 * Parse fulltext attach options to determine file type and path
 */
function parseFulltextAttachTypeAndPath(
  filePathArg: string | undefined,
  options: { pdf?: string | boolean; markdown?: string | boolean }
): { type: "pdf" | "markdown" | undefined; filePath: string | undefined } {
  if (options.pdf) {
    return { type: "pdf", filePath: isValidFilePath(options.pdf) ? options.pdf : filePathArg };
  }
  if (options.markdown) {
    return {
      type: "markdown",
      filePath: isValidFilePath(options.markdown) ? options.markdown : filePathArg,
    };
  }
  return { type: undefined, filePath: filePathArg };
}

/**
 * Handle 'fulltext attach' command action.
 */
export async function handleFulltextAttachAction(
  identifierArg: string | undefined,
  filePathArg: string | undefined,
  options: FulltextAttachActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    let identifier: string;
    if (identifierArg) {
      identifier = identifierArg;
    } else {
      if (!isTTY()) {
        process.stderr.write(
          "Error: No identifier provided. Provide an ID or run interactively in a TTY.\n"
        );
        process.exit(1);
      }
      identifier = await executeInteractiveSelect(context, config);
    }

    const { type, filePath } = parseFulltextAttachTypeAndPath(filePathArg, options);

    // If no file path and type is specified, read from stdin
    const stdinContent = !filePath && type ? await readStdinBuffer() : undefined;

    const attachOptions: FulltextAttachOptions = {
      identifier,
      fulltextDirectory: config.fulltext.directory,
      ...(filePath && { filePath }),
      ...(type && { type }),
      ...(options.move && { move: options.move }),
      ...(options.force && { force: options.force }),
      ...(options.uuid && { idType: "uuid" as const }),
      ...(stdinContent && { stdinContent }),
    };

    const result = await executeFulltextAttach(attachOptions, context);
    const output = formatFulltextAttachOutput(result);
    process.stderr.write(`${output}\n`);
    process.exit(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}

/**
 * Options for fulltext get action
 */
export interface FulltextGetActionOptions {
  pdf?: boolean;
  markdown?: boolean;
  stdout?: boolean;
  uuid?: boolean;
}

/**
 * Output fulltext get result.
 */
function outputFulltextGetResult(result: FulltextGetResult, useStdout: boolean): void {
  if (result.success && result.content && useStdout) {
    process.stdout.write(result.content);
    return;
  }

  const output = formatFulltextGetOutput(result);
  if (result.success) {
    process.stdout.write(`${output}\n`);
  } else {
    process.stderr.write(`${output}\n`);
  }
}

/**
 * Handle 'fulltext get' command action.
 */
export async function handleFulltextGetAction(
  identifierArg: string | undefined,
  options: FulltextGetActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    let identifier: string;
    if (identifierArg) {
      identifier = identifierArg;
    } else {
      if (!isTTY()) {
        process.stderr.write(
          "Error: No identifier provided. Provide an ID or run interactively in a TTY.\n"
        );
        process.exit(1);
      }
      identifier = await executeInteractiveSelect(context, config);
    }

    const getOptions: FulltextGetOptions = {
      identifier,
      fulltextDirectory: config.fulltext.directory,
      ...(options.pdf && { type: "pdf" as const }),
      ...(options.markdown && { type: "markdown" as const }),
      ...(options.stdout && { stdout: options.stdout }),
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeFulltextGet(getOptions, context);
    outputFulltextGetResult(result, Boolean(options.stdout));
    process.exit(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}

/**
 * Options for fulltext detach action
 */
export interface FulltextDetachActionOptions {
  pdf?: boolean;
  markdown?: boolean;
  delete?: boolean;
  force?: boolean;
  uuid?: boolean;
}

/**
 * Handle 'fulltext detach' command action.
 */
export async function handleFulltextDetachAction(
  identifierArg: string | undefined,
  options: FulltextDetachActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    let identifier: string;
    if (identifierArg) {
      identifier = identifierArg;
    } else {
      if (!isTTY()) {
        process.stderr.write(
          "Error: No identifier provided. Provide an ID or run interactively in a TTY.\n"
        );
        process.exit(1);
      }
      identifier = await executeInteractiveSelect(context, config);
    }

    const detachOptions: FulltextDetachOptions = {
      identifier,
      fulltextDirectory: config.fulltext.directory,
      ...(options.pdf && { type: "pdf" as const }),
      ...(options.markdown && { type: "markdown" as const }),
      ...(options.delete && { delete: options.delete }),
      ...(options.force && { force: options.force }),
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeFulltextDetach(detachOptions, context);
    const output = formatFulltextDetachOutput(result);
    process.stderr.write(`${output}\n`);

    process.exit(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}

/**
 * Options for fulltext open action
 */
export interface FulltextOpenActionOptions {
  pdf?: boolean;
  markdown?: boolean;
  uuid?: boolean;
}

/**
 * Handle 'fulltext open' command action.
 */
export async function handleFulltextOpenAction(
  identifierArg: string | undefined,
  options: FulltextOpenActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    let identifier: string;
    if (identifierArg) {
      identifier = identifierArg;
    } else {
      if (!isTTY()) {
        process.stderr.write(
          "Error: No identifier provided. Provide an ID or run interactively in a TTY.\n"
        );
        process.exit(1);
      }
      identifier = await executeInteractiveSelect(context, config);
    }

    const openOptions: FulltextOpenOptions = {
      identifier,
      fulltextDirectory: config.fulltext.directory,
      ...(options.pdf && { type: "pdf" as const }),
      ...(options.markdown && { type: "markdown" as const }),
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeFulltextOpen(openOptions, context);
    const output = formatFulltextOpenOutput(result);
    process.stderr.write(`${output}\n`);
    process.exit(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(4);
  }
}
