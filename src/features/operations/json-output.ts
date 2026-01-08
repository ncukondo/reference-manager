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
  /** Map from added item ID to source string */
  sources?: Map<string, string>;
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
  const { full = false, sources = new Map(), items = new Map() } = options;

  const added: AddJsonOutputItem[] = result.added.map((item) => {
    const output: AddJsonOutputItem = {
      source: sources.get(item.id) ?? "",
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
