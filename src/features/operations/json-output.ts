/**
 * JSON output formatters for add/remove/update commands
 *
 * This module provides machine-readable JSON output for external tool integration.
 * The formatters are placed in the features layer to enable reuse by CLI, HTTP Server, and MCP Server.
 */

import type { CslItem } from "../../core/csl-json/types.js";
import type { DuplicateType } from "../duplicate/types.js";
import type { FailureReason } from "../import/importer.js";
import type { AddReferencesResult } from "./add.js";
import { getChangedFields } from "./change-details.js";
import type { RemoveResult } from "./remove.js";
import type { UpdateOperationResult } from "./update.js";

// ============================================================================
// Add command types
// ============================================================================

export interface AddJsonOutputItem {
  source: string;
  id: string;
  uuid: string;
  title: string;
  idChanged?: boolean;
  originalId?: string;
  item?: CslItem;
}

export interface SkippedJsonOutputItem {
  source: string;
  reason: "duplicate";
  existingId: string;
  duplicateType: DuplicateType;
}

export interface FailedJsonOutputItem {
  source: string;
  reason: FailureReason;
  error: string;
}

export interface AddJsonOutput {
  summary: {
    total: number;
    added: number;
    skipped: number;
    failed: number;
  };
  added: AddJsonOutputItem[];
  skipped: SkippedJsonOutputItem[];
  failed: FailedJsonOutputItem[];
}

// ============================================================================
// Remove command types
// ============================================================================

export interface RemoveJsonOutput {
  success: boolean;
  id: string;
  uuid?: string;
  title?: string;
  item?: CslItem;
  error?: string;
}

// ============================================================================
// Update command types
// ============================================================================

export interface UpdateJsonOutput {
  success: boolean;
  id: string;
  uuid?: string;
  title?: string;
  unchanged?: boolean;
  changes?: string[];
  idChanged?: boolean;
  previousId?: string;
  before?: CslItem;
  after?: CslItem;
  error?: string;
}

// ============================================================================
// Formatters
// ============================================================================

export interface FormatAddJsonOptions {
  /** Include full CSL-JSON data */
  full?: boolean;
  /** Map from added item ID to CslItem (for --full) */
  items?: Map<string, CslItem>;
}

/**
 * Format add command result as JSON output
 */
export function formatAddJsonOutput(
  result: AddReferencesResult,
  options: FormatAddJsonOptions
): AddJsonOutput {
  const { full = false, items = new Map() } = options;

  const added: AddJsonOutputItem[] = result.added.map((item) => {
    const output: AddJsonOutputItem = {
      source: item.source,
      id: item.id,
      uuid: item.uuid,
      title: item.title,
    };

    if (item.idChanged && item.originalId) {
      output.idChanged = true;
      output.originalId = item.originalId;
    }

    if (full) {
      const cslItem = items.get(item.id);
      if (cslItem) {
        output.item = cslItem;
      }
    }

    return output;
  });

  const skipped: SkippedJsonOutputItem[] = result.skipped.map((item) => ({
    source: item.source,
    reason: "duplicate" as const,
    existingId: item.existingId,
    duplicateType: item.duplicateType,
  }));

  const failed: FailedJsonOutputItem[] = result.failed.map((item) => ({
    source: item.source,
    reason: item.reason,
    error: item.error,
  }));

  return {
    summary: {
      total: added.length + skipped.length + failed.length,
      added: added.length,
      skipped: skipped.length,
      failed: failed.length,
    },
    added,
    skipped,
    failed,
  };
}

export interface FormatRemoveJsonOptions {
  /** Include full CSL-JSON data */
  full?: boolean;
}

/**
 * Format remove command result as JSON output
 */
export function formatRemoveJsonOutput(
  result: RemoveResult,
  id: string,
  options: FormatRemoveJsonOptions
): RemoveJsonOutput {
  const { full = false } = options;

  if (!result.removed || !result.removedItem) {
    return {
      success: false,
      id,
      error: `Reference not found: ${id}`,
    };
  }

  const uuid = result.removedItem.custom?.uuid;
  const output: RemoveJsonOutput = {
    success: true,
    id,
    ...(uuid && { uuid }),
    title: typeof result.removedItem.title === "string" ? result.removedItem.title : "",
  };

  if (full) {
    output.item = result.removedItem;
  }

  return output;
}

export interface FormatUpdateJsonOptions {
  /** Include full CSL-JSON data (before/after) */
  full?: boolean;
  /** The item before update (for --full) */
  before?: CslItem;
}

/**
 * Format error result as JSON output
 */
function formatUpdateErrorJson(originalId: string, errorType?: string): UpdateJsonOutput {
  if (errorType === "id_collision") {
    return { success: false, id: originalId, error: "ID collision: target ID already exists" };
  }
  return { success: false, id: originalId, error: `Reference not found: ${originalId}` };
}

/**
 * Add full output fields (before/after) to the output object
 */
function addFullOutputFields(output: UpdateJsonOutput, item: CslItem, before?: CslItem): void {
  if (before) output.before = before;
  output.after = item;
}

/**
 * Build base success output from item
 */
function buildUpdateSuccessOutput(item: CslItem, id: string): UpdateJsonOutput {
  return {
    success: true,
    id,
    ...(item.custom?.uuid && { uuid: item.custom.uuid }),
    title: typeof item.title === "string" ? item.title : "",
  };
}

/**
 * Format no-changes result as JSON output
 */
function formatUnchangedJson(
  result: UpdateOperationResult,
  originalId: string,
  options: FormatUpdateJsonOptions
): UpdateJsonOutput {
  const item = result.item as CslItem;
  const output = buildUpdateSuccessOutput(item, item.id ?? originalId);
  output.unchanged = true;
  if (result.idChanged && result.newId) {
    output.idChanged = true;
    output.previousId = originalId;
  }
  if (options.full) addFullOutputFields(output, item, options.before);
  return output;
}

/**
 * Format successful update result as JSON output
 */
function formatUpdateSuccessJson(
  result: UpdateOperationResult,
  originalId: string,
  options: FormatUpdateJsonOptions
): UpdateJsonOutput {
  const item = result.item as CslItem;
  const finalId = result.idChanged && result.newId ? result.newId : (item.id ?? originalId);
  const output = buildUpdateSuccessOutput(item, finalId);

  if (result.oldItem) {
    const changes = getChangedFields(result.oldItem, item);
    if (changes.length > 0) {
      output.changes = changes;
    }
  }

  if (result.idChanged && result.newId) {
    output.idChanged = true;
    output.previousId = originalId;
  }
  if (options.full) addFullOutputFields(output, item, options.before);
  return output;
}

/**
 * Format update command result as JSON output
 */
export function formatUpdateJsonOutput(
  result: UpdateOperationResult,
  originalId: string,
  options: FormatUpdateJsonOptions
): UpdateJsonOutput {
  // Handle failure cases (errors)
  if (!result.updated && !result.item) {
    return formatUpdateErrorJson(originalId, result.errorType);
  }

  // Handle no changes case (item present but not updated)
  if (!result.updated && result.item) {
    return formatUnchangedJson(result, originalId, options);
  }

  // Handle success case
  return formatUpdateSuccessJson(result, originalId, options);
}
