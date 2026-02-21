/**
 * Fulltext CLI commands: attach, get, detach
 *
 * Uses ILibrary interface for unified operations across local and server modes.
 */

import type { Config } from "../../config/schema.js";
import type { FulltextSource } from "../../config/schema.js";
import type { IdentifierType } from "../../core/library-interface.js";
import { Library } from "../../core/library.js";
import type { FulltextType } from "../../features/fulltext/index.js";
import {
  type FulltextAttachResult,
  type FulltextConvertResult,
  type FulltextDetachResult,
  type FulltextDiscoverResult,
  type FulltextFetchResult,
  type FulltextGetResult,
  type FulltextOpenResult,
  type FulltextAttachOptions as OperationAttachOptions,
  type FulltextConvertOptions as OperationConvertOptions,
  type FulltextDetachOptions as OperationDetachOptions,
  type FulltextDiscoverOptions as OperationDiscoverOptions,
  type FulltextFetchOptions as OperationFetchOptions,
  type FulltextGetOptions as OperationGetOptions,
  type FulltextOpenOptions as OperationOpenOptions,
  fulltextAttach,
  fulltextConvert,
  fulltextDetach,
  fulltextDiscover,
  fulltextFetch,
  fulltextGet,
  fulltextOpen,
} from "../../features/operations/fulltext/index.js";
import { type ExecutionContext, createExecutionContext } from "../execution-context.js";
import {
  ExitCode,
  isTTY,
  loadConfigWithOverrides,
  readIdentifierFromStdin,
  readIdentifiersFromStdin,
  readStdinBuffer,
  setExitCode,
} from "../helpers.js";

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
  preferredType?: FulltextType;
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
  removeFiles?: boolean;
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
  preferredType?: FulltextType;
  idType?: IdentifierType;
  fulltextDirectory: string;
}

/**
 * Options for fulltext discover command
 */
export interface FulltextDiscoverOptions {
  identifier: string;
  idType?: IdentifierType;
}

/**
 * Options for fulltext fetch command
 */
export interface FulltextFetchOptions {
  identifier: string;
  idType?: IdentifierType;
  source?: FulltextSource;
  force?: boolean;
  fulltextDirectory: string;
}

/**
 * Options for fulltext convert command
 */
export interface FulltextConvertOptions {
  identifier: string;
  idType?: IdentifierType;
  fulltextDirectory: string;
}

// Re-export result types
export type {
  FulltextAttachResult,
  FulltextConvertResult,
  FulltextDetachResult,
  FulltextDiscoverResult,
  FulltextFetchResult,
  FulltextGetResult,
  FulltextOpenResult,
};

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
    preferredType: options.preferredType,
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
    removeFiles: options.removeFiles,
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
    preferredType: options.preferredType,
    idType: options.idType,
    fulltextDirectory: options.fulltextDirectory,
  };

  return fulltextOpen(context.library, operationOptions);
}

/**
 * Execute fulltext discover command
 */
export async function executeFulltextDiscover(
  options: FulltextDiscoverOptions,
  context: ExecutionContext,
  config: Config
): Promise<FulltextDiscoverResult> {
  const operationOptions: OperationDiscoverOptions = {
    identifier: options.identifier,
    idType: options.idType,
    fulltextConfig: config.fulltext,
  };

  return fulltextDiscover(context.library, operationOptions);
}

/**
 * Execute fulltext fetch command
 */
export async function executeFulltextFetch(
  options: FulltextFetchOptions,
  context: ExecutionContext,
  config: Config
): Promise<FulltextFetchResult> {
  const operationOptions: OperationFetchOptions = {
    identifier: options.identifier,
    idType: options.idType,
    fulltextConfig: config.fulltext,
    fulltextDirectory: options.fulltextDirectory,
    source: options.source,
    force: options.force,
  };

  return fulltextFetch(context.library, operationOptions);
}

/**
 * Execute fulltext convert command
 */
