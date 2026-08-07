/**
 * Superseded pointer resolution (#108).
 *
 * `custom.superseded_by` holds the successor's uuid, so resolving a pointer means a lookup
 * against a uuid index. Callers build the index once per command and reuse it — a library of
 * several thousand references makes a per-item linear scan quadratic.
 *
 * See spec/features/superseded.md.
 */

import type { CslItem } from "../../core/csl-json/types.js";

/** A superseded mark read off a reference. */
export interface SupersededMark {
  /** uuid of the successor. Never empty. */
  supersededBy: string;
  /** Free string from storage; falls back to "other" when absent. */
  reason: string;
  /** ISO 8601 timestamp, absent on hand-written marks. */
  at: string | undefined;
}

/** Result of following a single `superseded_by` pointer. */
export interface SuccessorResolution {
  /** The successor, or null when its uuid is absent from the library. */
  target: CslItem | null;
  /** True when the pointer names a uuid that is not in the library. */
  dangling: boolean;
}

/** Result of following a `superseded_by` chain to its end. */
export interface ChainResolution {
  /** Last record reached, or null when the very first hop dangled. */
  target: CslItem | null;
  /** True when the chain ended at a pointer whose uuid is absent from the library. */
  dangling: boolean;
  /** True when the chain revisited a record; `target` is the last one reached before that. */
  cycle: boolean;
  /** Number of pointers successfully followed. */
  hops: number;
}

/** Reason recorded when a mark carries a pointer but no reason. */
const DEFAULT_REASON = "other";

/**
 * Read the superseded mark off a reference.
 *
 * The pointer alone constitutes a mark: `ref deprecate` always writes all three fields, but a
 * hand-edited or externally written record may carry only `superseded_by`, and dropping such a
 * pointer would silently lose the one piece of information that matters.
 *
 * @returns The mark, or null when the reference carries no usable pointer
 */
export function getSupersededMark(item: CslItem): SupersededMark | null {
  const supersededBy = item.custom?.superseded_by?.trim();
  if (!supersededBy) {
    return null;
  }
  return {
    supersededBy,
    reason: item.custom?.superseded_reason?.trim() || DEFAULT_REASON,
    at: item.custom?.superseded_at,
  };
}

/** Whether a reference carries a superseded pointer. */
export function isSuperseded(item: CslItem): boolean {
  return getSupersededMark(item) !== null;
}

/**
 * Index references by uuid for pointer resolution.
 * References without a uuid cannot be pointed at and are skipped.
 */
export function buildUuidIndex(items: CslItem[]): Map<string, CslItem> {
  const index = new Map<string, CslItem>();
  for (const item of items) {
    const uuid = item.custom?.uuid;
    if (uuid) {
      index.set(uuid, item);
    }
  }
  return index;
}

/**
 * Follow one `superseded_by` pointer.
 *
 * @returns The resolution, or null when the reference is not superseded
 */
export function resolveSuccessor(
  item: CslItem,
  index: Map<string, CslItem>
): SuccessorResolution | null {
  const mark = getSupersededMark(item);
  if (!mark) {
    return null;
  }
  const target = index.get(mark.supersededBy);
  return target ? { target, dangling: false } : { target: null, dangling: true };
}

/**
 * Follow a `superseded_by` chain to the last reachable record.
 *
 * `ref deprecate` rejects cycles, so a cycle here means the library was edited by hand or by
 * another tool. Detect and report it rather than looping.
 *
 * @returns The resolution, or null when the reference is not superseded
 */
export function resolveFinalSuccessor(
  item: CslItem,
  index: Map<string, CslItem>
): ChainResolution | null {
  if (!isSuperseded(item)) {
    return null;
  }

  const visited = new Set<string>();
  const startUuid = item.custom?.uuid;
  if (startUuid) {
    visited.add(startUuid);
  }

  let current = item;
  let target: CslItem | null = null;
  let hops = 0;

  while (true) {
    const mark = getSupersededMark(current);
    if (!mark) {
      // Chain ended at a record that is not itself superseded.
      return { target, dangling: false, cycle: false, hops };
    }

    const next = index.get(mark.supersededBy);
    if (!next) {
      return { target, dangling: true, cycle: false, hops };
    }
    if (visited.has(mark.supersededBy)) {
      // Report the last record reached before the chain looped back. Returning the repeated
      // record would name something the caller has already been told about.
      return { target, dangling: false, cycle: true, hops };
    }

    visited.add(mark.supersededBy);
    target = next;
    current = next;
    hops += 1;
  }
}
