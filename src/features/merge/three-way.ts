/**
 * 3-way merge implementation with Last-Write-Wins (LWW) strategy
 */

import type { CslItem } from "../../core/csl-json/types.js";
import type {
  FieldConflict,
  ItemConflict,
  MergeOptions,
  MergeResult,
  MergeStatus,
} from "./types.js";

/**
 * Get UUID from item, with fallback to id if uuid is missing
 */
function getItemUuid(item: CslItem): string {
  return item.custom?.uuid || item.id || "unknown";
}

/**
 * Get timestamp from item, with fallback to created_at
 */
function getTimestamp(item: CslItem): string {
  return item.custom?.timestamp || item.custom?.created_at || "1970-01-01T00:00:00.000Z";
}

/**
 * Deep equality check for field values
 */
function deepEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Resolve a field conflict using LWW or prefer option
 */
function resolveFieldConflict(
  localValue: unknown,
  remoteValue: unknown,
  localTimestamp: string,
  remoteTimestamp: string,
  options?: MergeOptions
): unknown {
  if (localTimestamp > remoteTimestamp) {
    return localValue;
  }
  if (remoteTimestamp > localTimestamp) {
    return remoteValue;
  }
  // Timestamps equal: use prefer option or default to local
  if (options?.prefer === "remote") {
    return remoteValue;
  }
  return localValue;
}

/**
 * Determine conflict resolution type
 */
function determineResolution(
  fieldConflicts: FieldConflict[],
  localTimestamp: string,
  remoteTimestamp: string,
  options?: MergeOptions
): ItemConflict["resolution"] {
  const hasRealConflicts = fieldConflicts.every((fc) => fc.resolved !== undefined);
  const localIsNewer = fieldConflicts.some(
    (fc) => fc.local !== fc.remote && localTimestamp > remoteTimestamp
  );
  const remoteIsNewer = fieldConflicts.some(
    (fc) => fc.local !== fc.remote && remoteTimestamp > localTimestamp
  );

  if (hasRealConflicts && localIsNewer) return "auto-lww";
  if (hasRealConflicts && remoteIsNewer) return "auto-lww";
  if (options?.prefer === "local") return "prefer-local";
  if (options?.prefer === "remote") return "prefer-remote";
  return "unresolved";
}

/**
 * Merge a single field from base, local, and remote versions
 */
function mergeField(
  key: string,
  baseValue: unknown,
  localValue: unknown,
  remoteValue: unknown,
  localTimestamp: string,
  remoteTimestamp: string,
  options?: MergeOptions
): { value: unknown; conflict: FieldConflict | null } {
  const localChanged = !deepEqual(baseValue, localValue);
  const remoteChanged = !deepEqual(baseValue, remoteValue);

  if (!localChanged && !remoteChanged) {
    return { value: baseValue, conflict: null };
  }

  if (localChanged && !remoteChanged) {
    return { value: localValue, conflict: null };
  }

  if (!localChanged && remoteChanged) {
    return { value: remoteValue, conflict: null };
  }

  // Both changed
  if (deepEqual(localValue, remoteValue)) {
    return { value: localValue, conflict: null };
  }

  // Both changed to different values
  const resolved = resolveFieldConflict(
    localValue,
    remoteValue,
    localTimestamp,
    remoteTimestamp,
    options
  );

  // Don't record conflicts for 'custom' metadata field
  if (key === "custom") {
    return { value: resolved, conflict: null };
  }

  return {
    value: resolved,
    conflict: {
      field: key,
      base: baseValue,
      local: localValue,
      remote: remoteValue,
      resolved,
    },
  };
}

/**
 * Merge a single item from base, local, and remote versions
 */
function mergeItem(
  base: CslItem,
  local: CslItem,
  remote: CslItem,
  options?: MergeOptions
): { merged: CslItem; conflict: ItemConflict | null } {
  const uuid = getItemUuid(base);
  const localTimestamp = getTimestamp(local);
  const remoteTimestamp = getTimestamp(remote);

  const merged: CslItem = { ...base };
  const fieldConflicts: FieldConflict[] = [];

  // Get all unique keys from all three versions
  const allKeys = new Set<string>([
    ...Object.keys(base),
    ...Object.keys(local),
    ...Object.keys(remote),
  ]);

  for (const key of allKeys) {
    const baseValue = (base as Record<string, unknown>)[key];
    const localValue = (local as Record<string, unknown>)[key];
    const remoteValue = (remote as Record<string, unknown>)[key];

    const { value, conflict } = mergeField(
      key,
      baseValue,
      localValue,
      remoteValue,
      localTimestamp,
      remoteTimestamp,
      options
    );

    (merged as Record<string, unknown>)[key] = value;

    if (conflict) {
      fieldConflicts.push(conflict);
    }
  }

  // If there are field conflicts, create ItemConflict
  if (fieldConflicts.length > 0) {
    const resolution = determineResolution(
      fieldConflicts,
      localTimestamp,
      remoteTimestamp,
      options
    );

    return {
      merged,
      conflict: {
        uuid,
        id: base.id || "unknown",
        fields: fieldConflicts,
        localTimestamp,
        remoteTimestamp,
        resolution,
      },
    };
  }

  return { merged, conflict: null };
}

