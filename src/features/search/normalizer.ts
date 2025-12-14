/**
 * Normalize text for search matching
 *
 * Applies the following transformations:
 * 1. Unicode NFKC normalization
 * 2. Lowercase conversion
 * 3. Remove diacritics (accents)
 * 4. Punctuation removal
 * 5. Whitespace normalization
 */
export function normalize(text: string): string {
	// Step 1: Unicode NFKC normalization (compatibility normalization)
	let normalized = text.normalize("NFKC");

	// Step 2: Lowercase
	normalized = normalized.toLowerCase();

	// Step 3: Remove diacritics
	// Use NFD to decompose, then remove combining diacritical marks
	normalized = normalized
		.normalize("NFD")
		.replace(/\p{M}/gu, "");

	// Step 4: Remove punctuation
	// Replace all punctuation and special characters with spaces
	// Keep: letters (including Unicode), numbers, slashes, and whitespace
	normalized = normalized.replace(/[^\p{L}\p{N}/\s]/gu, " ");

	// Step 5: Normalize whitespace
	// - Replace all whitespace sequences (spaces, tabs, newlines) with a single space
	// - Trim leading and trailing whitespace
	normalized = normalized.replace(/\s+/g, " ").trim();

	return normalized;
}
