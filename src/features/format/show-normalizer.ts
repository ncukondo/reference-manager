/**
 * Show Normalizer
 *
 * Transforms CslItem into a flat, agent-friendly normalized structure
 * for JSON output and as data source for pretty formatting.
 */

import path from "node:path";
import type { CslItem } from "../../core/csl-json/types.js";

export interface NormalizedFulltext {
  pdf: string | null;
  markdown: string | null;
}

export interface NormalizedAttachment {
  filename: string;
  role: string;
}

export interface NormalizedReference {
  id: string;
  uuid: string | null;
  type: string;
  title: string | null;
  authors: string[] | null;
  year: number | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  page: string | null;
  doi: string | null;
  pmid: string | null;
  pmcid: string | null;
  url: string | null;
  abstract: string | null;
  tags: string[] | null;
  created: string | null;
  modified: string | null;
  fulltext: NormalizedFulltext | null;
  attachments: NormalizedAttachment[] | null;
  raw: CslItem;
}

export interface NormalizeOptions {
  attachmentsDirectory?: string;
}

function formatAuthor(author: {
  family?: string | undefined;
  given?: string | undefined;
  literal?: string | undefined;
}): string {
  if (author.literal) return author.literal;
  const family = author.family || "";
  const givenInitial = author.given ? `${author.given.charAt(0)}.` : "";
  return givenInitial ? `${family}, ${givenInitial}` : family;
}

function resolveFulltextAndAttachments(
  item: CslItem,
  attachmentsDirectory: string
): { fulltext: NormalizedFulltext; attachments: NormalizedAttachment[] } {
  const attachments = item.custom?.attachments;
  if (!attachments) {
    return {
      fulltext: { pdf: null, markdown: null },
      attachments: [],
    };
  }

  const dir = path.join(attachmentsDirectory, attachments.directory);
  const files = attachments.files ?? [];

  let pdfPath: string | null = null;
  let markdownPath: string | null = null;
  const nonFulltext: NormalizedAttachment[] = [];

  for (const file of files) {
    if (file.role === "fulltext") {
      if (file.filename.endsWith(".pdf")) {
        pdfPath = path.join(dir, file.filename);
      } else if (file.filename.endsWith(".md")) {
        markdownPath = path.join(dir, file.filename);
      }
    } else {
      nonFulltext.push({ filename: file.filename, role: file.role });
    }
  }

  return {
    fulltext: { pdf: pdfPath, markdown: markdownPath },
    attachments: nonFulltext,
  };
}

function normalizeAuthors(item: CslItem): string[] | null {
  return item.author && item.author.length > 0 ? item.author.map(formatAuthor) : null;
}

function normalizeFileInfo(
  item: CslItem,
  options?: NormalizeOptions
): { fulltext: NormalizedFulltext | null; attachments: NormalizedAttachment[] | null } {
  if (!options?.attachmentsDirectory) {
    return { fulltext: null, attachments: null };
  }
  return resolveFulltextAndAttachments(item, options.attachmentsDirectory);
}

export function normalizeReference(item: CslItem, options?: NormalizeOptions): NormalizedReference {
  const custom = item.custom;
  const { fulltext, attachments } = normalizeFileInfo(item, options);

  return {
    id: item.id,
    uuid: custom?.uuid ?? null,
    type: item.type,
    title: item.title ?? null,
    authors: normalizeAuthors(item),
    year: item.issued?.["date-parts"]?.[0]?.[0] ?? null,
    journal: (item["container-title"] as string) ?? null,
    volume: item.volume ?? null,
    issue: item.issue ?? null,
    page: item.page ?? null,
    doi: item.DOI ?? null,
    pmid: item.PMID ?? null,
    pmcid: item.PMCID ?? null,
    url: item.URL ?? null,
    abstract: item.abstract ?? null,
    tags: custom?.tags ?? null,
    created: custom?.created_at ?? null,
    modified: custom?.timestamp ?? null,
    fulltext,
    attachments,
    raw: item,
  };
}
