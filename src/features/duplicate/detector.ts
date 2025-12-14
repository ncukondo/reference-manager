/**
 * Duplicate detection logic
 */

import type { CslItem } from "../../core/csl-json/types.js";
import { normalize } from "../search/normalizer.js";
import type { DuplicateMatch, DuplicateResult } from "./types.js";

/**
 * Normalize DOI by removing common URL prefixes
 * Returns the DOI in format: 10.xxxx/...
 */
function normalizeDoi(doi: string): string {
  // Remove common DOI URL prefixes
  const normalized = doi
    .replace(/^https?:\/\/doi\.org\//i, "")
    .replace(/^https?:\/\/dx\.doi\.org\//i, "")
    .replace(/^doi:/i, "");

  return normalized;
}

/**
 * Extract year from CSL-JSON issued field
 */
function extractYear(item: CslItem): string | null {
  const dateParts = item.issued?.["date-parts"]?.[0];
  if (!dateParts || dateParts.length === 0) {
    return null;
  }
  return String(dateParts[0]);
}

/**
 * Normalize author names to "family given-initial" format
 */
function normalizeAuthors(item: CslItem): string | null {
  if (!item.author || item.author.length === 0) {
    return null;
  }

  // Combine all authors: "family given-initial"
  const authorStrings = item.author.map((author) => {
    const family = author.family || "";
    const givenInitial = author.given ? author.given.charAt(0) : "";
    return `${family} ${givenInitial}`.trim();
  });

  // Join and normalize
  return normalize(authorStrings.join(" "));
}

/**
 * Check if two items match by DOI
 */
function checkDoiMatch(item: CslItem, existing: CslItem): DuplicateMatch | null {
  if (!item.DOI || !existing.DOI) {
    return null;
  }

  const normalizedItemDoi = normalizeDoi(item.DOI);
  const normalizedExistingDoi = normalizeDoi(existing.DOI);

  // DOI comparison is case-sensitive
  if (normalizedItemDoi === normalizedExistingDoi) {
    return {
      type: "doi",
      existing,
      details: {
        doi: normalizedExistingDoi,
      },
    };
  }

  return null;
}

/**
 * Check if two items match by PMID
 */
function checkPmidMatch(item: CslItem, existing: CslItem): DuplicateMatch | null {
  if (!item.PMID || !existing.PMID) {
    return null;
  }

  // PMID comparison is exact string match
  if (item.PMID === existing.PMID) {
    return {
      type: "pmid",
      existing,
      details: {
        pmid: existing.PMID,
      },
    };
  }

  return null;
}

/**
 * Check if two items match by Title + Author + Year
 */
function checkTitleAuthorYearMatch(item: CslItem, existing: CslItem): DuplicateMatch | null {
  const itemTitle = item.title ? normalize(item.title) : null;
  const existingTitle = existing.title ? normalize(existing.title) : null;
  const itemAuthors = normalizeAuthors(item);
  const existingAuthors = normalizeAuthors(existing);
  const itemYear = extractYear(item);
  const existingYear = extractYear(existing);

  // All three must be present and match
  if (
    !itemTitle ||
    !existingTitle ||
    !itemAuthors ||
    !existingAuthors ||
    !itemYear ||
    !existingYear
  ) {
    return null;
  }

  if (itemTitle === existingTitle && itemAuthors === existingAuthors && itemYear === existingYear) {
    return {
      type: "title-author-year",
      existing,
      details: {
        normalizedTitle: existingTitle,
        normalizedAuthors: existingAuthors,
        year: existingYear,
      },
    };
  }

  return null;
}

/**
 * Check if an item is a duplicate of an existing item
 * Returns the first match found (highest priority)
 */
function checkSingleDuplicate(item: CslItem, existing: CslItem): DuplicateMatch | null {
  // Priority 1: DOI matching (highest priority)
  const doiMatch = checkDoiMatch(item, existing);
  if (doiMatch) {
    return doiMatch;
  }

  // Priority 2: PMID matching
  const pmidMatch = checkPmidMatch(item, existing);
  if (pmidMatch) {
    return pmidMatch;
  }

  // Priority 3: Title + Author + Year matching (lowest priority)
  return checkTitleAuthorYearMatch(item, existing);
}

/**
 * Detects if a reference is a duplicate of any existing references
 *
 * Priority order:
 * 1. DOI (highest priority)
 * 2. PMID
 * 3. Title + Author + Year (lowest priority)
 *
 * @param item - The reference to check for duplicates
 * @param existingReferences - Array of existing references to check against
 * @returns DuplicateResult indicating if duplicate found and match details
 */
export function detectDuplicate(item: CslItem, existingReferences: CslItem[]): DuplicateResult {
  const matches: DuplicateMatch[] = [];
  const itemUuid = item.custom?.uuid;

  for (const existing of existingReferences) {
    // Skip if same UUID (same item)
    if (itemUuid && existing.custom?.uuid === itemUuid) {
      continue;
    }

    const match = checkSingleDuplicate(item, existing);
    if (match) {
      matches.push(match);
    }
  }

  return {
    isDuplicate: matches.length > 0,
    matches,
  };
}
