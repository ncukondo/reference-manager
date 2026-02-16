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
  | "update_all_fields"
  | "update_selected_fields"
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

export function getFixActionsForFinding(finding: CheckFinding): FixAction[] {
  switch (finding.type) {
    case "retracted":
      return [
        { type: "add_retracted_tag", label: 'Add tag "retracted"' },
        { type: "add_retraction_note", label: "Add note with retraction details" },
        { type: "remove_from_library", label: "Remove from library" },
        { type: "skip", label: "Skip" },
      ];
    case "version_changed":
      return [
        { type: "update_from_published", label: "Update metadata from published version" },
        { type: "add_version_tag", label: 'Add tag "has-published-version"' },
        { type: "skip", label: "Skip" },
      ];
    case "concern":
      return [
        { type: "add_concern_tag", label: 'Add tag "expression-of-concern"' },
        { type: "add_concern_note", label: "Add note with concern details" },
        { type: "skip", label: "Skip" },
      ];
    case "metadata_mismatch":
    case "metadata_outdated":
      return [
        { type: "update_all_fields", label: "Update all changed fields from remote" },
        { type: "skip", label: "Skip" },
      ];
    default:
      return [];
  }
}

function addTag(item: CslItem, tag: string): string[] {
  const existing = (item.custom?.tags as string[] | undefined) ?? [];
  if (existing.includes(tag)) {
    return existing;
  }
  return [...existing, tag];
}

function buildNoteText(prefix: string, finding: CheckFinding): string {
  const parts = [prefix];
  if (finding.details?.retractionDate) {
    parts.push(`Date: ${finding.details.retractionDate}`);
  }
  if (finding.details?.retractionDoi) {
    parts.push(`DOI: ${finding.details.retractionDoi}`);
  }
  return parts.join(". ");
}

function appendNote(existingNote: string | undefined, newNote: string): string {
  if (existingNote) {
    return `${existingNote}\n\n${newNote}`;
  }
  return newNote;
}

async function applyTagAction(
  library: ILibrary,
  item: CslItem,
  tag: string
): Promise<FixActionResult> {
  const tags = addTag(item, tag);
  await library.update(item.id, { custom: { ...item.custom, tags } } as Partial<CslItem>, {
    idType: "id",
  });
  await library.save();
  return { applied: true, message: `Added tag "${tag}"` };
}

async function applyNoteAction(
  library: ILibrary,
  item: CslItem,
  prefix: string,
  finding: CheckFinding
): Promise<FixActionResult> {
  const noteText = buildNoteText(prefix, finding);
  const note = appendNote(item.note, noteText);
  await library.update(item.id, { note } as Partial<CslItem>, { idType: "id" });
  await library.save();
  return { applied: true, message: `Added note: ${noteText}` };
}

async function applyUpdateFromPublished(
  library: ILibrary,
  item: CslItem,
  finding: CheckFinding
): Promise<FixActionResult> {
  const newDoi = finding.details?.newDoi;
  if (!newDoi) {
    return { applied: false, message: "No published DOI available in finding details" };
  }
  const { fetchDoi } = await import("../import/fetcher.js");
  const fetchResult = await fetchDoi(newDoi);
  if (!fetchResult.success) {
    return {
      applied: false,
      message: `Failed to fetch metadata for ${newDoi}: ${fetchResult.error}`,
    };
  }
  const { id: _id, custom: _custom, ...metadata } = fetchResult.item;
  await library.update(item.id, metadata as Partial<CslItem>, { idType: "id" });
  await library.save();
  return { applied: true, message: `Updated metadata from ${newDoi}` };
}

async function applyUpdateAllFields(
  library: ILibrary,
  item: CslItem,
  finding: CheckFinding
): Promise<FixActionResult> {
  if (!item.DOI) {
    return { applied: false, message: "No DOI available for metadata update" };
  }
  const { fetchDoi } = await import("../import/fetcher.js");
  const fetchResult = await fetchDoi(item.DOI);
  if (!fetchResult.success) {
    return {
      applied: false,
      message: `Failed to fetch metadata for ${item.DOI}: ${fetchResult.error}`,
    };
  }
  const updatedFields = finding.details?.updatedFields ?? [];
  const fetchedItem = fetchResult.item;
  const updates: Partial<CslItem> = {};
  for (const field of updatedFields) {
    if (field in fetchedItem) {
      (updates as Record<string, unknown>)[field] = (fetchedItem as Record<string, unknown>)[field];
    }
  }
  if (Object.keys(updates).length === 0) {
    return { applied: false, message: "No fields to update" };
  }
  await library.update(item.id, updates, { idType: "id" });
  await library.save();
  return { applied: true, message: `Updated fields: ${updatedFields.join(", ")}` };
}

export async function applyFixAction(
  library: ILibrary,
  item: CslItem,
  finding: CheckFinding,
  actionType: FixActionType
): Promise<FixActionResult> {
  switch (actionType) {
    case "add_retracted_tag":
      return applyTagAction(library, item, "retracted");

    case "add_retraction_note":
      return applyNoteAction(library, item, "RETRACTED", finding);

    case "add_concern_tag":
      return applyTagAction(library, item, "expression-of-concern");

    case "add_concern_note":
      return applyNoteAction(library, item, "EXPRESSION OF CONCERN", finding);

    case "add_version_tag":
      return applyTagAction(library, item, "has-published-version");

    case "remove_from_library": {
      const removeResult = await library.remove(item.id, { idType: "id" });
      if (!removeResult.removed) {
        return { applied: false, message: `Failed to remove ${item.id}` };
      }
      await library.save();
      return { applied: true, message: `Removed ${item.id}`, removed: true };
    }

    case "update_from_published":
      return applyUpdateFromPublished(library, item, finding);

    case "update_all_fields":
      return applyUpdateAllFields(library, item, finding);

    case "update_selected_fields":
      return { applied: false, message: "Field selection not available in CLI mode" };

    case "skip":
      return { applied: true, message: "Skipped" };

    default:
      return { applied: false, message: `Unknown action: ${actionType}` };
  }
}