export async function executeFulltextConvert(
  options: FulltextConvertOptions,
  context: ExecutionContext
): Promise<FulltextConvertResult> {
  const operationOptions: OperationConvertOptions = {
    identifier: options.identifier,
    idType: options.idType,
    fulltextDirectory: options.fulltextDirectory,
  };

  return fulltextConvert(context.library, operationOptions);
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
 * Format fulltext discover output
 */
export function formatFulltextDiscoverOutput(
  result: FulltextDiscoverResult,
  identifier: string
): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  if (!result.locations || result.locations.length === 0) {
    return `No OA sources found for ${identifier}`;
  }

  const lines: string[] = [`OA sources for ${identifier}:`];
  for (const loc of result.locations) {
    const license = loc.license ? ` (${loc.license})` : "";
    lines.push(`  ${loc.source}: ${loc.url}${license}`);
  }

  if (result.errors && result.errors.length > 0) {
    for (const err of result.errors) {
      lines.push(`  Warning: ${err.source}: ${err.error}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format fulltext fetch output
 */
export function formatFulltextFetchOutput(result: FulltextFetchResult): string {
  if (!result.success) {
    return formatFetchErrorOutput(result);
  }

  const lines: string[] = [];
  if (result.source) {
    lines.push(`Source: ${result.source}`);
  }
  for (const file of result.attachedFiles ?? []) {
    lines.push(`Attached ${file}: fulltext.${file === "markdown" ? "md" : file}`);
  }

  return lines.join("\n");
}

function formatFetchErrorOutput(result: FulltextFetchResult): string {
  const lines: string[] = [`Error: ${result.error}`];
  if (result.checkedSources && result.checkedSources.length > 0) {
    lines.push(`  Checked: ${result.checkedSources.join(", ")}`);
  }
  if (result.skipped && result.skipped.length > 0) {
    const skippedParts = result.skipped.map((s) => `${s.source} (${s.reason})`);
    lines.push(`  Skipped: ${skippedParts.join(", ")}`);
  }
  for (const de of result.discoveryErrors ?? []) {
    lines.push(`  ${de.source}: ${de.error}`);
  }
  for (const attempt of result.attempts ?? []) {
    const fileType = attempt.fileType.toUpperCase();
    lines.push(`  ${attempt.source}: ${fileType} ${attempt.phase} \u2192 ${attempt.error}`);
  }
  if (result.hint) {
    lines.push(`  Hint: ${result.hint}`);
  }
  return lines.join("\n");
}

/**
 * Format fulltext convert output
 */
export function formatFulltextConvertOutput(result: FulltextConvertResult): string {
  if (!result.success) {
    return `Error: ${result.error}`;
  }

  return `Converted PMC XML to Markdown: ${result.filename}`;
}

/**
 * Get exit code for fulltext command result
 */
export function getFulltextExitCode(
  result:
    | FulltextAttachResult
    | FulltextGetResult
    | FulltextDetachResult
    | FulltextOpenResult
    | FulltextDiscoverResult
    | FulltextFetchResult
    | FulltextConvertResult
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
  config: Config,
  multiSelect = false
): Promise<string[]> {
  const { withAlternateScreen } = await import("../../features/interactive/alternate-screen.js");
  const { selectReferencesOrExit } = await import("../../features/interactive/reference-select.js");

  const allReferences = await context.library.getAll();

  // Run TUI session in alternate screen to preserve terminal scrollback
  const identifiers = await withAlternateScreen(() =>
    selectReferencesOrExit(allReferences, { multiSelect }, config.cli.tui)
  );

  return identifiers;
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
        setExitCode(ExitCode.ERROR);
        return;
      }
      // Safe: selectReferencesOrExit guarantees a non-empty array
      identifier = (await executeInteractiveSelect(context, config))[0] as string;
    }

    const { type, filePath } = parseFulltextAttachTypeAndPath(filePathArg, options);

    // If no file path and type is specified, read from stdin
    const stdinContent = !filePath && type ? await readStdinBuffer() : undefined;

    const attachOptions: FulltextAttachOptions = {
      identifier,
      fulltextDirectory: config.attachments.directory,
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
    setExitCode(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}

export interface FulltextGetIdResult {
  id: string;
  result: FulltextGetResult;
}

export function formatMultiFulltextGetOutput(results: FulltextGetIdResult[]): {
  stdout: string;
  stderr: string;
} {
  const isSingle = results.length === 1;

  if (isSingle) {
    const { result } = results[0] as FulltextGetIdResult;
    const formatted = formatFulltextGetOutput(result);
    return {
      stdout: result.success ? formatted : "",
      stderr: result.success ? "" : formatted,
    };
  }

  // Multiple IDs: grouped format
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];

  for (const { id, result } of results) {
    if (result.success) {
      stdoutLines.push(`${id}:`);
      if (result.paths?.pdf) {
        stdoutLines.push(`  pdf: ${result.paths.pdf}`);
      }
      if (result.paths?.markdown) {
        stdoutLines.push(`  markdown: ${result.paths.markdown}`);
      }
    } else {
      stderrLines.push(`Error: ${result.error}`);
    }
  }

  return {
    stdout: stdoutLines.join("\n"),
    stderr: stderrLines.join("\n"),
  };
}

export function formatFulltextGetJsonOutput(results: FulltextGetIdResult[]): string {
  const toJsonItem = ({ id, result }: FulltextGetIdResult): Record<string, unknown> => {
    if (result.success) {
      return { id, success: true, paths: result.paths };
    }
    return { id, success: false, error: result.error };
  };

  if (results.length === 1) {
    return JSON.stringify(toJsonItem(results[0] as FulltextGetIdResult), null, 2);
  }

  return JSON.stringify(results.map(toJsonItem), null, 2);
}

/** Options for fulltext get action */
export interface FulltextGetActionOptions {
  pdf?: boolean;
  markdown?: boolean;
  prefer?: "pdf" | "markdown";
  stdout?: boolean;
  uuid?: boolean;
  output?: "json" | "text";
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
async function resolveGetIdentifiers(
  identifierArgs: string[],
  context: ExecutionContext,
  config: Config
): Promise<string[] | null> {
  if (identifierArgs.length > 0) {
    return identifierArgs;
  }
  if (isTTY()) {
    return executeInteractiveSelect(context, config, true);
  }
  // Non-TTY mode: read from stdin (pipeline support)
  const stdinIds = await readIdentifiersFromStdin();
  if (stdinIds.length === 0) {
    process.stderr.write(
      "Error: No identifier provided. Provide an ID, pipe one via stdin, or run interactively in a TTY.\n"
    );
    return null;
  }
  return stdinIds;
}

async function collectFulltextGetResults(
  identifiers: string[],
  options: FulltextGetActionOptions,
  config: Config,
  context: ExecutionContext
): Promise<FulltextGetIdResult[]> {
  const preferValue = options.prefer ?? config.fulltext.preferredType;
  const results: FulltextGetIdResult[] = [];

  for (const identifier of identifiers) {
    const getOptions: FulltextGetOptions = {
      identifier,
      fulltextDirectory: config.attachments.directory,
      ...(options.pdf && { type: "pdf" as const }),
      ...(options.markdown && { type: "markdown" as const }),
      ...(options.stdout && { stdout: options.stdout }),
      ...(options.uuid && { idType: "uuid" as const }),
      ...(preferValue && { preferredType: preferValue }),
    };

    const result = await executeFulltextGet(getOptions, context);
    results.push({ id: identifier, result });
  }

  return results;
}

function outputFulltextGetResults(
  results: FulltextGetIdResult[],
  options: FulltextGetActionOptions
): void {
  if (options.output === "json") {
    process.stdout.write(`${formatFulltextGetJsonOutput(results)}\n`);
    return;
  }

  if (results.length === 1) {
    outputFulltextGetResult((results[0] as FulltextGetIdResult).result, Boolean(options.stdout));
    return;
  }

  const output = formatMultiFulltextGetOutput(results);
  if (output.stdout) {
    process.stdout.write(`${output.stdout}\n`);
  }
  if (output.stderr) {
    process.stderr.write(`${output.stderr}\n`);
  }
}

export async function handleFulltextGetAction(
  identifierArgs: string[],
  options: FulltextGetActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    const identifiers = await resolveGetIdentifiers(identifierArgs, context, config);
    if (!identifiers) {
      setExitCode(ExitCode.ERROR);
      return;
    }

    // --stdout is incompatible with multiple identifiers
    if (options.stdout && identifiers.length > 1) {
      process.stderr.write("Error: --stdout cannot be used with multiple identifiers\n");
      setExitCode(ExitCode.ERROR);
      return;
    }

    const results = await collectFulltextGetResults(identifiers, options, config, context);
    outputFulltextGetResults(results, options);

    const hasFailure = results.some((r) => !r.result.success);
    setExitCode(hasFailure ? ExitCode.ERROR : ExitCode.SUCCESS);
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}

/**
 * Options for fulltext detach action
 */
export interface FulltextDetachActionOptions {
  pdf?: boolean;
  markdown?: boolean;
  removeFiles?: boolean;
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
    } else if (isTTY()) {
      // TTY mode: interactive selection
      // Safe: selectReferencesOrExit guarantees a non-empty array
      identifier = (await executeInteractiveSelect(context, config))[0] as string;
    } else {
      // Non-TTY mode: read from stdin (pipeline support)
      const stdinId = await readIdentifierFromStdin();
      if (!stdinId) {
        process.stderr.write(
          "Error: No identifier provided. Provide an ID, pipe one via stdin, or run interactively in a TTY.\n"
        );
        setExitCode(ExitCode.ERROR);
        return;
      }
      identifier = stdinId;
    }

    const detachOptions: FulltextDetachOptions = {
      identifier,
      fulltextDirectory: config.attachments.directory,
      ...(options.pdf && { type: "pdf" as const }),
      ...(options.markdown && { type: "markdown" as const }),
      ...(options.removeFiles && { removeFiles: options.removeFiles }),
      ...(options.force && { force: options.force }),
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeFulltextDetach(detachOptions, context);
    const output = formatFulltextDetachOutput(result);
    process.stderr.write(`${output}\n`);

    setExitCode(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}

/**
 * Options for fulltext open action
 */
export interface FulltextOpenActionOptions {
  pdf?: boolean;
  markdown?: boolean;
  prefer?: "pdf" | "markdown";
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
    } else if (isTTY()) {
      // TTY mode: interactive selection
      // Safe: selectReferencesOrExit guarantees a non-empty array
      identifier = (await executeInteractiveSelect(context, config))[0] as string;
    } else {
      // Non-TTY mode: read from stdin (pipeline support)
      const stdinId = await readIdentifierFromStdin();
      if (!stdinId) {
        process.stderr.write(
          "Error: No identifier provided. Provide an ID, pipe one via stdin, or run interactively in a TTY.\n"
        );
        setExitCode(ExitCode.ERROR);
        return;
      }
      identifier = stdinId;
    }

    // Resolve preferredType: CLI --prefer > config
    const preferValue = options.prefer ?? config.fulltext.preferredType;

    const openOptions: FulltextOpenOptions = {
      identifier,
      fulltextDirectory: config.attachments.directory,
      ...(options.pdf && { type: "pdf" as const }),
      ...(options.markdown && { type: "markdown" as const }),
      ...(options.uuid && { idType: "uuid" as const }),
      ...(preferValue && { preferredType: preferValue }),
    };

    const result = await executeFulltextOpen(openOptions, context);
    const output = formatFulltextOpenOutput(result);
    process.stderr.write(`${output}\n`);
    setExitCode(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}

/**
 * Options for fulltext discover action
 */
export interface FulltextDiscoverActionOptions {
  uuid?: boolean;
}

/**
 * Handle 'fulltext discover' command action.
 */
export async function handleFulltextDiscoverAction(
  identifierArg: string | undefined,
  options: FulltextDiscoverActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    let identifier: string;
    if (identifierArg) {
      identifier = identifierArg;
    } else if (isTTY()) {
      // Safe: selectReferencesOrExit guarantees a non-empty array
      identifier = (await executeInteractiveSelect(context, config))[0] as string;
    } else {
      const stdinId = await readIdentifierFromStdin();
      if (!stdinId) {
        process.stderr.write(
          "Error: No identifier provided. Provide an ID, pipe one via stdin, or run interactively in a TTY.\n"
        );
        setExitCode(ExitCode.ERROR);
        return;
      }
      identifier = stdinId;
    }

    const discoverOptions: FulltextDiscoverOptions = {
      identifier,
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeFulltextDiscover(discoverOptions, context, config);
    const output = formatFulltextDiscoverOutput(result, identifier);
    if (result.success) {
      process.stdout.write(`${output}\n`);
    } else {
      process.stderr.write(`${output}\n`);
    }
    setExitCode(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}

/**
 * Options for fulltext fetch action
 */
export interface FulltextFetchActionOptions {
  source?: string;
  force?: boolean;
  uuid?: boolean;
}

/**
 * Handle 'fulltext fetch' command action.
 */
export async function handleFulltextFetchAction(
  identifierArg: string | undefined,
  options: FulltextFetchActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    let identifier: string;
    if (identifierArg) {
      identifier = identifierArg;
    } else if (isTTY()) {
      // Safe: selectReferencesOrExit guarantees a non-empty array
      identifier = (await executeInteractiveSelect(context, config))[0] as string;
    } else {
      const stdinId = await readIdentifierFromStdin();
      if (!stdinId) {
        process.stderr.write(
          "Error: No identifier provided. Provide an ID, pipe one via stdin, or run interactively in a TTY.\n"
        );
        setExitCode(ExitCode.ERROR);
        return;
      }
      identifier = stdinId;
    }

    process.stderr.write(`Fetching fulltext for ${identifier}...\n`);

    const fetchOptions: FulltextFetchOptions = {
      identifier,
      fulltextDirectory: config.attachments.directory,
      ...(options.source && { source: options.source as FulltextSource }),
      ...(options.force && { force: options.force }),
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeFulltextFetch(fetchOptions, context, config);
    const output = formatFulltextFetchOutput(result);
    process.stderr.write(`${output}\n`);
    setExitCode(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}

/**
 * Options for fulltext convert action
 */
export interface FulltextConvertActionOptions {
  uuid?: boolean;
}

/**
 * Handle 'fulltext convert' command action.
 */
export async function handleFulltextConvertAction(
  identifierArg: string | undefined,
  options: FulltextConvertActionOptions,
  globalOpts: Record<string, unknown>
): Promise<void> {
  try {
    const config = await loadConfigWithOverrides({ ...globalOpts, ...options });
    const context = await createExecutionContext(config, Library.load);

    let identifier: string;
    if (identifierArg) {
      identifier = identifierArg;
    } else if (isTTY()) {
      // Safe: selectReferencesOrExit guarantees a non-empty array
      identifier = (await executeInteractiveSelect(context, config))[0] as string;
    } else {
      const stdinId = await readIdentifierFromStdin();
      if (!stdinId) {
        process.stderr.write(
          "Error: No identifier provided. Provide an ID, pipe one via stdin, or run interactively in a TTY.\n"
        );
        setExitCode(ExitCode.ERROR);
        return;
      }
      identifier = stdinId;
    }

    const convertOptions: FulltextConvertOptions = {
      identifier,
      fulltextDirectory: config.attachments.directory,
      ...(options.uuid && { idType: "uuid" as const }),
    };

    const result = await executeFulltextConvert(convertOptions, context);
    const output = formatFulltextConvertOutput(result);
    process.stderr.write(`${output}\n`);
    setExitCode(getFulltextExitCode(result));
  } catch (error) {
    process.stderr.write(`Error: ${error instanceof Error ? error.message : String(error)}\n`);
    setExitCode(ExitCode.INTERNAL_ERROR);
  }
}
