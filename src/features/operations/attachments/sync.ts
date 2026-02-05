/**
 * Attachment sync operation
 *
 * Synchronizes metadata with files on disk:
 * - Detects new files not in metadata
 * - Detects missing files (in metadata but not on disk)
 * - Infers role/label from filename pattern
 */

import { readdir, rename, stat } from "node:fs/promises";
import { join } from "node:path";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import { parseFilename } from "../../attachments/filename.js";
import { isReservedRole } from "../../attachments/types.js";
import type { AttachmentFile, Attachments } from "../../attachments/types.js";

/**
 * Options for syncAttachments operation
 */
export interface SyncAttachmentOptions {
  /** Reference identifier (id or uuid) */
  identifier: string;
  /** Apply changes (add new files to metadata) */
  yes?: boolean;
  /** Remove missing files from metadata */
  fix?: boolean;
  /** Identifier type */
  idType?: IdentifierType;
  /** Base directory for attachments */
  attachmentsDirectory: string;
  /** Override inferred roles for specific files (key: filename) */
  roleOverrides?: Record<string, { role: string; label?: string }>;
  /** Rename files on disk (key: current filename, value: new filename) */
  renames?: Record<string, string>;
}

/**
 * Inferred file from disk
 */
export interface InferredFile {
  filename: string;
  role: string;
  label?: string;
}

/**
 * Result of syncAttachments operation
 */
export interface SyncAttachmentResult {
  success: boolean;
  /** Files on disk but not in metadata */
  newFiles: InferredFile[];
  /** Files in metadata but not on disk */
  missingFiles: string[];
  /** Whether changes were applied */
  applied: boolean;
  error?: string;
}

/**
 * Create an error result
 */
function errorResult(error: string): SyncAttachmentResult {
  return { success: false, newFiles: [], missingFiles: [], applied: false, error };
}

/**
 * Suggest a role for a file based on context (existing files and file extension).
 *
 * This is a pure function with no side effects.
 * Returns a suggested role string or null if no suggestion.
 */
export function suggestRoleFromContext(
  filename: string,
  existingFiles: InferredFile[]
): string | null {
  const ext = filename.toLowerCase();

  // Data-like extensions always suggest supplement
  const dataExtensions = [".xlsx", ".csv", ".tsv", ".zip"];
  if (dataExtensions.some((de) => ext.endsWith(de)) || ext.endsWith(".tar.gz")) {
    return "supplement";
  }

  // PDF or Markdown: suggest fulltext if none exists, otherwise supplement
  const isDocumentLike = ext.endsWith(".pdf") || ext.endsWith(".md");
  if (isDocumentLike) {
    const hasFulltext = existingFiles.some((f) => f.role === "fulltext");
    return hasFulltext ? "supplement" : "fulltext";
  }

  return null;
}

/**
 * Infer role and label from filename
 *
 * Pattern matching:
 *   fulltext.{pdf,md} → fulltext
 *   supplement-{label}.ext → supplement, {label}
 *   notes-{label}.ext → notes, {label}
 *   draft-{label}.ext → draft, {label}
 *   other → other, basename (without extension)
 */
function inferFromFilename(filename: string): InferredFile {
  const parsed = parseFilename(filename);

  if (!parsed) {
    return { filename, role: "other", label: filename };
  }

  const { role, label } = parsed;

  // Check if role is reserved
  if (isReservedRole(role)) {
    return label ? { filename, role, label } : { filename, role };
  }

  // Unknown role pattern - use "other" role with full basename as label
  const basename = label ? `${role}-${label}` : role;
  return { filename, role: "other", label: basename };
}

/**
 * Get list of files on disk
 */
async function getFilesOnDisk(dirPath: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath);
    const files: string[] = [];

    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      const stats = await stat(entryPath);
      if (stats.isFile()) {
        files.push(entry);
      }
    }

    return files;
  } catch {
    return [];
  }
}

/**
 * Check if directory exists
 */
async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Find new files (on disk but not in metadata)
 */
function findNewFiles(diskFiles: string[], metadataFilenames: Set<string>): InferredFile[] {
  return diskFiles.filter((f) => !metadataFilenames.has(f)).map(inferFromFilename);
}

/**
 * Find missing files (in metadata but not on disk)
 */
function findMissingFiles(metadataFiles: AttachmentFile[], diskFilenames: Set<string>): string[] {
  return metadataFiles.filter((f) => !diskFilenames.has(f.filename)).map((f) => f.filename);
}

/**
 * Build updated files list by adding new files and removing missing files
 */
