import type { CslItem } from "../../core/csl-json/types.js";
import { detectDuplicate } from "../../features/duplicate/detector.js";
import type { DuplicateMatch } from "../../features/duplicate/types.js";

export interface AddOptions {
  force: boolean;
}

export interface AddResult {
  added: boolean;
  item: CslItem;
  idChanged: boolean;
  originalId?: string | undefined;
  duplicate?: DuplicateMatch | undefined;
}

/**
 * Generate suffix for ID collision (a, b, c, ..., z, aa, ab, ...)
 */
function generateSuffix(index: number): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let suffix = "";
  let n = index;

  do {
    suffix = alphabet[n % 26] + suffix;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);

  return suffix;
}

/**
 * Resolve ID collision by appending suffix
 */
function resolveIdCollision(baseId: string, existing: CslItem[]): { id: string; changed: boolean } {
  const existingIds = new Set(existing.map((item) => item.id));

  if (!existingIds.has(baseId)) {
    return { id: baseId, changed: false };
  }

  // Find next available suffix
  let index = 0;
  let newId: string;

  do {
    const suffix = generateSuffix(index);
    newId = `${baseId}${suffix}`;
    index++;
  } while (existingIds.has(newId));

  return { id: newId, changed: true };
}

/**
 * Add a new reference to the library.
 *
 * @param existing - Existing library items
 * @param newItem - New item to add
 * @param options - Add options
 * @returns Add result
 */
export async function add(
  existing: CslItem[],
  newItem: CslItem,
  options: AddOptions
): Promise<AddResult> {
  // 1. Check for content duplicate (unless force=true)
  if (!options.force) {
    const duplicateResult = detectDuplicate(newItem, existing);

    if (duplicateResult.matches.length > 0) {
      // Duplicate found, reject
      return {
        added: false,
        item: newItem,
        idChanged: false,
        duplicate: duplicateResult.matches[0],
      };
    }
  }

  // 2. Resolve ID collision
  const originalId = newItem.id;
  const { id, changed } = resolveIdCollision(originalId, existing);

  const finalItem: CslItem = {
    ...newItem,
    id,
  };

  return {
    added: true,
    item: finalItem,
    idChanged: changed,
    originalId: changed ? originalId : undefined,
  };
}
