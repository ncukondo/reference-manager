import type { CslJsonItem } from "../../core/csl-json/types.js";
import type {
	FieldMatch,
	MatchStrength,
	SearchResult,
	SearchToken,
} from "./types.js";
import { normalize } from "./normalizer.js";

/**
 * ID fields require exact match (case-sensitive)
 */
const ID_FIELDS = new Set(["DOI", "PMID", "PMCID", "URL"]);

/**
 * Extract year from CSL-JSON issued field
 */
function extractYear(reference: CslJsonItem): string {
	if (reference.issued?.["date-parts"]?.[0]?.[0]) {
		return String(reference.issued["date-parts"][0][0]);
	}
	return "0000";
}

/**
 * Extract and format author names
 * Returns "family given-initial" format for all authors
 */
function extractAuthors(reference: CslJsonItem): string {
	if (!reference.author || reference.author.length === 0) {
		return "";
	}

	return reference.author
		.map((author) => {
			const family = author.family || "";
			const givenInitial = author.given ? author.given[0] : "";
			return givenInitial ? `${family} ${givenInitial}` : family;
		})
		.join(" ");
}

/**
 * Get field value from reference
 */
function getFieldValue(reference: CslJsonItem, field: string): string | null {
	// Handle special fields
	if (field === "year") {
		return extractYear(reference);
	}

	if (field === "author") {
		return extractAuthors(reference);
	}

	// Handle direct field access
	const value = reference[field as keyof CslJsonItem];
	if (typeof value === "string") {
		return value;
	}

	// Handle nested custom fields
	if (field.startsWith("custom.")) {
		const customField = field.substring(7); // Remove "custom." prefix
		const customValue = (reference.custom as Record<string, unknown>)?.[
			customField
		];
		if (typeof customValue === "string") {
			return customValue;
		}
	}

	return null;
}

/**
 * Check if URL matches in primary URL or additional_urls array
 */
function matchUrl(
	queryValue: string,
	reference: CslJsonItem,
): FieldMatch | null {
	// Check primary URL field
	if (reference.URL === queryValue) {
		return {
			field: "URL",
			strength: "exact",
			value: reference.URL,
		};
	}

	// Check additional_urls in custom field
	const additionalUrls = (reference.custom as Record<string, unknown>)
		?.additional_urls;
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
function matchKeyword(
	queryValue: string,
	reference: CslJsonItem,
): FieldMatch | null {
	// Check if keyword field exists and is an array
	if (!reference.keyword || !Array.isArray(reference.keyword)) {
		return null;
	}

	// Normalize query value
	const normalizedQuery = normalize(queryValue);

	// Search through each keyword element
	for (const keyword of reference.keyword) {
		if (typeof keyword === "string") {
			const normalizedKeyword = normalize(keyword);
			if (normalizedKeyword.includes(normalizedQuery)) {
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
 * Match a single token against a reference
 * Returns an array of field matches
 */
export function matchToken(
	token: SearchToken,
	reference: CslJsonItem,
): FieldMatch[] {
	const matches: FieldMatch[] = [];

	// If field is specified, only search that field
	if (token.field) {
		const fieldToSearch = token.field;

		// Handle URL field specially (search both URL and additional_urls)
		if (fieldToSearch === "url") {
			const urlMatch = matchUrl(token.value, reference);
			if (urlMatch) {
				matches.push(urlMatch);
			}
			return matches;
		}

		// Handle year field
		if (fieldToSearch === "year") {
			const year = extractYear(reference);
			if (year === token.value) {
				matches.push({
					field: "year",
					strength: "exact",
					value: year,
				});
			}
			return matches;
		}

		// Handle keyword field specially (search array elements)
		if (fieldToSearch === "keyword") {
			const keywordMatch = matchKeyword(token.value, reference);
			if (keywordMatch) {
				matches.push(keywordMatch);
			}
			return matches;
		}

		// Map field specifier to actual CSL-JSON field name
		const fieldMap: Record<string, string> = {
			author: "author",
			title: "title",
			doi: "DOI",
			pmid: "PMID",
			pmcid: "PMCID",
		};

		const actualField = fieldMap[fieldToSearch] || fieldToSearch;
		const fieldValue = getFieldValue(reference, actualField);

		if (fieldValue !== null) {
			// Check if this is an ID field
			if (ID_FIELDS.has(actualField)) {
				// Exact match, case-sensitive
				if (fieldValue === token.value) {
					matches.push({
						field: actualField,
						strength: "exact",
						value: fieldValue,
					});
				}
			} else {
				// Content field: partial match, case-insensitive with normalization
				const normalizedFieldValue = normalize(fieldValue);
				const normalizedQuery = normalize(token.value);

				if (normalizedFieldValue.includes(normalizedQuery)) {
					matches.push({
						field: actualField,
						strength: "partial",
						value: fieldValue,
					});
				}
			}
		}

		return matches;
	}

	// No field specified: search all fields
	const fieldsToSearch = [
		"title",
		"author",
		"container-title",
		"publisher",
		"DOI",
		"PMID",
		"PMCID",
		"URL",
		"keyword",
		"abstract",
		"year",
	];

	for (const field of fieldsToSearch) {
		// Handle special fields
		if (field === "year") {
			const year = extractYear(reference);
			if (year === token.value) {
				matches.push({
					field: "year",
					strength: "exact",
					value: year,
				});
			}
			continue;
		}

		if (field === "URL") {
			const urlMatch = matchUrl(token.value, reference);
			if (urlMatch) {
				matches.push(urlMatch);
			}
			continue;
		}

		if (field === "keyword") {
			const keywordMatch = matchKeyword(token.value, reference);
			if (keywordMatch) {
				matches.push(keywordMatch);
			}
			continue;
		}

		const fieldValue = getFieldValue(reference, field);
		if (fieldValue !== null) {
			if (ID_FIELDS.has(field)) {
				// Exact match for ID fields
				if (fieldValue === token.value) {
					matches.push({
						field,
						strength: "exact",
						value: fieldValue,
					});
				}
			} else {
				// Partial match for content fields
				const normalizedFieldValue = normalize(fieldValue);
				const normalizedQuery = normalize(token.value);

				if (normalizedFieldValue.includes(normalizedQuery)) {
					matches.push({
						field,
						strength: "partial",
						value: fieldValue,
					});
				}
			}
		}
	}

	return matches;
}

/**
 * Match a reference against all search tokens
 * Returns a SearchResult if all tokens match (AND logic), null otherwise
 */
export function matchReference(
	reference: CslJsonItem,
	tokens: SearchToken[],
): SearchResult | null {
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
		const tokenStrength = matches.some((m) => m.strength === "exact")
			? "exact"
			: "partial";

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
	const score =
		overallStrength === "exact"
			? 100 + tokenMatches.length
			: 50 + tokenMatches.length;

	return {
		reference,
		tokenMatches,
		overallStrength,
		score,
	};
}
