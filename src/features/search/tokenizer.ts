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
]);

/**
 * Tokenize a search query string
 */
export function tokenize(query: string): SearchQuery {
	const tokens: SearchToken[] = [];
	let i = 0;

	while (i < query.length) {
		// Skip whitespace
		if (/\s/.test(query[i])) {
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

/**
 * Parse the next token starting at the given index
 */
function parseNextToken(
	query: string,
	startIndex: number,
): { token: SearchToken | null; nextIndex: number } {
	let i = startIndex;

	// Try to parse field:value or field:"value" pattern
	const colonIndex = query.indexOf(":", i);
	if (colonIndex !== -1) {
		// Check if there's a potential field name before the colon
		let hasWhitespaceBeforeColon = false;
		for (let j = i; j < colonIndex; j++) {
			if (/\s/.test(query[j])) {
				hasWhitespaceBeforeColon = true;
				break;
			}
		}

		if (!hasWhitespaceBeforeColon) {
			const fieldName = query.substring(i, colonIndex);
			if (VALID_FIELDS.has(fieldName as FieldSpecifier)) {
				// Valid field specifier found
				const afterColon = colonIndex + 1;

				// Check if value is empty
				if (afterColon >= query.length || /\s/.test(query[afterColon])) {
					// Empty value after colon
					return { token: null, nextIndex: afterColon };
				}

				// Check if value is a quoted phrase
				if (query[afterColon] === '"') {
					const quoteResult = parseQuotedValue(query, afterColon);
					if (quoteResult.value !== null) {
						return {
							token: {
								raw: query.substring(i, quoteResult.nextIndex),
								value: quoteResult.value,
								field: fieldName as FieldSpecifier,
								isPhrase: true,
							},
							nextIndex: quoteResult.nextIndex,
						};
					}
					// If quote parsing failed, fall through to regular parsing
				} else {
					// Regular unquoted value
					const valueResult = parseUnquotedValue(query, afterColon);
					return {
						token: {
							raw: query.substring(i, valueResult.nextIndex),
							value: valueResult.value,
							field: fieldName as FieldSpecifier,
							isPhrase: false,
						},
						nextIndex: valueResult.nextIndex,
					};
				}
			}
		}
	}

	// Not a field:value pattern, parse as regular token
	if (query[i] === '"') {
		// Quoted phrase without field specifier
		const quoteResult = parseQuotedValue(query, i);
		if (quoteResult.value !== null) {
			return {
				token: {
					raw: query.substring(i, quoteResult.nextIndex),
					value: quoteResult.value,
					isPhrase: true,
				},
				nextIndex: quoteResult.nextIndex,
			};
		}

		// If quote parsing failed (empty or unclosed), skip it
		if (quoteResult.nextIndex > i) {
			// Empty quote - skip it
			return { token: null, nextIndex: quoteResult.nextIndex };
		}

		// Unclosed quote - treat as regular text including the quote character
		const valueResult = parseUnquotedValue(query, i, true);
		return {
			token: {
				raw: valueResult.value,
				value: valueResult.value,
				isPhrase: false,
			},
			nextIndex: valueResult.nextIndex,
		};
	}

	// Regular unquoted token
	const valueResult = parseUnquotedValue(query, i);
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
 * Parse a quoted value starting at a quote character
 */
function parseQuotedValue(
	query: string,
	startIndex: number,
): { value: string | null; nextIndex: number } {
	if (query[startIndex] !== '"') {
		return { value: null, nextIndex: startIndex };
	}

	let i = startIndex + 1; // Skip opening quote
	const valueStart = i;

	// Find closing quote
	while (i < query.length && query[i] !== '"') {
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
	includeQuotes = false,
): { value: string; nextIndex: number } {
	let i = startIndex;

	// Read until whitespace (and optionally until quote)
	while (i < query.length && !/\s/.test(query[i])) {
		if (!includeQuotes && query[i] === '"') {
			break;
		}
		i++;
	}

	return {
		value: query.substring(startIndex, i),
		nextIndex: i,
	};
}
