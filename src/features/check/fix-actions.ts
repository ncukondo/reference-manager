import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import type { CheckFinding } from "./types.js";

export type FixActionType =
  | "add_retracted_tag"
  | "add_retraction_note"
  | "remove_from_library"
  | "update_from_published"
  | "add_version_tag"
  | "add_concern_tag"
  | "add_concern_note"
  | "skip";

export interface FixAction {
  type: FixActionType;
  label: string;
}

export interface FixActionResult {
  applied: boolean;
  message: string;
  removed?: boolean;
}

export function getFixActionsForFinding(_finding: CheckFinding): FixAction[] {
  throw new Error("Not implemented");
}

export async function applyFixAction(
  _library: ILibrary,
  _item: CslItem,
  _finding: CheckFinding,
  _actionType: FixActionType
): Promise<FixActionResult> {
  throw new Error("Not implemented");
}
