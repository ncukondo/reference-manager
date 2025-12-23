/**
 * Fulltext CLI commands: attach, get, detach
 *
 * Standalone mode uses operations directly.
 * Server mode maintains existing logic until ILibrary interface is implemented (see 12.4.6).
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import type { CslItem } from "../../core/csl-json/types.js";
import {
  FulltextIOError,
  FulltextManager,
  FulltextNotAttachedError,
  type FulltextType,
} from "../../features/fulltext/index.js";
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
  // Server mode: use existing logic (TODO: refactor in 12.4.6)
  if (context.type === "server") {
    return executeFulltextAttachServer(options, context);
  }

  // Standalone mode: use operations
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
  // Server mode: use existing logic (TODO: refactor in 12.4.6)
  if (context.type === "server") {
    return executeFulltextGetServer(options, context);
  }

  // Standalone mode: use operations
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
  // Server mode: use existing logic (TODO: refactor in 12.4.6)
  if (context.type === "server") {
    return executeFulltextDetachServer(options, context);
  }

  // Standalone mode: use operations
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
// Server mode implementations (TODO: Remove after 12.4.6 ILibrary refactor)
// ============================================================================

function detectType(filePath: string): FulltextType | undefined {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".md" || ext === ".markdown") return "markdown";
  return undefined;
}

async function findReferenceServer(
  identifier: string,
  context: Extract<ExecutionContext, { type: "server" }>,
  byUuid: boolean
): Promise<CslItem | null> {
  const result = byUuid
    ? await context.client.findByUuid(identifier)
    : await context.client.findById(identifier);
  return result ?? null;
}

async function updateFulltextMetadataServer(
  identifier: string,
  fulltext: { pdf?: string; markdown?: string } | undefined,
  context: Extract<ExecutionContext, { type: "server" }>,
  byUuid: boolean
): Promise<void> {
  const updates = { custom: { fulltext } } as Partial<CslItem>;
  await context.client.update(identifier, updates, { byUuid });
}

async function cleanupTempDir(tempDir: string | undefined): Promise<void> {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

function prepareStdinSource(
  stdinContent: Buffer,
  fileType: FulltextType
): { sourcePath: string; tempDir: string } | { error: string } {
  try {
    const tempDir = mkdtempSync(join(tmpdir(), "refmgr-"));
    const ext = fileType === "pdf" ? ".pdf" : ".md";
    const sourcePath = join(tempDir, `stdin${ext}`);
    writeFileSync(sourcePath, stdinContent);
    return { sourcePath, tempDir };
  } catch (error) {
    return {
      error: `Failed to write stdin content: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function resolveFileType(
  explicitType: FulltextType | undefined,
  filePath: string | undefined,
  stdinContent: Buffer | undefined
): FulltextType | { error: string } {
  let fileType = explicitType;
  if (!fileType && filePath) {
    fileType = detectType(filePath);
  }

  if (stdinContent && !fileType) {
    return {
      error: "File type must be specified with --pdf or --markdown when reading from stdin.",
    };
  }

  if (!fileType) {
    return { error: "Cannot detect file type. Use --pdf or --markdown to specify the type." };
  }

  return fileType;
}

function buildNewFulltext(
  currentFulltext: { pdf?: string | undefined; markdown?: string | undefined },
  fileType: FulltextType,
  filename: string
): { pdf?: string; markdown?: string } {
  const newFulltext: { pdf?: string; markdown?: string } = {};
  if (currentFulltext.pdf) newFulltext.pdf = currentFulltext.pdf;
  if (currentFulltext.markdown) newFulltext.markdown = currentFulltext.markdown;
  newFulltext[fileType] = filename;
  return newFulltext;
}

function buildRemainingFulltext(
  currentFulltext: { pdf?: string | undefined; markdown?: string | undefined },
  detached: FulltextType[]
): { pdf?: string; markdown?: string } | undefined {
  const newFulltext: { pdf?: string; markdown?: string } = {};
  if (currentFulltext.pdf && !detached.includes("pdf")) {
    newFulltext.pdf = currentFulltext.pdf;
  }
  if (currentFulltext.markdown && !detached.includes("markdown")) {
    newFulltext.markdown = currentFulltext.markdown;
  }
  return Object.keys(newFulltext).length > 0 ? newFulltext : undefined;
}

async function executeFulltextAttachServer(
  options: FulltextAttachOptions,
  context: Extract<ExecutionContext, { type: "server" }>
): Promise<FulltextAttachResult> {
  const {
    identifier,
    filePath,
    type: explicitType,
    move,
    force,
    byUuid = false,
    fulltextDirectory,
    stdinContent,
  } = options;

  const item = await findReferenceServer(identifier, context, byUuid);
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  const fileTypeResult = resolveFileType(explicitType, filePath, stdinContent);
  if (typeof fileTypeResult === "object" && "error" in fileTypeResult) {
    return { success: false, error: fileTypeResult.error };
  }
  const fileType = fileTypeResult;

  let sourcePath = filePath;
  let tempDir: string | undefined;

  if (stdinContent) {
    const stdinResult = prepareStdinSource(stdinContent, fileType);
    if ("error" in stdinResult) {
      return { success: false, error: stdinResult.error };
    }
    sourcePath = stdinResult.sourcePath;
    tempDir = stdinResult.tempDir;
  }

  if (!sourcePath) {
    return { success: false, error: "No file path or stdin content provided." };
  }

  const manager = new FulltextManager(fulltextDirectory);

  try {
    const attachOptions = {
      ...(move !== undefined && { move }),
      ...(force !== undefined && { force }),
    };
    const result = await manager.attachFile(item, sourcePath, fileType, attachOptions);

    if (result.existingFile && !result.overwritten) {
      await cleanupTempDir(tempDir);
      return { success: false, existingFile: result.existingFile, requiresConfirmation: true };
    }

    const newFulltext = buildNewFulltext(item.custom?.fulltext ?? {}, fileType, result.filename);
    await updateFulltextMetadataServer(identifier, newFulltext, context, byUuid);
    await cleanupTempDir(tempDir);

    return {
      success: true,
      filename: result.filename,
      type: fileType,
      overwritten: result.overwritten,
    };
  } catch (error) {
    await cleanupTempDir(tempDir);
    if (error instanceof FulltextIOError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}

async function getFileContentServer(
  manager: FulltextManager,
  item: CslItem,
  type: FulltextType,
  identifier: string
): Promise<FulltextGetResult> {
  const filePath = manager.getFilePath(item, type);
  if (!filePath) {
    return { success: false, error: `No ${type} fulltext attached to '${identifier}'` };
  }

  try {
    const content = await readFile(filePath);
    return { success: true, content };
  } catch (error) {
    return {
      success: false,
      error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

function getFilePathsServer(
  manager: FulltextManager,
  item: CslItem,
  types: FulltextType[],
  identifier: string
): FulltextGetResult {
  const paths: { pdf?: string; markdown?: string } = {};
  for (const t of types) {
    const filePath = manager.getFilePath(item, t);
    if (filePath) {
      paths[t] = filePath;
    }
  }

  if (Object.keys(paths).length === 0) {
    return { success: false, error: `No fulltext attached to '${identifier}'` };
  }

  return { success: true, paths };
}

async function executeFulltextGetServer(
  options: FulltextGetOptions,
  context: Extract<ExecutionContext, { type: "server" }>
): Promise<FulltextGetResult> {
  const { identifier, type, stdout, byUuid = false, fulltextDirectory } = options;

  const item = await findReferenceServer(identifier, context, byUuid);
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  const manager = new FulltextManager(fulltextDirectory);

  if (stdout && type) {
    return getFileContentServer(manager, item, type, identifier);
  }

  const attachedTypes = type ? [type] : manager.getAttachedTypes(item);
  if (attachedTypes.length === 0) {
    return { success: false, error: `No fulltext attached to '${identifier}'` };
  }

  return getFilePathsServer(manager, item, attachedTypes, identifier);
}

async function performDetachOperationsServer(
  manager: FulltextManager,
  item: CslItem,
  typesToDetach: FulltextType[],
  deleteFile: boolean | undefined
): Promise<{ detached: FulltextType[]; deleted: FulltextType[] }> {
  const detached: FulltextType[] = [];
  const deleted: FulltextType[] = [];

  for (const t of typesToDetach) {
    const detachOptions = deleteFile ? { delete: deleteFile } : {};
    const result = await manager.detachFile(item, t, detachOptions);
    detached.push(t);
    if (result.deleted) {
      deleted.push(t);
    }
  }

  return { detached, deleted };
}

function handleDetachErrorServer(error: unknown): FulltextDetachResult {
  if (error instanceof FulltextNotAttachedError || error instanceof FulltextIOError) {
    return { success: false, error: error.message };
  }
  throw error;
}

async function executeFulltextDetachServer(
  options: FulltextDetachOptions,
  context: Extract<ExecutionContext, { type: "server" }>
): Promise<FulltextDetachResult> {
  const { identifier, type, delete: deleteFile, byUuid = false, fulltextDirectory } = options;

  const item = await findReferenceServer(identifier, context, byUuid);
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  const manager = new FulltextManager(fulltextDirectory);
  const typesToDetach: FulltextType[] = type ? [type] : manager.getAttachedTypes(item);

  if (typesToDetach.length === 0) {
    return { success: false, error: `No fulltext attached to '${identifier}'` };
  }

  try {
    const { detached, deleted } = await performDetachOperationsServer(
      manager,
      item,
      typesToDetach,
      deleteFile
    );

    const updatedFulltext = buildRemainingFulltext(item.custom?.fulltext ?? {}, detached);
    await updateFulltextMetadataServer(identifier, updatedFulltext, context, byUuid);

    const resultData: FulltextDetachResult = { success: true, detached };
    if (deleted.length > 0) {
      resultData.deleted = deleted;
    }
    return resultData;
  } catch (error) {
    return handleDetachErrorServer(error);
  }
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
