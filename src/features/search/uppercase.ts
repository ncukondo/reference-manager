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
