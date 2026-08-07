import type { CslItem, SupersededReason } from "../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../core/library-interface.js";
import { buildUuidIndex, getSupersededMark } from "../superseded/index.js";

/**
 * Options for the deprecateReference operation.
 *
 * Exactly one of `target` / `unset` is meaningful: `target` sets the mark, `unset` clears it.
 * The CLI rejects the ambiguous combinations before calling.
 */
export interface DeprecateOperationOptions {
  /** Reference to mark (or unmark) */
  identifier: string;
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType;
  /** Successor identifier, resolved with the same idType */
  target?: string;
  /** Reason recorded in custom.superseded_reason (default: 'other') */
  reason?: SupersededReason;
  /** Clear the mark instead of setting it */
  unset?: boolean;
}

export type DeprecateErrorType =
  | "not_found"
  | "target_not_found"
  | "target_has_no_uuid"
  | "self_reference"
  | "cycle";

/**
 * Result of the deprecateReference operation.
 */
export interface DeprecateResult {
  /** Whether the library was changed */
  applied: boolean;
  /** The reference after the change (present whenever it was found) */
  item?: CslItem;
  /** The successor the mark points at (set operations only) */
  target?: CslItem;
  /** True when --unset ran against a reference that carried no mark */
  noop?: boolean;
  /** Error type when the operation was rejected */
  errorType?: DeprecateErrorType;
}

/**
 * Whether marking `item` as superseded by `target` would close a loop.
 *
 * Walks the successor chain starting at `target`; a chain that reaches `item` means citing the
 * successor would send the reader back to the record they started from. Also terminates on a
 * pre-existing cycle elsewhere in the chain.
 */
function wouldCreateCycle(item: CslItem, target: CslItem, index: Map<string, CslItem>): boolean {
  const itemUuid = item.custom?.uuid;
  if (!itemUuid) {
    return false;
  }

  const visited = new Set<string>();
  let current: CslItem | undefined = target;

  while (current) {
    const uuid = current.custom?.uuid;
    if (uuid === itemUuid) {
      return true;
    }
    if (uuid) {
      if (visited.has(uuid)) {
        return false;
      }
      visited.add(uuid);
    }

    const mark = getSupersededMark(current);
    current = mark ? index.get(mark.supersededBy) : undefined;
  }

  return false;
}

/**
 * Clear the superseded mark from a reference.
 *
 * The three fields are set to `undefined` rather than omitted: `Library.update` merges `custom`
 * into the existing object, so an omitted key would leave the old value in place. `undefined`
 * values are dropped when the library is serialized.
 */
async function clearMark(library: ILibrary, item: CslItem): Promise<DeprecateResult> {
  if (!getSupersededMark(item)) {
    return { applied: false, item, noop: true };
  }

  const updateResult = await library.update(
    item.id,
    {
      custom: {
        ...item.custom,
        superseded_by: undefined,
        superseded_reason: undefined,
        superseded_at: undefined,
      },
    },
    { idType: "id" }
  );
  await library.save();

  return { applied: true, item: updateResult.item ?? item };
}

/**
 * Mark a reference as superseded by another, or clear an existing mark.
 *
 * @param library - The library to modify
 * @param options - Identifier, successor, and reason
 * @returns Result carrying the changed reference, or the reason it was rejected
 */
export async function deprecateReference(
  library: ILibrary,
  options: DeprecateOperationOptions
): Promise<DeprecateResult> {
  const { identifier, idType = "id", target, reason = "other", unset = false } = options;

  const item = await library.find(identifier, { idType });
  if (!item) {
    return { applied: false, errorType: "not_found" };
  }

  if (unset) {
    return clearMark(library, item);
  }

  if (!target) {
    return { applied: false, item, errorType: "target_not_found" };
  }

  const targetItem = await library.find(target, { idType });
  if (!targetItem) {
    return { applied: false, item, errorType: "target_not_found" };
  }

  const targetUuid = targetItem.custom?.uuid;
  if (!targetUuid) {
    // Nothing stable to point at. Reachable only for records imported without a uuid, which
    // ensureCustomMetadata normally backfills.
    return { applied: false, item, target: targetItem, errorType: "target_has_no_uuid" };
  }

  if (targetUuid === item.custom?.uuid) {
    return { applied: false, item, target: targetItem, errorType: "self_reference" };
  }

  const index = buildUuidIndex(await library.getAll());
  if (wouldCreateCycle(item, targetItem, index)) {
    return { applied: false, item, target: targetItem, errorType: "cycle" };
  }

  const updateResult = await library.update(
    item.id,
    {
      custom: {
        ...item.custom,
        superseded_by: targetUuid,
        superseded_reason: reason,
        superseded_at: new Date().toISOString(),
      },
    },
    { idType: "id" }
  );
  await library.save();

  return { applied: true, item: updateResult.item ?? item, target: targetItem };
}
