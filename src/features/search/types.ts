/**
 * Search feature type definitions
 */

import type { CslItem } from "../../core/csl-json/types.js";

/**
 * Field specifier for field-specific search
 */
export type FieldSpecifier =
  | "author"
  | "title"
  | "year"
  | "doi"
  | "pmid"
  | "pmcid"
  | "url"
  | "keyword";

/**
 * Search token representing a parsed query element
 */
export interface SearchToken {
  /** The original query text (may include quotes) */
  raw: string;
  /** The normalized value to search for */
  value: string;
  /** Field to search in (if specified with field: prefix) */
  field?: FieldSpecifier;
  /** Whether this is a phrase search (enclosed in quotes) */
  isPhrase: boolean;
}

/**
 * Parsed search query
 */
export interface SearchQuery {
  /** Original query string */
  original: string;
  /** Parsed tokens */
  tokens: SearchToken[];
}

/**
 * Match strength indicator
 */
export type MatchStrength = "exact" | "partial" | "none";

/**
 * Field match result
 */
export interface FieldMatch {
  /** Field name that matched */
  field: string;
  /** Strength of the match */
  strength: MatchStrength;
  /** Matched value */
  value: string;
}

/**
 * Token match result
 */
export interface TokenMatch {
  /** The token that was matched */
  token: SearchToken;
  /** Fields that matched this token */
  matches: FieldMatch[];
}

/**
 * Search result for a single reference
 */
export interface SearchResult {
  /** The reference that matched */
  reference: CslItem;
  /** Match information for each token */
  tokenMatches: TokenMatch[];
  /** Overall match strength (highest strength among all tokens) */
  overallStrength: MatchStrength;
  /** Match score (for sorting) */
  score: number;
}

/**
 * Search options
 */
export interface SearchOptions {
  /** Sort order (default: by relevance) */
  sortBy?: "relevance" | "year" | "author" | "title";
  /** Limit number of results */
  limit?: number;
}
