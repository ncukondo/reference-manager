import type { CslItem } from "../../core/csl-json/types.js";

export interface UpdateOptions {
  byUuid: boolean;
}

export interface UpdateResult {
  updated: boolean;
  item?: CslItem | undefined;
  items: CslItem[];
}

/**
 * Update a reference in the library.
 *
 * @param items - Library items
 * @param identifier - Reference ID or UUID
 * @param updates - Partial updates to apply
 * @param options - Update options
 * @returns Update result
 */
export async function update(
  items: CslItem[],
  identifier: string,
  updates: Partial<CslItem>,
  options: UpdateOptions
): Promise<UpdateResult> {
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
      updated: false,
      items,
    };
  }

  const existingItem = items[foundIndex];
  if (!existingItem) {
    // Should not happen, but TypeScript needs this
    return {
      updated: false,
      items,
    };
  }

  // Merge updates with existing item
  const updatedItem: CslItem = {
    ...existingItem,
    ...updates,
    // Ensure required fields
    id: updates.id ?? existingItem.id,
    type: updates.type ?? existingItem.type,
    // Preserve UUID and created_at
    custom: {
      ...(existingItem.custom || {}),
      ...(updates.custom || {}),
      uuid: existingItem.custom?.uuid || "",
      created_at: existingItem.custom?.created_at || new Date().toISOString(),
      // Update timestamp
      timestamp: new Date().toISOString(),
    },
  };

  const updatedItems = [...items.slice(0, foundIndex), updatedItem, ...items.slice(foundIndex + 1)];

  return {
    updated: true,
    item: updatedItem,
    items: updatedItems,
  };
}
