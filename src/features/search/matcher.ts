import type { CslItem } from "../../core/csl-json/types.js";
import { normalizePreservingCase } from "./normalizer.js";
import type { FieldMatch, MatchStrength, SearchResult, SearchToken } from "./types.js";
import { matchWithUppercaseSensitivity } from "./uppercase.js";

/**
 * ID fields require exact match (case-insensitive)
 */
const ID_FIELDS = new Set(["DOI", "PMID", "PMCID", "URL", "ISBN", "id"]);

/**
 * Extract year from CSL-JSON issued field
 */
function extractYear(reference: CslItem): string {
  if (reference.issued?.["date-parts"]?.[0]?.[0]) {
    return String(reference.issued["date-parts"][0][0]);
  }
  return "0000";
}

/**
 * Extract and format author names
 * Returns "family given" format for all authors
 */
function extractAuthors(reference: CslItem): string {
  if (!reference.author || reference.author.length === 0) {
    return "";
  }

  return reference.author
    .map((author) => {
      const family = author.family || "";
      const given = author.given || "";
      return given ? `${family} ${given}` : family;
    })
    .join(" ");
}

/**
 * Get field value from reference
 */
function getFieldValue(reference: CslItem, field: string): string | null {
  // Handle special fields
  if (field === "year") {
    return extractYear(reference);
  }

  if (field === "author") {
    return extractAuthors(reference);
  }

  // Handle direct field access
  const value = reference[field as keyof CslItem];
  if (typeof value === "string") {
    return value;
  }

  // Handle nested custom fields
  if (field.startsWith("custom.")) {
    const customField = field.substring(7); // Remove "custom." prefix
    const customValue = (reference.custom as Record<string, unknown>)?.[customField];
    if (typeof customValue === "string") {
      return customValue;
    }
  }

  return null;
}

/**
 * Check if URL matches in primary URL or additional_urls array
 */
function matchUrl(queryValue: string, reference: CslItem): FieldMatch | null {
  // Check primary URL field
  if (reference.URL === queryValue) {
    return {
      field: "URL",
      strength: "exact",
      value: reference.URL,
    };
  }

  // Check additional_urls in custom field
  const additionalUrls = (reference.custom as Record<string, unknown>)?.additional_urls;
  if (Array.isArray(additionalUrls)) {
    for (const url of additionalUrls) {
      if (typeof url === "string" && url === queryValue) {
        return {
          field: "custom.additional_urls",
          strength: "exact",
          value: url,
        };
      }
    }
  }

  return null;
}

/**
 * Check if query matches any keyword in the keyword array
 * Performs partial match with normalization on each keyword element
 */
function matchKeyword(queryValue: string, reference: CslItem): FieldMatch | null {
  // Check if keyword field exists and is an array
  if (!reference.keyword || !Array.isArray(reference.keyword)) {
    return null;
  }

  // Normalize query value (preserving case for uppercase-sensitive matching)
  const normalizedQuery = normalizePreservingCase(queryValue);

  // Search through each keyword element
  for (const keyword of reference.keyword) {
    if (typeof keyword === "string") {
      const normalizedKeyword = normalizePreservingCase(keyword);
      // Use uppercase-sensitive matching
      if (matchWithUppercaseSensitivity(normalizedQuery, normalizedKeyword)) {
        return {
          field: "keyword",
          strength: "partial",
          value: keyword,
        };
      }
    }
  }

  return null;
}

/**
 * Match a tag field against custom.tags array
 * Similar to matchKeyword but accesses custom.tags
 */
function matchTag(queryValue: string, reference: CslItem): FieldMatch | null {
  // Check if custom.tags field exists and is an array
  if (!reference.custom?.tags || !Array.isArray(reference.custom.tags)) {
    return null;
  }

  // Normalize query value (preserving case for uppercase-sensitive matching)
  const normalizedQuery = normalizePreservingCase(queryValue);

  // Search through each tag element
  for (const tag of reference.custom.tags) {
    if (typeof tag === "string") {
      const normalizedTag = normalizePreservingCase(tag);
      // Use uppercase-sensitive matching
      if (matchWithUppercaseSensitivity(normalizedQuery, normalizedTag)) {
        return {
          field: "tag",
          strength: "partial",
          value: tag,
        };
      }
    }
  }

  return null;
}

/**
 * Map field specifier to actual CSL-JSON field name
 */
const FIELD_MAP: Record<string, string> = {
  author: "author",
  title: "title",
  doi: "DOI",
  pmid: "PMID",
  pmcid: "PMCID",
  isbn: "ISBN",
  id: "id",
};

/**
 * Match a year field against a reference
 */
function matchYearField(tokenValue: string, reference: CslItem): FieldMatch | null {
  const year = extractYear(reference);
  if (year === tokenValue) {
    return {
      field: "year",
      strength: "exact",
      value: year,
    };
  }
  return null;
}

/**
 * Match a content or ID field against a reference
 */
