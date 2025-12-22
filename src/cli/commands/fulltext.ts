/**
 * Fulltext CLI commands: attach, get, detach
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
import { updateReference } from "../../features/operations/update.js";
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
  // For stdin support
  stdinContent?: Buffer;
}

/**
 * Result from fulltext attach command
 */
export interface FulltextAttachResult {
  success: boolean;
  filename?: string;
  type?: FulltextType;
  overwritten?: boolean;
  existingFile?: string;
  requiresConfirmation?: boolean;
  error?: string;
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
 * Result from fulltext get command
 */
export interface FulltextGetResult {
  success: boolean;
  paths?: {
    pdf?: string;
    markdown?: string;
  };
  content?: Buffer;
  error?: string;
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

/**
 * Result from fulltext detach command
 */
export interface FulltextDetachResult {
  success: boolean;
  detached?: FulltextType[];
  deleted?: FulltextType[];
  error?: string;
}

/**
 * Detect fulltext type from file extension
 */
function detectType(filePath: string): FulltextType | undefined {
  const ext = extname(filePath).toLowerCase();
  if (ext === ".pdf") return "pdf";
  if (ext === ".md" || ext === ".markdown") return "markdown";
  return undefined;
}

/**
 * Find reference by identifier
 */
async function findReference(
  identifier: string,
  context: ExecutionContext,
  byUuid: boolean
): Promise<CslItem | null> {
  if (context.type === "server") {
    return context.client.find(identifier, { byUuid });
  }
  const ref = byUuid
    ? context.library.findByUuid(identifier)
    : context.library.findById(identifier);
  return ref?.getItem() ?? null;
}

/**
 * Update reference metadata with fulltext info
 */
async function updateFulltextMetadata(
  identifier: string,
  fulltext: { pdf?: string; markdown?: string } | undefined,
  context: ExecutionContext,
  byUuid: boolean
): Promise<void> {
  // Build updates with fulltext only - other custom fields preserved by merge in updateReference
  const updates = {
    custom: { fulltext },
  } as Partial<CslItem>;

  if (context.type === "server") {
    await context.client.update(identifier, updates, { byUuid });
  } else {
    await updateReference(context.library, {
      identifier,
      updates,
      byUuid,
    });
  }
}

/**
 * Clean up temp directory
 */
async function cleanupTempDir(tempDir: string | undefined): Promise<void> {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Prepare source path from stdin content
 */
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

/**
 * Build new fulltext metadata
 */
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

/**
 * Resolve file type from options
 */
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

/**
 * Execute fulltext attach command
 */
export async function executeFulltextAttach(
  options: FulltextAttachOptions,
  context: ExecutionContext
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

  // Find reference
  const item = await findReference(identifier, context, byUuid);
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  // Resolve file type
  const fileTypeResult = resolveFileType(explicitType, filePath, stdinContent);
  if (typeof fileTypeResult === "object" && "error" in fileTypeResult) {
    return { success: false, error: fileTypeResult.error };
  }
  const fileType = fileTypeResult;

  // Prepare source path
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

  // Attach file
  const manager = new FulltextManager(fulltextDirectory);

  try {
    const attachOptions = {
      ...(move !== undefined && { move }),
      ...(force !== undefined && { force }),
    };
    const result = await manager.attachFile(item, sourcePath, fileType, attachOptions);

    // If existing file and not force, return confirmation required
    if (result.existingFile && !result.overwritten) {
      await cleanupTempDir(tempDir);
      return { success: false, existingFile: result.existingFile, requiresConfirmation: true };
    }

    // Update metadata
    const newFulltext = buildNewFulltext(item.custom?.fulltext ?? {}, fileType, result.filename);
    await updateFulltextMetadata(identifier, newFulltext, context, byUuid);
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

/**
 * Get file content for stdout mode
 */
async function getFileContent(
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

/**
 * Get file paths for path mode
 */
function getFilePaths(
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

/**
 * Execute fulltext get command
 */
export async function executeFulltextGet(
  options: FulltextGetOptions,
  context: ExecutionContext
): Promise<FulltextGetResult> {
  const { identifier, type, stdout, byUuid = false, fulltextDirectory } = options;

  const item = await findReference(identifier, context, byUuid);
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  const manager = new FulltextManager(fulltextDirectory);

  // Stdout mode with specific type
  if (stdout && type) {
    return getFileContent(manager, item, type, identifier);
  }

  // Path mode
  const attachedTypes = type ? [type] : manager.getAttachedTypes(item);
  if (attachedTypes.length === 0) {
    return { success: false, error: `No fulltext attached to '${identifier}'` };
  }

  return getFilePaths(manager, item, attachedTypes, identifier);
}

/**
 * Perform detach operations for specified types
 */
async function performDetachOperations(
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

/**
 * Build remaining fulltext metadata after detach
 */
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

/**
 * Handle detach errors
 */
function handleDetachError(error: unknown): FulltextDetachResult {
  if (error instanceof FulltextNotAttachedError || error instanceof FulltextIOError) {
    return { success: false, error: error.message };
  }
  throw error;
}

/**
 * Execute fulltext detach command
 */
export async function executeFulltextDetach(
  options: FulltextDetachOptions,
  context: ExecutionContext
): Promise<FulltextDetachResult> {
  const { identifier, type, delete: deleteFile, byUuid = false, fulltextDirectory } = options;

  const item = await findReference(identifier, context, byUuid);
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  const manager = new FulltextManager(fulltextDirectory);
  const typesToDetach: FulltextType[] = type ? [type] : manager.getAttachedTypes(item);

  if (typesToDetach.length === 0) {
    return { success: false, error: `No fulltext attached to '${identifier}'` };
  }

  try {
    const { detached, deleted } = await performDetachOperations(
      manager,
      item,
      typesToDetach,
      deleteFile
    );

    const updatedFulltext = buildRemainingFulltext(item.custom?.fulltext ?? {}, detached);
    await updateFulltextMetadata(identifier, updatedFulltext, context, byUuid);

    const resultData: FulltextDetachResult = { success: true, detached };
    if (deleted.length > 0) {
      resultData.deleted = deleted;
    }
    return resultData;
  } catch (error) {
    return handleDetachError(error);
  }
}

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

  // If content mode (stdout), the content is returned as Buffer, handled by CLI
  if (result.content) {
    return result.content.toString();
  }

  // Path mode
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
