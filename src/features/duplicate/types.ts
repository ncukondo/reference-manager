/**
 * Duplicate detection types
 */

import type { CslItem } from "../../core/csl-json/types.js";

/**
 * Type of duplicate match
 */
export type DuplicateType = "doi" | "pmid" | "title-author-year";

/**
 * A single duplicate match result
 */
export interface DuplicateMatch {
  /**
   * The type of duplicate detected
   */
  type: DuplicateType;

  /**
   * The existing reference that matches
   */
  existing: CslItem;

  /**
   * Optional match details (e.g., normalized values used for comparison)
   */
  details?: {
    doi?: string;
    pmid?: string;
    normalizedTitle?: string;
    normalizedAuthors?: string;
    year?: string;
  };
}

/**
 * Result of duplicate detection
 */
export interface DuplicateResult {
  /**
   * Whether a duplicate was found
   */
  isDuplicate: boolean;

  /**
   * Array of duplicate matches (can have multiple matches)
   */
  matches: DuplicateMatch[];
}
