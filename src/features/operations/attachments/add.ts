/**
 * Attachment add operation
 */

import { copyFile, rename, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import { ensureDirectory } from "../../attachments/directory-manager.js";
import { generateDirectoryName } from "../../attachments/directory.js";
import { generateFilename } from "../../attachments/filename.js";
import {
  type AttachmentFile,
  type Attachments,
  getExtension,
  isValidFulltextFiles,
} from "../../attachments/types.js";

/**
 * Options for addAttachment operation
 */
export interface AddAttachmentOptions {
  /** Reference identifier (id or uuid) */
  identifier: string;
  /** Path to the file to attach */
  filePath: string;
  /** Role for the attachment */
  role: string;
  /** Human-readable label (optional) */
  label?: string;
  /** Move file instead of copy */
  move?: boolean;
  /** Force overwrite existing file */
  force?: boolean;
  /** Identifier type */
  idType?: IdentifierType;
  /** Base directory for attachments */
  attachmentsDirectory: string;
}

/**
 * Result of addAttachment operation
 */
export interface AddAttachmentResult {
  success: boolean;
  filename?: string;
  directory?: string;
  overwritten?: boolean;
  existingFile?: string;
  requiresConfirmation?: boolean;
  error?: string;
}

/**
 * Reference with attachment-related fields
 */
interface ReferenceForAttachments {
  id: string;
  PMID?: string;
  custom?: {
    uuid?: string;
    attachments?: Attachments;
  };
}

/**
 * Check if source file exists
 */
async function checkSourceFile(filePath: string): Promise<string | null> {
  try {
    await stat(filePath);
    return null;
  } catch {
    return `Source file not found: ${filePath}`;
  }
}

/**
 * Validate fulltext constraints
 */
function validateFulltextConstraint(
  existingFiles: AttachmentFile[],
  newFile: AttachmentFile
): string | null {
  if (newFile.role !== "fulltext") {
    return null;
  }

  const newExt = getExtension(newFile.filename);
  const existingFulltexts = existingFiles.filter((f) => f.role === "fulltext");

  // Check if same format already exists
  for (const existing of existingFulltexts) {
    const existingExt = getExtension(existing.filename);
    if (existingExt === newExt) {
      return `A fulltext ${newExt.toUpperCase()} already exists. Use --force to overwrite.`;
    }
  }

  // Check total count constraint
  const testFiles = [...existingFiles, newFile];
  if (!isValidFulltextFiles(testFiles)) {
    return "fulltext role allows max 2 files (1 PDF + 1 Markdown)";
  }

  return null;
}

/**
 * Check if file with same name already exists
 */
function findExistingFile(files: AttachmentFile[], filename: string): AttachmentFile | undefined {
  return files.find((f) => f.filename === filename);
}

/**
 * Copy or move file to destination
 */
async function copyOrMoveFile(
  sourcePath: string,
  destPath: string,
  move: boolean
): Promise<string | null> {
  try {
    if (move) {
      await rename(sourcePath, destPath);
    } else {
      await copyFile(sourcePath, destPath);
    }
    return null;
  } catch (error) {
    return `Failed to ${move ? "move" : "copy"} file: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * Update library with new attachment metadata
 */
async function updateAttachmentMetadata(
  library: ILibrary,
  item: CslItem,
  updatedAttachments: Attachments
): Promise<void> {
  await library.update(item.id, {
    custom: {
      ...item.custom,
      attachments: updatedAttachments,
    },
  } as Partial<CslItem>);
}

/**
 * Build updated files list
 */
function buildUpdatedFiles(
  existingFiles: AttachmentFile[],
  newFile: AttachmentFile,
  existingFile: AttachmentFile | undefined
): AttachmentFile[] {
  if (existingFile) {
    return existingFiles.map((f) => (f.filename === newFile.filename ? newFile : f));
  }
  return [...existingFiles, newFile];
}

/**
 * Add an attachment to a reference
 */
export async function addAttachment(
  library: ILibrary,
  options: AddAttachmentOptions
): Promise<AddAttachmentResult> {
  const {
    identifier,
    filePath,
    role,
    label,
    move = false,
    force = false,
    idType = "id",
    attachmentsDirectory,
  } = options;

  // Find reference
  const item = await library.find(identifier, { idType });
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  // Check UUID
  const uuid = (item as CslItem).custom?.uuid;
  if (!uuid) {
    return { success: false, error: "Reference has no UUID. Cannot create attachment directory." };
  }

  // Check source file exists
  const sourceError = await checkSourceFile(filePath);
  if (sourceError) {
    return { success: false, error: sourceError };
  }

  // Generate filename
  const ext = extname(filePath).slice(1).toLowerCase();
  const filename = generateFilename(role, ext, label);

  // Get existing attachments
  const existingAttachments = (item as CslItem).custom?.attachments as Attachments | undefined;
  const existingFiles = existingAttachments?.files ?? [];

  // Create new attachment file entry
  const newFile: AttachmentFile = {
    filename,
    role,
    ...(label && { label }),
  };

  // Check if file with same name exists
  const existingFile = findExistingFile(existingFiles, filename);

  // Validate fulltext constraints first (provides better error messages)
  if (!existingFile || !force) {
    const constraintError = validateFulltextConstraint(existingFiles, newFile);
    if (constraintError) {
      return { success: false, error: constraintError };
    }
  }

  // Check if file with same name exists (non-fulltext case)
  if (existingFile && !force) {
    return {
      success: false,
      existingFile: filename,
      requiresConfirmation: true,
    };
  }

  // Ensure directory exists
  const ref = item as ReferenceForAttachments;
  const dirPath = await ensureDirectory(ref, attachmentsDirectory);
  const dirName =
    existingAttachments?.directory ??
    generateDirectoryName(ref as Parameters<typeof generateDirectoryName>[0]);

  // Copy or move file
  const destPath = join(dirPath, filename);
  const copyError = await copyOrMoveFile(filePath, destPath, move);
  if (copyError) {
    return { success: false, error: copyError };
  }

  // Update metadata
  const updatedFiles = buildUpdatedFiles(existingFiles, newFile, existingFile);
  const updatedAttachments: Attachments = {
    directory: dirName,
    files: updatedFiles,
  };

  await updateAttachmentMetadata(library, item as CslItem, updatedAttachments);

  return {
    success: true,
    filename,
    directory: dirName,
    overwritten: !!existingFile,
  };
}