/**
 * Build UUID-indexed maps from item arrays
 */
function buildItemMaps(base: CslItem[], local: CslItem[], remote: CslItem[]) {
  const baseMap = new Map<string, CslItem>();
  const localMap = new Map<string, CslItem>();
  const remoteMap = new Map<string, CslItem>();

  for (const item of base) {
    baseMap.set(getItemUuid(item), item);
  }
  for (const item of local) {
    localMap.set(getItemUuid(item), item);
  }
  for (const item of remote) {
    remoteMap.set(getItemUuid(item), item);
  }

  return { baseMap, localMap, remoteMap };
}

/**
 * Handle items that exist in all three versions
 */
function mergeExistingItem(
  baseItem: CslItem,
  localItem: CslItem,
  remoteItem: CslItem,
  options: MergeOptions | undefined,
  merged: CslItem[],
  conflicts: ItemConflict[]
): void {
  const { merged: mergedItem, conflict } = mergeItem(baseItem, localItem, remoteItem, options);
  merged.push(mergedItem);
  if (conflict) {
    conflicts.push(conflict);
  }
}

/**
 * Handle items added in both local and remote
 */
function handleDualAddition(
  uuid: string,
  localItem: CslItem,
  remoteItem: CslItem,
  options: MergeOptions | undefined,
  merged: CslItem[],
  conflicts: ItemConflict[]
): void {
  if (deepEqual(localItem, remoteItem)) {
    merged.push(localItem);
  } else {
    const syntheticBase: CslItem = {
      id: uuid,
      type: "article",
      custom: {
        uuid,
        created_at: "1970-01-01T00:00:00.000Z",
        timestamp: "1970-01-01T00:00:00.000Z",
      },
    };
    const { merged: mergedItem, conflict } = mergeItem(
      syntheticBase,
      localItem,
      remoteItem,
      options
    );
    merged.push(mergedItem);
    if (conflict) {
      conflicts.push(conflict);
    }
  }
}

/**
 * Process a single UUID across all three versions
 */
function processItem(
  uuid: string,
  baseMap: Map<string, CslItem>,
  localMap: Map<string, CslItem>,
  remoteMap: Map<string, CslItem>,
  options: MergeOptions | undefined,
  result: {
    merged: CslItem[];
    conflicts: ItemConflict[];
    localOnly: CslItem[];
    remoteOnly: CslItem[];
    deletedInLocal: CslItem[];
    deletedInRemote: CslItem[];
  }
): void {
  const baseItem = baseMap.get(uuid);
  const localItem = localMap.get(uuid);
  const remoteItem = remoteMap.get(uuid);

  if (baseItem && localItem && remoteItem) {
    mergeExistingItem(baseItem, localItem, remoteItem, options, result.merged, result.conflicts);
  } else if (!baseItem && localItem && remoteItem) {
    handleDualAddition(uuid, localItem, remoteItem, options, result.merged, result.conflicts);
  } else if (!baseItem && localItem && !remoteItem) {
    result.merged.push(localItem);
    result.localOnly.push(localItem);
  } else if (!baseItem && !localItem && remoteItem) {
    result.merged.push(remoteItem);
    result.remoteOnly.push(remoteItem);
  } else if (baseItem && !localItem && remoteItem) {
    result.deletedInLocal.push(baseItem);
  } else if (baseItem && localItem && !remoteItem) {
    result.deletedInRemote.push(baseItem);
  } else if (baseItem && !localItem && !remoteItem) {
    result.deletedInLocal.push(baseItem);
    result.deletedInRemote.push(baseItem);
  }
}

/**
 * Performs a 3-way merge of CSL-JSON items
 *
 * @param base - Base version (common ancestor)
 * @param local - Local version (current working copy)
 * @param remote - Remote version (incoming changes)
 * @param options - Merge options (e.g., prefer local/remote for tie-breaking)
 * @returns Merge result with merged items and conflict information
 */
export function threeWayMerge(
  base: CslItem[],
  local: CslItem[],
  remote: CslItem[],
  options?: MergeOptions
): MergeResult {
  const { baseMap, localMap, remoteMap } = buildItemMaps(base, local, remote);

  const result = {
    merged: [] as CslItem[],
    conflicts: [] as ItemConflict[],
    localOnly: [] as CslItem[],
    remoteOnly: [] as CslItem[],
    deletedInLocal: [] as CslItem[],
    deletedInRemote: [] as CslItem[],
  };

  const allUuids = new Set<string>([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()]);

  for (const uuid of allUuids) {
    processItem(uuid, baseMap, localMap, remoteMap, options, result);
  }

  // Determine overall status
  let status: MergeStatus = "success";
  if (result.conflicts.length > 0) {
    const hasUnresolved = result.conflicts.some((c) => c.resolution === "unresolved");
    status = hasUnresolved ? "conflict" : "auto-resolved";
  }

  return {
    status,
    ...result,
  };
}
