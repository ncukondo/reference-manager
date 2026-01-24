/**
 * Fulltext attach operation
 *
 * Uses attachments system internally with role='fulltext'.
 */

import { mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import { type AddAttachmentResult, addAttachment } from "../attachments/add.js";
import {
  FULLTEXT_ROLE,
  type FulltextFormat,
  formatToExtension,
} from "../fulltext-adapter/index.js";

/**
 * Fulltext type (matches existing FulltextType for backward compatibility)
 */
export type FulltextType = FulltextFormat;

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
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType | undefined;
  /** Directory for attachments (replaces fulltextDirectory) */
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
    const ext = formatToExtension(fileType);
    const sourcePath = join(tempDir, `stdin.${ext}`);
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
 * Convert AddAttachmentResult to FulltextAttachResult
 */
function convertResult(result: AddAttachmentResult, fileType: FulltextType): FulltextAttachResult {
  if (result.success) {
    return {
      success: true,
      filename: result.filename,
      type: fileType,
      overwritten: result.overwritten,
    };
  }

  if (result.requiresConfirmation) {
    return {
      success: false,
      existingFile: result.existingFile,
      requiresConfirmation: true,
    };
  }

  return {
    success: false,
    error: result.error,
  };
}

/**
 * Attach a fulltext file to a reference.
 *
 * @param library - The library containing the reference
 * @param options - Attach options
 * @returns Result of the attach operation
 */
export async function fulltextAttach(
  library: ILibrary,
  options: FulltextAttachOptions
): Promise<FulltextAttachResult> {
  const {
    identifier,
    filePath,
    type: explicitType,
    move,
    force,
    idType = "id",
    fulltextDirectory,
    stdinContent,
  } = options;

  // Resolve file type first
  const fileTypeResult = resolveFileType(explicitType, filePath, stdinContent);
  if (typeof fileTypeResult === "object" && "error" in fileTypeResult) {
    // Check if reference exists (for consistent error messages)
    const item = await library.find(identifier, { idType });
    if (!item) {
      return { success: false, error: `Reference '${identifier}' not found` };
    }
    return { success: false, error: fileTypeResult.error };
  }
  const fileType = fileTypeResult;

  // Prepare source path
  const sourceResult = prepareSourcePath(filePath, stdinContent, fileType);
  if ("error" in sourceResult) {
    // Check if reference exists (for consistent error messages)
    const item = await library.find(identifier, { idType });
    if (!item) {
      return { success: false, error: `Reference '${identifier}' not found` };
    }
    return { success: false, error: sourceResult.error };
  }
  const { sourcePath, tempDir } = sourceResult;

  try {
    // Use attachments system with fulltext role
    const result = await addAttachment(library, {
      identifier,
      filePath: sourcePath,
      role: FULLTEXT_ROLE,
      move: move ?? false,
      force: force ?? false,
      idType,
      attachmentsDirectory: fulltextDirectory,
    });

    await cleanupTempDir(tempDir);

    return convertResult(result, fileType);
  } catch (error) {
    await cleanupTempDir(tempDir);
    throw error;
  }
}