function buildUpdatedFiles(
  metadataFiles: AttachmentFile[],
  newFiles: InferredFile[],
  missingFiles: string[],
  shouldApplyNew: boolean,
  shouldApplyFix: boolean,
  roleOverrides?: Record<string, { role: string; label?: string }>
): AttachmentFile[] {
  let updatedFiles = [...metadataFiles];

  if (shouldApplyNew) {
    for (const newFile of newFiles) {
      const override = roleOverrides?.[newFile.filename];
      const role = override?.role ?? newFile.role;
      const label = override ? override.label : newFile.label;
      const attachmentFile: AttachmentFile = {
        filename: newFile.filename,
        role,
        ...(label && { label }),
      };
      updatedFiles.push(attachmentFile);
    }
  }

  if (shouldApplyFix) {
    const missingSet = new Set(missingFiles);
    updatedFiles = updatedFiles.filter((f) => !missingSet.has(f.filename));
  }

  return updatedFiles;
}

/**
 * Apply file renames on disk and return updated filenames.
 * Skips renames when target already exists (conflict).
 * Returns a map of old filename → new filename for successfully renamed files.
 */
async function applyRenames(
  dirPath: string,
  renames: Record<string, string>
): Promise<Record<string, string>> {
  const applied: Record<string, string> = {};
  for (const [oldName, newName] of Object.entries(renames)) {
    const oldPath = join(dirPath, oldName);
    const newPath = join(dirPath, newName);
    try {
      // Check if target already exists
      await stat(newPath);
      // Target exists — skip rename (conflict)
      process.stderr.write(
        `Warning: Cannot rename ${oldName} → ${newName}: target already exists\n`
      );
    } catch {
      // Target doesn't exist — proceed with rename
      try {
        await rename(oldPath, newPath);
        applied[oldName] = newName;
      } catch {
        // Source file doesn't exist or rename failed — skip
      }
    }
  }
  return applied;
}

/**
 * Update filenames in files list based on applied renames
 */
function applyRenamesInMetadata(
  files: AttachmentFile[],
  appliedRenames: Record<string, string>
): AttachmentFile[] {
  return files.map((f) => {
    const newName = appliedRenames[f.filename];
    if (newName) {
      return { ...f, filename: newName };
    }
    return f;
  });
}

/**
 * Update library with new attachment metadata
 */
async function updateAttachmentMetadata(
  library: ILibrary,
  item: CslItem,
  attachments: Attachments,
  updatedFiles: AttachmentFile[]
): Promise<void> {
  await library.update(item.id, {
    custom: {
      ...item.custom,
      attachments: {
        ...attachments,
        files: updatedFiles,
      },
    },
  } as Partial<CslItem>);
}

/**
 * Synchronize attachments metadata with files on disk
 */
export async function syncAttachments(
  library: ILibrary,
  options: SyncAttachmentOptions
): Promise<SyncAttachmentResult> {
  const {
    identifier,
    yes = false,
    fix = false,
    idType = "id",
    attachmentsDirectory,
    roleOverrides,
    renames,
  } = options;

  // Find reference
  const item = await library.find(identifier, { idType });
  if (!item) {
    return errorResult(`Reference '${identifier}' not found`);
  }

  // Get attachments info
  const attachments = (item as CslItem).custom?.attachments as Attachments | undefined;
  if (!attachments?.directory) {
    return errorResult(`No attachments for reference: ${identifier}`);
  }

  // Check directory exists
  const dirPath = join(attachmentsDirectory, attachments.directory);
  if (!(await directoryExists(dirPath))) {
    return errorResult(`Attachments directory does not exist: ${attachments.directory}`);
  }

  // Get files from metadata and disk
  const metadataFiles = attachments.files || [];
  const metadataFilenames = new Set(metadataFiles.map((f) => f.filename));
  const diskFiles = await getFilesOnDisk(dirPath);
  const diskFilenames = new Set(diskFiles);

  // Find differences
  const newFiles = findNewFiles(diskFiles, metadataFilenames);
  const missingFiles = findMissingFiles(metadataFiles, diskFilenames);

  // Determine if we should apply changes
  const shouldApplyNew = yes && newFiles.length > 0;
  const shouldApplyFix = fix && missingFiles.length > 0;
  const shouldApply = shouldApplyNew || shouldApplyFix;

  if (shouldApply) {
    let updatedFiles = buildUpdatedFiles(
      metadataFiles,
      newFiles,
      missingFiles,
      shouldApplyNew,
      shouldApplyFix,
      roleOverrides
    );

    // Apply file renames on disk if requested
    if (shouldApplyNew && renames && Object.keys(renames).length > 0) {
      const appliedRenames = await applyRenames(dirPath, renames);
      if (Object.keys(appliedRenames).length > 0) {
        updatedFiles = applyRenamesInMetadata(updatedFiles, appliedRenames);
      }
    }

    await updateAttachmentMetadata(library, item as CslItem, attachments, updatedFiles);
    await library.save();
  }

  return { success: true, newFiles, missingFiles, applied: shouldApply };
}
