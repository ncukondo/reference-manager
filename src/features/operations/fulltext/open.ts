/**
 * Fulltext open operation
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import { openWithSystemApp } from "../../../utils/opener.js";
import type { FulltextType } from "../../fulltext/index.js";

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
  /** Directory for fulltext files */
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
 * Get the fulltext file path from CSL item
 */
function getFulltextPath(
  item: CslItem,
  type: FulltextType,
  fulltextDirectory: string
): string | undefined {
  const fulltext = item.custom?.fulltext;
  if (!fulltext) return undefined;

  const filename = type === "pdf" ? fulltext.pdf : fulltext.markdown;
  if (!filename) return undefined;

  return join(fulltextDirectory, filename);
}

/**
 * Determine which type to open based on priority
 * Priority: PDF > Markdown when both exist
 */
function determineTypeToOpen(item: CslItem): FulltextType | undefined {
  const fulltext = item.custom?.fulltext;
  if (!fulltext) return undefined;

  if (fulltext.pdf) return "pdf";
  if (fulltext.markdown) return "markdown";
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

  // Determine which type to open
  const typeToOpen = type ?? determineTypeToOpen(item);

  if (!typeToOpen) {
    return { success: false, error: `No fulltext attached to reference: ${identifier}` };
  }

  // Get file path
  const filePath = getFulltextPath(item, typeToOpen, fulltextDirectory);

  if (!filePath) {
    return { success: false, error: `No ${typeToOpen} attached to reference: ${identifier}` };
  }

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
