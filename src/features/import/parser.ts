/**
 * Parser module for BibTeX and RIS formats
 *
 * Uses citation-js plugins for parsing:
 * - @citation-js/plugin-bibtex for BibTeX
 * - @citation-js/plugin-ris for RIS
 */

import { Cite } from "@citation-js/core";
import "@citation-js/plugin-bibtex";
import "@citation-js/plugin-ris";
import type { CslItem } from "../../core/csl-json/types.js";

/**
 * Result of a parse operation
 */
export type ParseResult = {
  success: boolean;
  items: CslItem[];
  error?: string;
};

/**
 * Parse BibTeX content to CSL-JSON
 *
 * @param content - BibTeX content string
 * @returns Parse result with CSL-JSON items
 */
export function parseBibtex(content: string): ParseResult {
  return parseWithCitationJs(content, "bibtex");
}

/**
 * Parse RIS content to CSL-JSON
 *
 * @param content - RIS content string
 * @returns Parse result with CSL-JSON items
 */
export function parseRis(content: string): ParseResult {
  return parseWithCitationJs(content, "ris");
}

/**
 * Parse content using citation-js
 */
function parseWithCitationJs(content: string, format: string): ParseResult {
  const trimmed = content.trim();

  // Handle empty input
  if (!trimmed) {
    return { success: true, items: [] };
  }

  try {
    // Parse with citation-js (auto-detection works well for bibtex/ris)
    const cite = new Cite(trimmed);

    // Get CSL-JSON output
    const items = cite.get({ format: "real", type: "json" }) as CslItem[];

    // Handle case where parsing produces no results
    if (!items || items.length === 0) {
      // Check if input looks like valid format but has no entries
      if (isEmptyFormat(trimmed, format)) {
        return { success: true, items: [] };
      }

      return {
        success: false,
        items: [],
        error: `No valid ${format.toUpperCase()} entries found`,
      };
    }

    return { success: true, items };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if this is truly empty content (comments only for bibtex)
    if (isEmptyFormat(trimmed, format)) {
      return { success: true, items: [] };
    }

    return {
      success: false,
      items: [],
      error: `Failed to parse ${format.toUpperCase()}: ${errorMessage}`,
    };
  }
}

/**
 * Check if content is "empty" for the given format
 * (e.g., only comments for BibTeX)
 */
function isEmptyFormat(content: string, format: string): boolean {
  if (format === "bibtex") {
    // BibTeX comments start with %
    const lines = content.split("\n");
    return lines.every((line) => {
      const trimmed = line.trim();
      return trimmed === "" || trimmed.startsWith("%");
    });
  }

  return false;
}
