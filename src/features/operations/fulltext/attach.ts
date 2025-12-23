/**
 * Fulltext attach operation
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { Library } from "../../../core/library.js";
import { FulltextIOError, FulltextManager, type FulltextType } from "../../fulltext/index.js";
import { updateReference } from "../update.js";

/**
 * Options for fulltextAttach operation
 */
export interface FulltextAttachOptions {
  /** Reference identifier (id or uuid) */
  identifier: string;
  /** Path to the file to attach */
  filePath?: string | undefined;
  /** Explicit file type (pdf or markdown) */
  type?: FulltextType | undefined;
  /** Move file instead of copy */
  move?: boolean | undefined;
  /** Force overwrite existing file */
  force?: boolean | undefined;
  /** Use uuid instead of id for lookup */
  byUuid?: boolean | undefined;
  /** Directory for fulltext files */
  fulltextDirectory: string;
  /** Content from stdin */
  stdinContent?: Buffer | undefined;
}

/**
 * Result of fulltextAttach operation
 */
export interface FulltextAttachResult {
  success: boolean;
  filename?: string | undefined;
  type?: FulltextType | undefined;
  overwritten?: boolean | undefined;
  existingFile?: string | undefined;
  requiresConfirmation?: boolean | undefined;
  error?: string | undefined;
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
 * Clean up temp directory
 */
async function cleanupTempDir(tempDir: string | undefined): Promise<void> {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
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
 * Prepare source path from options
 */
function prepareSourcePath(
  filePath: string | undefined,
  stdinContent: Buffer | undefined,
  fileType: FulltextType
): { sourcePath: string; tempDir?: string } | { error: string } {
  if (stdinContent) {
    return prepareStdinSource(stdinContent, fileType);
  }

  if (!filePath) {
    return { error: "No file path or stdin content provided." };
  }

  return { sourcePath: filePath };
}

/**
 * Perform the file attach operation
 */
async function performAttach(
  manager: FulltextManager,
  item: CslItem,
  sourcePath: string,
  fileType: FulltextType,
  move: boolean | undefined,
  force: boolean | undefined
): Promise<{ filename: string; overwritten?: boolean; existingFile?: string }> {
  const attachOptions = {
    ...(move !== undefined && { move }),
    ...(force !== undefined && { force }),
  };
  return manager.attachFile(item, sourcePath, fileType, attachOptions);
}

/**
 * Attach a fulltext file to a reference.
 *
 * @param library - The library containing the reference
 * @param options - Attach options
 * @returns Result of the attach operation
 */
export async function fulltextAttach(
  library: Library,
  options: FulltextAttachOptions
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
  const ref = byUuid ? library.findByUuid(identifier) : library.findById(identifier);
  const item = ref?.getItem();

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
  const sourceResult = prepareSourcePath(filePath, stdinContent, fileType);
  if ("error" in sourceResult) {
    return { success: false, error: sourceResult.error };
  }
  const { sourcePath, tempDir } = sourceResult;

  // Attach file
  const manager = new FulltextManager(fulltextDirectory);

  try {
    const result = await performAttach(manager, item, sourcePath, fileType, move, force);

    // If existing file and not force, return confirmation required
    if (result.existingFile && !result.overwritten) {
      await cleanupTempDir(tempDir);
      return { success: false, existingFile: result.existingFile, requiresConfirmation: true };
    }

    // Update metadata
    const newFulltext = buildNewFulltext(item.custom?.fulltext ?? {}, fileType, result.filename);
    await updateReference(library, {
      identifier,
      updates: {
        custom: { fulltext: newFulltext },
      } as Partial<CslItem>,
      byUuid,
    });
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
