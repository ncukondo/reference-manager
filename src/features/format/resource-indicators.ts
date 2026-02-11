import type { CslItem } from "../../core/csl-json/types.js";
import type { Attachments } from "../attachments/types.js";
import { getExtension } from "../attachments/types.js";
import {
  extensionToFormat,
  findFulltextFiles,
} from "../operations/fulltext-adapter/fulltext-adapter.js";

/**
 * Build a resource indicator string showing available resources for a reference.
 *
 * Labels (in fixed order): pdf, md, file, url, tag
 */
export function buildResourceIndicators(item: CslItem): string {
  const labels: string[] = [];

  const attachments = item.custom?.attachments as Attachments | undefined;
  const fulltextFiles = findFulltextFiles(attachments);

  // pdf - Fulltext PDF
  const hasFulltextPdf = fulltextFiles.some(
    (f) => extensionToFormat(getExtension(f.filename)) === "pdf"
  );
  if (hasFulltextPdf) labels.push("pdf");

  // md - Fulltext Markdown
  const hasFulltextMd = fulltextFiles.some(
    (f) => extensionToFormat(getExtension(f.filename)) === "markdown"
  );
  if (hasFulltextMd) labels.push("md");

  // file - Other (non-fulltext) attachments
  const allFiles = attachments?.files ?? [];
  const hasOtherAttachments = allFiles.length > fulltextFiles.length;
  if (hasOtherAttachments) labels.push("file");

  // url - URL
  if (item.URL) labels.push("url");

  // tag - Tags
  const tags = item.custom?.tags;
  if (Array.isArray(tags) && tags.length > 0) labels.push("tag");

  return labels.join(" ");
}
