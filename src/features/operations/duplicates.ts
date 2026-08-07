import type { CslItem, SupersededReason } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import {
  type DuplicateGroup,
  type DuplicateKeyType,
  scanDuplicates,
} from "../duplicate/scanner.js";
import { deprecateReference } from "./deprecate.js";

export interface DuplicatesOperationOptions {
  /** Key types to group by (default: DEFAULT_DUPLICATE_KEY_TYPES) */
  by?: readonly DuplicateKeyType[];
  /** Report groups already linked by superseded pointers */
  includeResolved?: boolean;
}

export interface DuplicatesOperationResult {
  /** Duplicate groups, largest first */
  groups: DuplicateGroup[];
  /** How many references were examined */
  scanned: number;
}

/**
 * Scan the whole library for duplicate references.
 *
 * @param library - The library to scan
 * @param options - Key types and resolved-group handling
 */
export async function findDuplicates(
  library: ILibrary,
  options: DuplicatesOperationOptions = {}
): Promise<DuplicatesOperationResult> {
  const items = await library.getAll();
  return {
    groups: scanDuplicates(items, options),
    scanned: items.length,
  };
}

export interface MarkGroupResult {
  /** Citation keys that now point at the keeper */
  marked: string[];
  /** Members that could not be marked, with the reason */
  failed: { id: string; error: string }[];
}

/**
 * Point every member of a group at the chosen keeper.
 *
 * Each member goes through `deprecateReference`, so the existence and cycle checks apply here
 * exactly as they do for a hand-typed `ref deprecate` — a group assembled from a stale scan
 * cannot write a pointer the command itself would have refused.
 *
 * @param library - The library to modify
 * @param keeper - The reference to keep citing
 * @param others - The members to mark; the keeper is skipped if present
 * @param reason - Recorded as custom.superseded_reason (default: 'duplicate')
 */
export async function markGroupDuplicates(
  library: ILibrary,
  keeper: CslItem,
  others: CslItem[],
  reason: SupersededReason = "duplicate"
): Promise<MarkGroupResult> {
  const result: MarkGroupResult = { marked: [], failed: [] };
  const keeperUuid = keeper.custom?.uuid;

  for (const item of others) {
    if (item.custom?.uuid === keeperUuid) continue;

    const outcome = await deprecateReference(library, {
      identifier: item.id,
      target: keeper.id,
      reason,
    });

    if (outcome.applied) {
      result.marked.push(item.id);
    } else {
      result.failed.push({ id: item.id, error: outcome.errorType ?? "unknown" });
    }
  }

  return result;
}
