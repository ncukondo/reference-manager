/**
 * 3-way merge types for Last-Write-Wins (LWW) conflict resolution
 */

import type { CslItem } from "../../core/csl-json/types.js";

/**
 * Preference option for tie-breaking when timestamps are equal
 */
export type PreferOption = "local" | "remote";

/**
 * Merge options
 */
export interface MergeOptions {
  /**
   * Tie-breaker when custom.timestamp values are equal
   * If not provided and timestamps are equal, conflict is reported
   */
  prefer?: PreferOption;
}

/**
 * Information about a field conflict
 */
export interface FieldConflict {
  /** Field path (e.g., "title", "author[0].family") */
  field: string;
  /** Value in base version */
  base: unknown;
  /** Value in local version */
  local: unknown;
  /** Value in remote version */
  remote: unknown;
  /** Chosen value (based on LWW or prefer option) */
  resolved?: unknown;
}

/**
 * Information about a conflicted item
 */
export interface ItemConflict {
  /** UUID of the conflicted item */
  uuid: string;
  /** ID (citation key) of the item */
  id: string;
  /** List of conflicting fields */
  fields: FieldConflict[];
  /** Local timestamp */
  localTimestamp: string;
  /** Remote timestamp */
  remoteTimestamp: string;
  /** How the conflict was resolved */
  resolution: "auto-lww" | "prefer-local" | "prefer-remote" | "unresolved";
}

/**
 * Merge status
 */
export type MergeStatus =
  | "success" // All items merged successfully, no conflicts
  | "auto-resolved" // Conflicts auto-resolved via LWW
  | "conflict"; // Unresolved conflicts (same timestamp, no --prefer)

/**
 * Result of a 3-way merge operation
 */
export interface MergeResult {
  /** Merge status */
  status: MergeStatus;
  /** Merged items (all items from both sides, with conflicts resolved) */
  merged: CslItem[];
  /** List of conflicts (empty if status is 'success') */
  conflicts: ItemConflict[];
  /** Items only in local (additions in local) */
  localOnly: CslItem[];
  /** Items only in remote (additions in remote) */
  remoteOnly: CslItem[];
  /** Items deleted in local (present in base, absent in local) */
  deletedInLocal: CslItem[];
  /** Items deleted in remote (present in base, absent in remote) */
  deletedInRemote: CslItem[];
}
