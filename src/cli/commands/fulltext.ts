/**
 * Fulltext CLI commands: attach, get, detach
 *
 * Uses ILibrary interface for unified operations across local and server modes.
 */

import type { FulltextType } from "../../features/fulltext/index.js";
import {
  type FulltextAttachResult,
  type FulltextDetachResult,
  type FulltextGetResult,
  type FulltextAttachOptions as OperationAttachOptions,
  type FulltextDetachOptions as OperationDetachOptions,
  type FulltextGetOptions as OperationGetOptions,
  fulltextAttach,
  fulltextDetach,
  fulltextGet,
} from "../../features/operations/fulltext/index.js";
import type { ExecutionContext } from "../execution-context.js";

/**
 * Options for fulltext attach command
 */
export interface FulltextAttachOptions {
  identifier: string;
  filePath?: string;
  type?: FulltextType;
  move?: boolean;
  force?: boolean;
  byUuid?: boolean;
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
  byUuid?: boolean;
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
  byUuid?: boolean;
  fulltextDirectory: string;
}

// Re-export result types
export type { FulltextAttachResult, FulltextGetResult, FulltextDetachResult };

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
    byUuid: options.byUuid,
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
    byUuid: options.byUuid,
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
    byUuid: options.byUuid,
    fulltextDirectory: options.fulltextDirectory,
  };

  return fulltextDetach(context.library, operationOptions);
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
 * Get exit code for fulltext command result
 */
export function getFulltextExitCode(
  result: FulltextAttachResult | FulltextGetResult | FulltextDetachResult
): number {
  return result.success ? 0 : 1;
}
