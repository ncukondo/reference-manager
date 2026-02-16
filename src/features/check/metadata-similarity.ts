/**
 * Metadata similarity functions for comparing local vs remote reference metadata.
 */

import { normalize } from "../search/normalizer.js";

type AuthorName = { family?: string; given?: string };

/**
 * Tokenize a title into a set of normalized words.
 */
function titleToWordSet(title: string): Set<string> {
  const normalized = normalize(title);
  if (normalized === "") return new Set();
  return new Set(normalized.split(" "));
}

/**
 * Check if two titles are similar using Jaccard similarity and Containment coefficient.
 * Returns true (similar) if Jaccard >= 0.5 OR Containment >= 0.8.
 * Returns true if either title is empty/undefined (not enough data to compare).
 */
export function isTitleSimilar(local: string | undefined, remote: string | undefined): boolean {
  if (!local || !remote) return true;

  const localWords = titleToWordSet(local);
  const remoteWords = titleToWordSet(remote);

  if (localWords.size === 0 || remoteWords.size === 0) return true;

  // Intersection
  let intersectionSize = 0;
  for (const word of localWords) {
    if (remoteWords.has(word)) intersectionSize++;
  }

  // Jaccard = |A∩B| / |A∪B|
  const unionSize = localWords.size + remoteWords.size - intersectionSize;
  const jaccard = unionSize > 0 ? intersectionSize / unionSize : 0;

  // Containment = |A∩B| / min(|A|, |B|)
  const minSize = Math.min(localWords.size, remoteWords.size);
  const containment = minSize > 0 ? intersectionSize / minSize : 0;

  return jaccard >= 0.5 || containment >= 0.8;
}

/**
 * Extract and normalize family names from an author array.
 */
function extractFamilyNames(authors: AuthorName[]): Set<string> {
  const families = new Set<string>();
  for (const author of authors) {
    if (author.family) {
      families.add(normalize(author.family));
    }
  }
  return families;
}

/**
 * Check if author lists are similar using family name overlap ratio.
 * Overlap = |local_families ∩ remote_families| / |local_families|
 * Returns true (similar) if overlap >= 0.5.
 * Returns true if either side has no authors (not enough data).
 */
export function isAuthorSimilar(
  local: AuthorName[] | undefined,
  remote: AuthorName[] | undefined
): boolean {
  if (!local || !remote || local.length === 0 || remote.length === 0) return true;

  const localFamilies = extractFamilyNames(local);
  const remoteFamilies = extractFamilyNames(remote);

  if (localFamilies.size === 0 || remoteFamilies.size === 0) return true;

  let overlapCount = 0;
  for (const family of localFamilies) {
    if (remoteFamilies.has(family)) overlapCount++;
  }

  const overlap = overlapCount / localFamilies.size;
  return overlap >= 0.5;
}
