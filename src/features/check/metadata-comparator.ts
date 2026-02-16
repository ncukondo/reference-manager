/**
 * Metadata comparator for classifying differences between local and remote metadata.
 */

import type { CrossrefMetadata } from "./crossref-client.js";
import { isAuthorSimilar, isTitleSimilar } from "./metadata-similarity.js";

export interface MetadataComparisonResult {
  classification: "metadata_mismatch" | "metadata_outdated" | "no_change";
  changedFields: string[];
  fieldDiffs: Array<{
    field: string;
    local: string | null;
    remote: string | null;
  }>;
}

/**
 * Local item fields relevant for metadata comparison.
 */
export interface LocalMetadataFields {
  title?: string;
  author?: Array<{ family?: string; given?: string }>;
  "container-title"?: string;
  type?: string;
  page?: string;
  volume?: string;
  issue?: string;
  issued?: { "date-parts"?: number[][] };
}

/**
 * Map Crossref type to CSL type for comparison.
 */
const CROSSREF_TO_CSL_TYPE: Record<string, string> = {
  "journal-article": "article-journal",
  "book-chapter": "chapter",
  "proceedings-article": "paper-conference",
  "posted-content": "article",
};

function normalizeType(type: string | undefined, isCrossref: boolean): string | null {
  if (!type) return null;
  if (isCrossref) return CROSSREF_TO_CSL_TYPE[type] ?? type;
  return type;
}

function formatAuthors(
  authors: Array<{ family?: string; given?: string }> | undefined
): string | null {
  if (!authors || authors.length === 0) return null;
  return authors.map((a) => [a.family, a.given].filter(Boolean).join(", ")).join("; ");
}

function formatDateParts(issued: { "date-parts"?: number[][] } | undefined): string | null {
  const parts = issued?.["date-parts"]?.[0];
  if (!parts || parts.length === 0) return null;
  return parts.join("-");
}

type FieldDiff = MetadataComparisonResult["fieldDiffs"][number];

function addDiffIfChanged(
  diffs: FieldDiff[],
  fields: string[],
  name: string,
  local: string | null,
  remote: string | null
): void {
  if (local === remote) return;
  if (local === null && remote === null) return;
  fields.push(name);
  diffs.push({ field: name, local, remote });
}

function collectFieldDiffs(
  local: LocalMetadataFields,
  remote: CrossrefMetadata
): { changedFields: string[]; fieldDiffs: FieldDiff[] } {
  const changedFields: string[] = [];
  const fieldDiffs: FieldDiff[] = [];

  // Title
  addDiffIfChanged(fieldDiffs, changedFields, "title", local.title ?? null, remote.title ?? null);

  // Author
  addDiffIfChanged(
    fieldDiffs,
    changedFields,
    "author",
    formatAuthors(local.author),
    formatAuthors(remote.author)
  );

  // Container title
  addDiffIfChanged(
    fieldDiffs,
    changedFields,
    "container-title",
    local["container-title"] ?? null,
    remote.containerTitle ?? null
  );

  // Type (with mapping)
  addDiffIfChanged(
    fieldDiffs,
    changedFields,
    "type",
    normalizeType(local.type, false),
    normalizeType(remote.type, true)
  );

  // Publication fields
  addDiffIfChanged(fieldDiffs, changedFields, "page", local.page ?? null, remote.page ?? null);
  addDiffIfChanged(
    fieldDiffs,
    changedFields,
    "volume",
    local.volume ?? null,
    remote.volume ?? null
  );
  addDiffIfChanged(fieldDiffs, changedFields, "issue", local.issue ?? null, remote.issue ?? null);
  addDiffIfChanged(
    fieldDiffs,
    changedFields,
    "issued",
    formatDateParts(local.issued),
    formatDateParts(remote.issued)
  );

  return { changedFields, fieldDiffs };
}

/**
 * Compare local metadata fields against remote (Crossref) metadata.
 * Classifies differences as metadata_mismatch, metadata_outdated, or no_change.
 */
export function compareMetadata(
  local: LocalMetadataFields,
  remote: CrossrefMetadata
): MetadataComparisonResult {
  const { changedFields, fieldDiffs } = collectFieldDiffs(local, remote);

  if (changedFields.length === 0) {
    return { classification: "no_change", changedFields, fieldDiffs };
  }

  const titleSimilar = isTitleSimilar(local.title, remote.title);
  const authorSimilar = isAuthorSimilar(local.author, remote.author);

  if (!titleSimilar || !authorSimilar) {
    return { classification: "metadata_mismatch", changedFields, fieldDiffs };
  }

  return { classification: "metadata_outdated", changedFields, fieldDiffs };
}
