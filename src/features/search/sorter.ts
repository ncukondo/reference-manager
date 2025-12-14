import type { CslItem } from "../../core/csl-json/types.js";
import type { MatchStrength, SearchResult } from "./types.js";

/**
 * Extract year from CSL-JSON reference
 * Returns "0000" for missing year (sorted last)
 */
function extractYear(reference: CslItem): string {
  if (reference.issued?.["date-parts"]?.[0]?.[0]) {
    return String(reference.issued["date-parts"][0][0]);
  }
  return "0000";
}

/**
 * Extract first author's family name for sorting
 * Returns empty string for missing author (sorted last)
 */
function extractFirstAuthorFamily(reference: CslItem): string {
  if (!reference.author || reference.author.length === 0) {
    return "";
  }
  return reference.author[0]?.family || "";
}

/**
 * Extract title for sorting
 * Returns empty string for missing title (sorted last)
 */
function extractTitle(reference: CslItem): string {
  return reference.title || "";
}

/**
 * Compare match strength (exact > partial > none)
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
function compareStrength(a: MatchStrength, b: MatchStrength): number {
  const strengthOrder = { exact: 2, partial: 1, none: 0 };
  return strengthOrder[b] - strengthOrder[a];
}

/**
 * Compare years (descending - newer first)
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
function compareYear(a: CslItem, b: CslItem): number {
  const yearA = extractYear(a);
  const yearB = extractYear(b);
  return Number(yearB) - Number(yearA);
}

/**
 * Compare authors alphabetically (empty comes last)
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
function compareAuthor(a: CslItem, b: CslItem): number {
  const authorA = extractFirstAuthorFamily(a).toLowerCase();
  const authorB = extractFirstAuthorFamily(b).toLowerCase();
  // Empty string (no author) should come after authors
  if (authorA === "" && authorB !== "") return 1;
  if (authorA !== "" && authorB === "") return -1;
  return authorA.localeCompare(authorB);
}

/**
 * Compare titles alphabetically (empty comes last)
 * Returns negative if a < b, positive if a > b, 0 if equal
 */
function compareTitle(a: CslItem, b: CslItem): number {
  const titleA = extractTitle(a).toLowerCase();
  const titleB = extractTitle(b).toLowerCase();
  // Empty string (no title) should come after titles
  if (titleA === "" && titleB !== "") return 1;
  if (titleA !== "" && titleB === "") return -1;
  return titleA.localeCompare(titleB);
}

/**
 * Sort search results according to the specification:
 * 1. Match strength (exact > partial)
 * 2. Year (descending)
 * 3. Author (alphabetical)
 * 4. Title (alphabetical)
 * 5. Registration order (original array order)
 */
export function sortResults(results: SearchResult[]): SearchResult[] {
  // Create a copy with original indices for stable sort
  const indexed = results.map((result, index) => ({ result, index }));

  // Sort according to the criteria
  const sorted = indexed.sort((a, b) => {
    // 1. Match strength (exact > partial)
    const strengthDiff = compareStrength(a.result.overallStrength, b.result.overallStrength);
    if (strengthDiff !== 0) return strengthDiff;

    // 2. Year (descending - newer first)
    const yearDiff = compareYear(a.result.reference, b.result.reference);
    if (yearDiff !== 0) return yearDiff;

    // 3. Author (alphabetical)
    const authorDiff = compareAuthor(a.result.reference, b.result.reference);
    if (authorDiff !== 0) return authorDiff;

    // 4. Title (alphabetical, case-insensitive)
    const titleDiff = compareTitle(a.result.reference, b.result.reference);
    if (titleDiff !== 0) return titleDiff;

    // 5. Registration order (original array order)
    return a.index - b.index;
  });

  // Return only the results (without indices)
  return sorted.map((item) => item.result);
}
