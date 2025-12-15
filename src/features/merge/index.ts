/**
 * 3-way merge module
 *
 * Provides Last-Write-Wins (LWW) merge strategy for CSL-JSON items
 */

export type {
  FieldConflict,
  ItemConflict,
  MergeOptions,
  MergeResult,
  MergeStatus,
  PreferOption,
} from "./types.js";

export { threeWayMerge } from "./three-way.js";
