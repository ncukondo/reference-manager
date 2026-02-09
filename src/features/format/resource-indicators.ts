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
 * Icons (in fixed order): 📄 (PDF) 📝 (Markdown) 📎 (attachments) 🔗 (URL) 🏷 (tags)
 */
export function buildResourceIndicators(item: CslItem): string {
  const icons: string[] = [];

  const attachments = item.custom?.attachments as Attachments | undefined;
  const fulltextFiles = findFulltextFiles(attachments);

  // 📄 Fulltext PDF
  const hasFulltextPdf = fulltextFiles.some(
    (f) => extensionToFormat(getExtension(f.filename)) === "pdf"
  );
  if (hasFulltextPdf) icons.push("📄");

  // 📝 Fulltext Markdown
  const hasFulltextMd = fulltextFiles.some(
    (f) => extensionToFormat(getExtension(f.filename)) === "markdown"
  );
  if (hasFulltextMd) icons.push("📝");

  // 📎 Other (non-fulltext) attachments
  const allFiles = attachments?.files ?? [];
  const hasOtherAttachments = allFiles.length > fulltextFiles.length;
  if (hasOtherAttachments) icons.push("📎");

  // 🔗 URL
  if (item.URL) icons.push("🔗");

  // 🏷 Tags
  const tags = item.custom?.tags;
  if (Array.isArray(tags) && tags.length > 0) icons.push("🏷");

  return icons.join("");
}