function matchFieldValue(field: string, tokenValue: string, reference: CslItem): FieldMatch | null {
  const fieldValue = getFieldValue(reference, field);
  if (fieldValue === null) {
    return null;
  }

  // Check if this is an ID field (exact match, case-insensitive)
  if (ID_FIELDS.has(field)) {
    if (fieldValue.toUpperCase() === tokenValue.toUpperCase()) {
      return {
        field,
        strength: "exact",
        value: fieldValue,
      };
    }
    return null;
  }

  // Content field: use uppercase-sensitive matching
  // Normalize both values (remove diacritics, normalize whitespace) while preserving case
  const normalizedFieldValue = normalizePreservingCase(fieldValue);
  const normalizedQuery = normalizePreservingCase(tokenValue);

  // If query contains consecutive uppercase (e.g., "AI", "RNA"), match case-sensitively
  // Otherwise, match case-insensitively
  if (matchWithUppercaseSensitivity(normalizedQuery, normalizedFieldValue)) {
    return {
      field,
      strength: "partial",
      value: fieldValue,
    };
  }
  return null;
}

/**
 * Match token against a specific field
 */
function matchSpecificField(token: SearchToken, reference: CslItem): FieldMatch[] {
  const matches: FieldMatch[] = [];
  const fieldToSearch = token.field as string;

  // Handle URL field specially (search both URL and additional_urls)
  if (fieldToSearch === "url") {
    const urlMatch = matchUrl(token.value, reference);
    if (urlMatch) matches.push(urlMatch);
    return matches;
  }

  // Handle year field
  if (fieldToSearch === "year") {
    const yearMatch = matchYearField(token.value, reference);
    if (yearMatch) matches.push(yearMatch);
    return matches;
  }

  // Handle keyword field specially (search array elements)
  if (fieldToSearch === "keyword") {
    const keywordMatch = matchKeyword(token.value, reference);
    if (keywordMatch) matches.push(keywordMatch);
    return matches;
  }

  // Handle tag field specially (search custom.tags array)
  if (fieldToSearch === "tag") {
    const tagMatch = matchTag(token.value, reference);
    if (tagMatch) matches.push(tagMatch);
    return matches;
  }

  // Standard field matching
  const actualField = FIELD_MAP[fieldToSearch] || fieldToSearch;
  const match = matchFieldValue(actualField, token.value, reference);
  if (match) matches.push(match);

  return matches;
}

/**
 * Standard fields to search (not special-cased)
 */
const STANDARD_SEARCH_FIELDS = [
  "id",
  "title",
  "author",
  "container-title",
  "publisher",
  "DOI",
  "PMID",
  "PMCID",
  "abstract",
];

/**
 * Match token against a single field (used for all-fields search)
 */
function matchSingleField(
  field: string,
  tokenValue: string,
  reference: CslItem
): FieldMatch | null {
  if (field === "year") {
    return matchYearField(tokenValue, reference);
  }
  if (field === "URL") {
    return matchUrl(tokenValue, reference);
  }
  if (field === "keyword") {
    return matchKeyword(tokenValue, reference);
  }
  if (field === "tag") {
    return matchTag(tokenValue, reference);
  }
  return matchFieldValue(field, tokenValue, reference);
}

/**
 * Match token against all searchable fields
 */
function matchAllFields(token: SearchToken, reference: CslItem): FieldMatch[] {
  const matches: FieldMatch[] = [];

  // Match special fields
  const specialFields = ["year", "URL", "keyword", "tag"];
  for (const field of specialFields) {
    const match = matchSingleField(field, token.value, reference);
    if (match) matches.push(match);
  }

  // Match standard fields
  for (const field of STANDARD_SEARCH_FIELDS) {
    const match = matchFieldValue(field, token.value, reference);
    if (match) matches.push(match);
  }

  return matches;
}

/**
 * Match a single token against a reference
 * Returns an array of field matches
 */
export function matchToken(token: SearchToken, reference: CslItem): FieldMatch[] {
  // If field is specified, only search that field
  if (token.field) {
    return matchSpecificField(token, reference);
  }

  // No field specified: search all fields
  return matchAllFields(token, reference);
}

/**
 * Match a reference against all search tokens
 * Returns a SearchResult if all tokens match (AND logic), null otherwise
 */
export function matchReference(reference: CslItem, tokens: SearchToken[]): SearchResult | null {
  // Empty token array means no match
  if (tokens.length === 0) {
    return null;
  }

  const tokenMatches: SearchResult["tokenMatches"] = [];
  let overallStrength: MatchStrength = "none";

  // Check if all tokens match (AND logic)
  for (const token of tokens) {
    const matches = matchToken(token, reference);

    // If any token doesn't match at least one field, no match
    if (matches.length === 0) {
      return null;
    }

    // Determine highest match strength for this token
    const tokenStrength = matches.some((m) => m.strength === "exact") ? "exact" : "partial";

    // Update overall strength (exact > partial > none)
    if (tokenStrength === "exact") {
      overallStrength = "exact";
    } else if (tokenStrength === "partial" && overallStrength === "none") {
      overallStrength = "partial";
    }

    tokenMatches.push({
      token,
      matches,
    });
  }

  // Calculate score (higher is better)
  // Exact matches get higher score than partial matches
  const score = overallStrength === "exact" ? 100 + tokenMatches.length : 50 + tokenMatches.length;

  return {
    reference,
    tokenMatches,
    overallStrength,
    score,
  };
}

/**
 * Search references against search tokens
 * Returns array of SearchResult for all matching references
 */
export function search(references: CslItem[], tokens: SearchToken[]): SearchResult[] {
  const results: SearchResult[] = [];

  for (const reference of references) {
    const match = matchReference(reference, tokens);
    if (match) {
      results.push(match);
    }
  }

  return results;
}
