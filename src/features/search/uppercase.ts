/**
 * Represents a segment of consecutive uppercase letters in a string.
 */
export interface UppercaseSegment {
  /** The uppercase segment text */
  segment: string;
  /** Start index (inclusive) */
  start: number;
  /** End index (exclusive) */
  end: number;
}

/**
 * Checks if the text contains 2 or more consecutive uppercase letters.
 * Pattern: /[A-Z]{2,}/
 *
 * @param text - The text to check
 * @returns true if text contains consecutive uppercase letters
 */
export function hasConsecutiveUppercase(text: string): boolean {
  const pattern = /[A-Z]{2,}/;
  return pattern.test(text);
}

/**
 * Extracts all segments of 2 or more consecutive uppercase letters from text.
 * Pattern: /[A-Z]{2,}/g
 *
 * @param text - The text to extract segments from
 * @returns Array of uppercase segments with their positions
 */
export function extractUppercaseSegments(text: string): UppercaseSegment[] {
  const pattern = /[A-Z]{2,}/g;
  const segments: UppercaseSegment[] = [];

  for (const match of text.matchAll(pattern)) {
    segments.push({
      segment: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  return segments;
}

/**
 * Escapes special regex characters in a string.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Normalizes whitespace in a string (collapses multiple spaces, trims).
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Checks if all uppercase segments from the query exist in the target (case-sensitive).
 */
function allUppercaseSegmentsExist(segments: UppercaseSegment[], target: string): boolean {
  return segments.every((seg) => target.includes(seg.segment));
}

/**
 * Builds a regex pattern from query and its uppercase segments.
 * Uppercase segments are matched literally, other parts flexibly.
 */
function buildMatchPattern(query: string, segments: UppercaseSegment[]): string {
  const patternParts: string[] = [];
  let lastEnd = 0;

  for (const seg of segments) {
    if (seg.start > lastEnd) {
      const beforePart = query.slice(lastEnd, seg.start);
      if (beforePart.trim()) {
        patternParts.push(escapeRegex(beforePart));
      }
    }
    patternParts.push(`(?:${escapeRegex(seg.segment)})`);
    lastEnd = seg.end;
  }

  if (lastEnd < query.length) {
    const afterPart = query.slice(lastEnd);
    if (afterPart.trim()) {
      patternParts.push(escapeRegex(afterPart));
    }
  }

  return patternParts.join(".*?");
}

/**
 * Matches a query string against a target string with case sensitivity
 * for consecutive uppercase segments in the query.
 *
 * - If query contains 2+ consecutive uppercase letters (e.g., AI, RNA),
 *   those portions must match exactly in the target.
 * - Other portions are matched case-insensitively.
 *
 * @param query - The search query
 * @param target - The target string to match against
 * @returns true if query matches target according to the rules
 */
export function matchWithUppercaseSensitivity(query: string, target: string): boolean {
  if (query === "") {
    return true;
  }
  if (target === "") {
    return false;
  }

  const normalizedQuery = normalizeWhitespace(query);
  const normalizedTarget = normalizeWhitespace(target);

  if (!hasConsecutiveUppercase(normalizedQuery)) {
    return normalizedTarget.toLowerCase().includes(normalizedQuery.toLowerCase());
  }

  const segments = extractUppercaseSegments(normalizedQuery);

  if (!allUppercaseSegmentsExist(segments, target)) {
    return false;
  }

  const pattern = buildMatchPattern(normalizedQuery, segments);

  try {
    const regex = new RegExp(pattern, "i");
    return regex.test(normalizedTarget);
  } catch {
    return normalizedTarget.toLowerCase().includes(normalizedQuery.toLowerCase());
  }
}
