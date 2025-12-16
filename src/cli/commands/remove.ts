import type { CslItem } from "../../core/csl-json/types.js";

export interface RemoveOptions {
  byUuid: boolean;
}

export interface RemoveResult {
  removed: boolean;
  item?: CslItem | undefined;
  remaining: CslItem[];
}

/**
 * Remove a reference from the library.
 *
 * @param items - Library items
 * @param identifier - Reference ID or UUID
 * @param options - Remove options
 * @returns Remove result
 */
export async function remove(
  items: CslItem[],
  identifier: string,
  options: RemoveOptions
): Promise<RemoveResult> {
  let foundIndex = -1;

  if (options.byUuid) {
    // Find by UUID
    foundIndex = items.findIndex((item) => item.custom?.uuid === identifier);
  } else {
    // Find by ID
    foundIndex = items.findIndex((item) => item.id === identifier);
  }

  if (foundIndex === -1) {
    // Not found
    return {
      removed: false,
      remaining: items,
    };
  }

  const foundItem = items[foundIndex];
  const remaining = [...items.slice(0, foundIndex), ...items.slice(foundIndex + 1)];

  return {
    removed: true,
    item: foundItem,
    remaining,
  };
}
