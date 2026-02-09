import type { CslItem } from "../../core/csl-json/types.js";
import type { Attachments } from "../attachments/types.js";
import { getExtension } from "../attachments/types.js";
import { FULLTEXT_ROLE } from "../operations/fulltext-adapter/fulltext-adapter.js";

/**
 * Build a resource indicator string showing available resources for a reference.
 *
 * Icons (in fixed order): 📄 (PDF) 📝 (Markdown) 📎 (attachments) 🔗 (URL) 🏷 (tags)
 */
export function buildResourceIndicators(item: CslItem): string {
  const icons: string[] = [];

  const attachments = item.custom?.attachments as Attachments | undefined;
  const files = attachments?.files ?? [];

  // 📄 Fulltext PDF
  const hasFulltextPdf = files.some(
    (f) => f.role === FULLTEXT_ROLE && getExtension(f.filename) === "pdf"
  );
  if (hasFulltextPdf) icons.push("📄");

  // 📝 Fulltext Markdown
  const hasFulltextMd = files.some(
    (f) =>
      f.role === FULLTEXT_ROLE &&
      (getExtension(f.filename) === "md" || getExtension(f.filename) === "markdown")
  );
  if (hasFulltextMd) icons.push("📝");

  // 📎 Other (non-fulltext) attachments
  const hasOtherAttachments = files.some((f) => f.role !== FULLTEXT_ROLE);
  if (hasOtherAttachments) icons.push("📎");

  // 🔗 URL
  if (item.URL) icons.push("🔗");

  // 🏷 Tags
  const tags = item.custom?.tags;
  if (Array.isArray(tags) && tags.length > 0) icons.push("🏷");

  return icons.join("");
}
