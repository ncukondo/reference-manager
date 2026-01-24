/**
 * Fulltext open operation
 *
 * Uses attachments system internally with role='fulltext'.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import { openWithSystemApp } from "../../../utils/opener.js";
import type { Attachments } from "../../attachments/types.js";
import {
  type FulltextFormat,
  findFulltextFile,
  findFulltextFiles,
} from "../fulltext-adapter/index.js";

/**
 * Fulltext type (matches existing FulltextType for backward compatibility)
 */
export type FulltextType = FulltextFormat;

/**
 * Options for fulltextOpen operation
 */
export interface FulltextOpenOptions {
  /** Reference identifier (id or uuid) */
  identifier: string;
  /** Specific type to open (pdf or markdown) */
  type?: FulltextType | undefined;
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType | undefined;
  /** Directory for attachments (replaces fulltextDirectory) */
  fulltextDirectory: string;
}

/**
 * Result of fulltextOpen operation
 */
export interface FulltextOpenResult {
  success: boolean;
  openedType?: FulltextType;
  openedPath?: string;
  error?: string;
}

/**
 * Build file path from attachments metadata
 */
function buildFilePath(attachmentsDirectory: string, directory: string, filename: string): string {
  return join(attachmentsDirectory, directory, filename);
}

/**
 * Determine which type to open based on priority
 * Priority: PDF > Markdown when both exist
 */
function determineTypeToOpen(attachments: Attachments | undefined): FulltextType | undefined {
  const files = findFulltextFiles(attachments);
  if (files.length === 0) return undefined;

  // Check for PDF first (priority)
  const pdfFile = files.find((f) => f.filename.endsWith(".pdf"));
  if (pdfFile) return "pdf";

  // Then markdown
  const mdFile = files.find((f) => f.filename.endsWith(".md"));
  if (mdFile) return "markdown";

  return undefined;
}

/**
 * Open fulltext file with system default application.
 *
 * @param library - The library containing the reference
 * @param options - Open options
 * @returns Result with opened file info
 */
export async function fulltextOpen(
  library: ILibrary,
  options: FulltextOpenOptions
): Promise<FulltextOpenResult> {
  const { identifier, type, idType = "id", fulltextDirectory } = options;

  // Find reference
  const item = await library.find(identifier, { idType });

  if (!item) {
    return { success: false, error: `Reference not found: ${identifier}` };
  }

  // Get attachments metadata
  const attachments = (item as CslItem).custom?.attachments as Attachments | undefined;

  // Determine which type to open
  const typeToOpen = type ?? determineTypeToOpen(attachments);

  if (!typeToOpen) {
    return { success: false, error: `No fulltext attached to reference: ${identifier}` };
  }

  // Find the specific fulltext file
  const file = findFulltextFile(attachments, typeToOpen);

  if (!file || !attachments?.directory) {
    return { success: false, error: `No ${typeToOpen} attached to reference: ${identifier}` };
  }

  // Get file path
  const filePath = buildFilePath(fulltextDirectory, attachments.directory, file.filename);

  // Check file exists on disk
  if (!existsSync(filePath)) {
    return {
      success: false,
      error: `Fulltext file not found: ${filePath} (metadata exists but file is missing)`,
    };
  }

  // Open file with system app
  try {
    await openWithSystemApp(filePath);
    return {
      success: true,
      openedType: typeToOpen,
      openedPath: filePath,
    };
  } catch (_error) {
    return {
      success: false,
      error: `Failed to open file: ${filePath}`,
    };
  }
}
