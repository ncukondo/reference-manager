/**
 * Fulltext get operation
 *
 * Uses attachments system internally with role='fulltext'.
 */

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import { normalizePathForOutput } from "../../../utils/path.js";
import type { AttachmentFile, Attachments } from "../../attachments/types.js";
import {
  type FulltextFormat,
  extensionToFormat,
  findFulltextFile,
  findFulltextFiles,
} from "../fulltext-adapter/index.js";

/**
 * Fulltext type (matches existing FulltextType for backward compatibility)
 */
export type FulltextType = FulltextFormat;

/**
 * Options for fulltextGet operation
 */
export interface FulltextGetOptions {
  /** Reference identifier (id or uuid) */
  identifier: string;
  /** Specific type to get (pdf or markdown) */
  type?: FulltextType | undefined;
  /** Preferred type ordering when type is not specified (pdf or markdown) */
  preferredType?: FulltextType | undefined;
  /** If true, return file content instead of path */
  stdout?: boolean | undefined;
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType | undefined;
  /** Directory for attachments (replaces fulltextDirectory) */
  fulltextDirectory: string;
}

/**
 * Result of fulltextGet operation
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
 * Build file path from attachments metadata
 */
function buildFilePath(attachmentsDirectory: string, directory: string, filename: string): string {
  return normalizePathForOutput(join(attachmentsDirectory, directory, filename));
}

/**
 * Get file content for stdout mode
 */
async function getFileContent(filePath: string): Promise<FulltextGetResult> {
  const content = await readFile(filePath);
  return { success: true, content };
}

/**
 * Handle stdout mode - get file content
 */
async function handleStdoutMode(
  attachments: Attachments | undefined,
  type: FulltextType,
  identifier: string,
  fulltextDirectory: string
): Promise<FulltextGetResult> {
  const file = findFulltextFile(attachments, type);
  if (!file || !attachments?.directory) {
    return { success: false, error: `No ${type} fulltext attached to '${identifier}'` };
  }
  const filePath = buildFilePath(fulltextDirectory, attachments.directory, file.filename);
  try {
    return await getFileContent(filePath);
  } catch {
    return { success: false, error: `No ${type} fulltext attached to '${identifier}'` };
  }
}

/**
 * Get single type path
 */
function getSingleTypePath(
  attachments: Attachments | undefined,
  type: FulltextType,
  identifier: string,
  fulltextDirectory: string
): FulltextGetResult {
  const file = findFulltextFile(attachments, type);
  if (!file || !attachments?.directory) {
    return { success: false, error: `No ${type} fulltext attached to '${identifier}'` };
  }
  const filePath = buildFilePath(fulltextDirectory, attachments.directory, file.filename);
  const paths: { pdf?: string; markdown?: string } = {};
  paths[type] = filePath;
  return { success: true, paths };
}

/**
 * Get all fulltext paths
 */
function getAllFulltextPaths(
  attachments: Attachments,
  fulltextFiles: AttachmentFile[],
  fulltextDirectory: string,
  identifier: string,
  preferredType?: FulltextType
): FulltextGetResult {
  const paths: { pdf?: string; markdown?: string } = {};
  for (const file of fulltextFiles) {
    const ext = file.filename.split(".").pop() || "";
    const format = extensionToFormat(ext);
    if (format) {
      const filePath = buildFilePath(fulltextDirectory, attachments.directory, file.filename);
      paths[format] = filePath;
    }
  }

  if (Object.keys(paths).length === 0) {
    return { success: false, error: `No fulltext attached to '${identifier}'` };
  }

  // Reorder paths based on preferredType
  if (preferredType && paths[preferredType]) {
    const ordered: { pdf?: string; markdown?: string } = {};
    ordered[preferredType] = paths[preferredType];
    for (const key of Object.keys(paths) as FulltextType[]) {
      if (key !== preferredType && paths[key]) {
        ordered[key] = paths[key];
      }
    }
    return { success: true, paths: ordered };
  }

  return { success: true, paths };
}

/**
 * Get fulltext file paths or content for a reference.
 *
 * @param library - The library containing the reference
 * @param options - Get options
 * @returns Result with file paths or content
 */
export async function fulltextGet(
  library: ILibrary,
  options: FulltextGetOptions
): Promise<FulltextGetResult> {
  const { identifier, type, preferredType, stdout, idType = "id", fulltextDirectory } = options;

  // Find reference
  const item = await library.find(identifier, { idType });
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  // Get attachments metadata
  const attachments = (item as CslItem).custom?.attachments as Attachments | undefined;

  // Stdout mode with specific type
  if (stdout && type) {
    return handleStdoutMode(attachments, type, identifier, fulltextDirectory);
  }

  // Path mode - find all fulltext files
  const fulltextFiles = findFulltextFiles(attachments);
  if (fulltextFiles.length === 0) {
    return { success: false, error: `No fulltext attached to '${identifier}'` };
  }

  // If specific type requested, filter to that type
  if (type) {
    return getSingleTypePath(attachments, type, identifier, fulltextDirectory);
  }

  // Return all fulltext paths
  if (!attachments) {
    return { success: false, error: `No fulltext attached to '${identifier}'` };
  }

  return getAllFulltextPaths(
    attachments,
    fulltextFiles,
    fulltextDirectory,
    identifier,
    preferredType
  );
}
