import { mkdtempSync, writeFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { UrlArchiveFormat, UrlConfig } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
import { generateId } from "../../core/identifier/generator.js";
import type { ILibrary } from "../../core/library-interface.js";
import { detectDuplicate } from "../duplicate/detector.js";
import type { InputFormat } from "../import/detector.js";
import type { PubmedConfig } from "../import/fetcher.js";
import {
  type ImportInputsOptions,
  type ImportItemResult,
  type UrlImportData,
  importFromInputs,
} from "../import/importer.js";
import { addAttachment } from "./attachments/add.js";

// Re-export FailureReason for external use
export type { FailureReason } from "../import/importer.js";

/**
 * Options for adding references
 */
export interface AddReferencesOptions {
  /** Skip duplicate detection */
  force?: boolean;
  /** Explicit input format (default: auto) */
  format?: InputFormat | "auto";
  /** PubMed API configuration */
  pubmedConfig?: PubmedConfig;
  /** Content from stdin (if provided, processed before file/identifier inputs) */
  stdinContent?: string;
  /** URL import configuration */
  urlConfig?: UrlConfig | undefined;
  /** Archive format override for URL imports */
  archiveFormat?: UrlArchiveFormat | undefined;
  /** Skip archive creation for URL imports */
  noArchive?: boolean | undefined;
  /** Attachments directory for saving URL import data (fulltext/archive) */
  attachmentsDirectory?: string | undefined;
}

/**
 * Information about a successfully added reference
 */
export interface AddedItem {
  source: string;
  id: string;
  uuid: string;
  title: string;
  /** True if the original ID from source file was changed due to collision */
  idChanged?: boolean;
  /** Original ID from source file before collision resolution */
  originalId?: string;
}

/**
 * Information about a failed import
 */
export interface FailedItem {
  source: string;
  error: string;
  reason: import("../import/importer.js").FailureReason;
}

/**
 * Information about a skipped duplicate
 */
export interface SkippedItem {
  source: string;
  existingId: string;
  duplicateType: import("../duplicate/types.js").DuplicateType;
}

/**
 * Result of addReferences operation
 */
export interface AddReferencesResult {
  added: AddedItem[];
  failed: FailedItem[];
  skipped: SkippedItem[];
}

/**
 * Add references to a library from various input sources.
 *
 * This function orchestrates:
 * 1. Import from inputs (files or identifiers)
 * 2. Duplicate detection (unless force=true)
 * 3. ID collision resolution
 * 4. Library save
 *
 * @param inputs - File paths or identifiers (PMID, DOI)
 * @param library - Target library
 * @param options - Add options
 * @returns Result with added, failed, and skipped items
 */
export async function addReferences(
  inputs: string[],
  library: ILibrary,
  options: AddReferencesOptions
): Promise<AddReferencesResult> {
  const added: AddedItem[] = [];
  const failed: FailedItem[] = [];
  const skipped: SkippedItem[] = [];

  // 1. Import from inputs
  const importOptions = buildImportOptions(options);
  const importResult = await importFromInputs(inputs, importOptions);

  // Get existing items for duplicate/collision checks (getAll now returns CslItem[] directly)
  const existingItems = await library.getAll();

  // Track IDs we've added in this batch (for collision detection within batch)
  const addedIds = new Set<string>();

  // 2. Process each import result
  for (const result of importResult.results) {
    const processed = await processImportResult(
      result,
      existingItems,
      addedIds,
      options.force ?? false,
      library
    );

    if (processed.type === "failed") {
      failed.push(processed.item);
      continue;
    }
    if (processed.type === "skipped") {
      skipped.push(processed.item);
      continue;
    }

    added.push(processed.item);

    // Save URL import data (fulltext + archive) if available (best-effort)
    if (result.success && result.urlData && options.attachmentsDirectory) {
      try {
        await saveUrlData(processed.item.id, result.urlData, library, options.attachmentsDirectory);
      } catch {
        // Best-effort: saveUrlData failure should not block the add operation
      }
    }
  }

  // 3. Save library if any items were added
  if (added.length > 0) {
    await library.save();
  }

  return { added, failed, skipped };
}

/**
 * Build import options from add options
 */
function buildImportOptions(options: AddReferencesOptions): ImportInputsOptions {
  const importOptions: ImportInputsOptions = {};
  if (options.format !== undefined) {
    importOptions.format = options.format;
  }
  if (options.pubmedConfig !== undefined) {
    importOptions.pubmedConfig = options.pubmedConfig;
  }
  if (options.stdinContent !== undefined) {
    importOptions.stdinContent = options.stdinContent;
  }
  if (options.urlConfig !== undefined) {
    importOptions.urlConfig = options.urlConfig;
  }
  if (options.archiveFormat !== undefined) {
    importOptions.archiveFormat = options.archiveFormat;
  }
  if (options.noArchive !== undefined) {
    importOptions.noArchive = options.noArchive;
  }
  return importOptions;
}

type ProcessResult =
  | { type: "added"; item: AddedItem }
  | { type: "failed"; item: FailedItem }
  | { type: "skipped"; item: SkippedItem };

/**
 * Process a single import result
 */
async function processImportResult(
  result: ImportItemResult,
  existingItems: CslItem[],
  addedIds: Set<string>,
  force: boolean,
  library: ILibrary
): Promise<ProcessResult> {
  if (!result.success) {
    return {
      type: "failed",
      item: { source: result.source, error: result.error, reason: result.reason },
    };
  }

  const item = result.item;

  // Check for duplicates (unless force=true)
  if (!force) {
    const duplicateResult = detectDuplicate(item, existingItems);
    const existingMatch = duplicateResult.matches[0];
    if (existingMatch) {
      return {
        type: "skipped",
        item: {
          source: result.source,
          existingId: existingMatch.existing.id ?? "",
          duplicateType: existingMatch.type,
        },
      };
    }
  }

  // Resolve ID collision
  // Prioritize original ID from source file; generate ID only if not present
  const allExistingIds = new Set([...existingItems.map((i) => i.id), ...addedIds]);
  const originalId = item.id?.trim() || "";
  const hasOriginalId = originalId.length > 0;
  const baseId = hasOriginalId ? originalId : generateId(item);
  const { id, changed } = resolveIdCollision(baseId, allExistingIds);

  const finalItem: CslItem = { ...item, id };

  // Add to library
  const addedToLibrary = await library.add(finalItem);
  addedIds.add(id);

  // Build result (uuid comes from the library-added item which has ensured UUID)
  const uuid = addedToLibrary.custom?.uuid ?? "";
  const addedItem: AddedItem = {
    source: result.source,
    id,
    uuid,
    title: typeof finalItem.title === "string" ? finalItem.title : "",
  };

  // Report idChanged only when original ID from source was changed due to collision
  // Generated ID collisions are internal and not reported
  if (hasOriginalId && changed) {
    addedItem.idChanged = true;
    addedItem.originalId = originalId;
  }

  return { type: "added", item: addedItem };
}

/**
 * Save URL import data (fulltext markdown + archive) as attachments.
 * Best-effort: failures are silently ignored to not block the add operation.
 */
async function saveUrlData(
  id: string,
  urlData: UrlImportData,
  library: ILibrary,
  attachmentsDirectory: string
): Promise<void> {
  // Save fulltext markdown
  if (urlData.fulltext) {
    let tempDir: string | undefined;
    try {
      tempDir = mkdtempSync(join(tmpdir(), "refmgr-url-ft-"));
      const fulltextPath = join(tempDir, "fulltext.md");
      writeFileSync(fulltextPath, urlData.fulltext, "utf-8");
      await addAttachment(library, {
        identifier: id,
        filePath: fulltextPath,
        role: "fulltext",
        move: true,
        force: true,
        idType: "id",
        attachmentsDirectory,
      });
    } finally {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  // Save archive
  if (urlData.archive) {
    let tempDir: string | undefined;
    try {
      tempDir = mkdtempSync(join(tmpdir(), "refmgr-url-ar-"));
      const archivePath = join(tempDir, `archive.${urlData.archive.extension}`);
      writeFileSync(archivePath, urlData.archive.data, "utf-8");
      await addAttachment(library, {
        identifier: id,
        filePath: archivePath,
        role: "archive",
        move: true,
        force: false,
        idType: "id",
        attachmentsDirectory,
      });
    } finally {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }
}

/**
 * Generate an alphabetic suffix for ID collision resolution.
 * 0 -> 'a', 1 -> 'b', ..., 25 -> 'z', 26 -> 'aa', etc.
 */
function generateSuffix(index: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let suffix = "";
  let n = index;

  do {
    suffix = alphabet[n % 26] + suffix;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return suffix;
}

/**
 * Resolve ID collision by appending alphabetic suffix.
 */
function resolveIdCollision(
  baseId: string,
  existingIds: Set<string>
): { id: string; changed: boolean } {
  if (!existingIds.has(baseId)) {
    return { id: baseId, changed: false };
  }

  // Find next available suffix
  let index = 0;
  let newId: string;

  do {
    const suffix = generateSuffix(index);
    newId = `${baseId}${suffix}`;
    index++;
  } while (existingIds.has(newId));

  return { id: newId, changed: true };
}
