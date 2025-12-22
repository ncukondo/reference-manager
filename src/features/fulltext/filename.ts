/**
 * Fulltext filename generation
 */

import type { CslItem } from "../../core/csl-json/types.js";
import { FULLTEXT_EXTENSIONS, type FulltextType } from "./types.js";

/**
 * Generate a filename for a fulltext file.
 *
 * Format: {id}[-PMID{PMID}]-{uuid}.{ext}
 *
 * @param item - CSL item to generate filename for
 * @param type - Fulltext type (pdf or markdown)
 * @returns Generated filename
 * @throws Error if custom.uuid is missing
 */
export function generateFulltextFilename(item: CslItem, type: FulltextType): string {
  const uuid = item.custom?.uuid;
  if (!uuid) {
    throw new Error("Missing uuid in custom field");
  }

  const parts: string[] = [item.id];

  // Add PMID if present and non-empty
  if (item.PMID && item.PMID.length > 0) {
    parts.push(`PMID${item.PMID}`);
  }

  // Add UUID
  parts.push(uuid);

  // Join with hyphens and add extension
  return parts.join("-") + FULLTEXT_EXTENSIONS[type];
}
