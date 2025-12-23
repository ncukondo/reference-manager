/**
 * Fulltext get operation
 */

import { readFile } from "node:fs/promises";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { Library } from "../../../core/library.js";
import { FulltextManager, type FulltextType } from "../../fulltext/index.js";

/**
 * Options for fulltextGet operation
 */
export interface FulltextGetOptions {
  /** Reference identifier (id or uuid) */
  identifier: string;
  /** Specific type to get (pdf or markdown) */
  type?: FulltextType | undefined;
  /** If true, return file content instead of path */
  stdout?: boolean | undefined;
  /** Use uuid instead of id for lookup */
  byUuid?: boolean | undefined;
  /** Directory for fulltext files */
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
 * Get fulltext file paths or content for a reference.
 *
 * @param library - The library containing the reference
 * @param options - Get options
 * @returns Result with file paths or content
 */
export async function fulltextGet(
  library: Library,
  options: FulltextGetOptions
): Promise<FulltextGetResult> {
  const { identifier, type, stdout, byUuid = false, fulltextDirectory } = options;

  // Find reference
  const ref = byUuid ? library.findByUuid(identifier) : library.findById(identifier);
  const item = ref?.getItem();

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
