import type { FieldSpecifier, SearchQuery, SearchToken } from "./types.js";

const VALID_FIELDS: Set<FieldSpecifier> = new Set([
  "author",
  "title",
  "year",
  "doi",
  "pmid",
  "pmcid",
  "url",
  "keyword",
  "tag",
]);

/**
 * Check if character at index is whitespace
 */
function isWhitespace(query: string, index: number): boolean {
  return /\s/.test(query.charAt(index));
}

/**
 * Check if character at index is a quote
 */
function isQuote(query: string, index: number): boolean {
  return query.charAt(index) === '"';
}

/**
 * Tokenize a search query string
 */
export function tokenize(query: string): SearchQuery {
  const tokens: SearchToken[] = [];
  let i = 0;

  while (i < query.length) {
    // Skip whitespace
    if (isWhitespace(query, i)) {
      i++;
      continue;
    }

    // Parse next token
    const result = parseNextToken(query, i);
    if (result.token) {
      tokens.push(result.token);
    }
    i = result.nextIndex;
  }

  return {
    original: query,
    tokens,
  };
}

type TokenResult = { token: SearchToken | null; nextIndex: number };

/**
 * Check if there's whitespace between two indices
 */
function hasWhitespaceBetween(query: string, start: number, end: number): boolean {
  for (let j = start; j < end; j++) {
    if (isWhitespace(query, j)) {
      return true;
    }
  }
  return false;
}

/**
 * Try to parse a field:value pattern starting at the given index
 * Returns null if not a valid field:value pattern
 */
function tryParseFieldValue(query: string, startIndex: number): TokenResult | null {
  const colonIndex = query.indexOf(":", startIndex);
  if (colonIndex === -1) {
    return null;
  }

  // Check if there's whitespace before colon (invalid field pattern)
  if (hasWhitespaceBetween(query, startIndex, colonIndex)) {
    return null;
  }

  const fieldName = query.substring(startIndex, colonIndex);
  if (!VALID_FIELDS.has(fieldName as FieldSpecifier)) {
    return null;
  }

  // Valid field specifier found
  const afterColon = colonIndex + 1;

  // Check if value is empty
  if (afterColon >= query.length || isWhitespace(query, afterColon)) {
    return { token: null, nextIndex: afterColon };
  }

  // Check if value is a quoted phrase
  if (isQuote(query, afterColon)) {
    const quoteResult = parseQuotedValue(query, afterColon);
    if (quoteResult.value !== null) {
      return {
        token: {
          raw: query.substring(startIndex, quoteResult.nextIndex),
          value: quoteResult.value,
          field: fieldName as FieldSpecifier,
          isPhrase: true,
        },
        nextIndex: quoteResult.nextIndex,
      };
    }
    // If quote parsing failed, return null to try other parsing
    return null;
  }

  // Regular unquoted value
  const valueResult = parseUnquotedValue(query, afterColon);
  return {
    token: {
      raw: query.substring(startIndex, valueResult.nextIndex),
      value: valueResult.value,
      field: fieldName as FieldSpecifier,
      isPhrase: false,
    },
    nextIndex: valueResult.nextIndex,
  };
}

/**
 * Parse a quoted token (phrase without field specifier)
 */
function parseQuotedToken(query: string, startIndex: number): TokenResult {
  const quoteResult = parseQuotedValue(query, startIndex);
  if (quoteResult.value !== null) {
    return {
      token: {
        raw: query.substring(startIndex, quoteResult.nextIndex),
        value: quoteResult.value,
        isPhrase: true,
      },
      nextIndex: quoteResult.nextIndex,
    };
  }

  // If quote parsing failed (empty or unclosed), skip it
  if (quoteResult.nextIndex > startIndex) {
    // Empty quote - skip it
    return { token: null, nextIndex: quoteResult.nextIndex };
  }

  // Unclosed quote - treat as regular text including the quote character
  const valueResult = parseUnquotedValue(query, startIndex, true);
  return {
    token: {
      raw: valueResult.value,
      value: valueResult.value,
      isPhrase: false,
    },
    nextIndex: valueResult.nextIndex,
  };
}

/**
 * Parse a regular unquoted token
 */
function parseRegularToken(query: string, startIndex: number): TokenResult {
  const valueResult = parseUnquotedValue(query, startIndex);
  return {
    token: {
      raw: valueResult.value,
      value: valueResult.value,
      isPhrase: false,
    },
    nextIndex: valueResult.nextIndex,
  };
}

/**
 * Parse the next token starting at the given index
 */
function parseNextToken(query: string, startIndex: number): TokenResult {
  // Try to parse field:value pattern first
  const fieldResult = tryParseFieldValue(query, startIndex);
  if (fieldResult !== null) {
    return fieldResult;
  }

  // Check if it's a quoted phrase
  if (isQuote(query, startIndex)) {
    return parseQuotedToken(query, startIndex);
  }

  // Regular unquoted token
  return parseRegularToken(query, startIndex);
}

/**
 * Parse a quoted value starting at a quote character
 */
function parseQuotedValue(
  query: string,
  startIndex: number
): { value: string | null; nextIndex: number } {
  if (!isQuote(query, startIndex)) {
    return { value: null, nextIndex: startIndex };
  }

  let i = startIndex + 1; // Skip opening quote
  const valueStart = i;

  // Find closing quote
  while (i < query.length && !isQuote(query, i)) {
    i++;
  }

  // No closing quote found
  if (i >= query.length) {
    return { value: null, nextIndex: startIndex };
  }

  const value = query.substring(valueStart, i);
  i++; // Skip closing quote

  // Return null for empty quotes
  if (value.trim() === "") {
    return { value: null, nextIndex: i };
  }

  return { value, nextIndex: i };
}

/**
 * Parse an unquoted value
 * @param includeQuotes - If true, don't stop at quote characters (for unclosed quotes)
 */
function parseUnquotedValue(
  query: string,
  startIndex: number,
  includeQuotes = false
): { value: string; nextIndex: number } {
  let i = startIndex;

  // Read until whitespace (and optionally until quote)
  while (i < query.length && !isWhitespace(query, i)) {
    if (!includeQuotes && isQuote(query, i)) {
      break;
    }
    i++;
  }

  return {
    value: query.substring(startIndex, i),
    nextIndex: i,
  };
}
