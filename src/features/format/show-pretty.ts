/**
 * Show Pretty Formatter
 *
 * Rich pretty output for single-reference detail view.
 */

import type { NormalizedReference } from "./show-normalizer.js";

const LABEL_WIDTH = 11;

function label(name: string): string {
  return `  ${name.padEnd(LABEL_WIDTH)}`;
}

function formatJournalLine(ref: NormalizedReference): string {
  let line = ref.journal ?? "";
  if (ref.volume) {
    line += ref.issue ? `, ${ref.volume}(${ref.issue})` : `, ${ref.volume}`;
  }
  if (ref.page) {
    line += `, ${ref.page}`;
  }
  return line;
}

function formatDate(iso: string): string {
  return iso.slice(0, 10);
}

function formatFulltext(lines: string[], ref: NormalizedReference): void {
  if (!ref.fulltext) return;
  if (!ref.fulltext.pdf && !ref.fulltext.markdown) {
    lines.push(`${label("Fulltext:")}-`);
    return;
  }
  lines.push(`${label("Fulltext:")}`);
  lines.push(`    pdf:      ${ref.fulltext.pdf ?? "-"}`);
  lines.push(`    markdown: ${ref.fulltext.markdown ?? "-"}`);
}

function formatAttachments(lines: string[], ref: NormalizedReference): void {
  if (!ref.attachments || ref.attachments.length === 0) return;
  const roles = new Map<string, number>();
  for (const a of ref.attachments) {
    roles.set(a.role, (roles.get(a.role) ?? 0) + 1);
  }
  const parts = [...roles.entries()].map(([role, count]) => `${role} (${count} files)`);
  lines.push(`${label("Files:")}${parts.join(", ")}`);
}

function formatAbstract(lines: string[], ref: NormalizedReference): void {
  if (!ref.abstract) return;
  lines.push("");
  lines.push(`${label("Abstract:")}`);
  for (const line of ref.abstract.split("\n")) {
    lines.push(`    ${line}`);
  }
}

export function formatShowPretty(ref: NormalizedReference): string {
  const lines: string[] = [];

  // Header
  const header = ref.title ? `[${ref.id}] ${ref.title}` : `[${ref.id}]`;
  lines.push(header);

  // Core fields
  lines.push(`${label("Type:")}${ref.type}`);
  if (ref.authors) {
    lines.push(`${label("Authors:")}${ref.authors.join("; ")}`);
  }
  if (ref.year != null) {
    lines.push(`${label("Year:")}${ref.year}`);
  }
  if (ref.journal) {
    lines.push(`${label("Journal:")}${formatJournalLine(ref)}`);
  }

  // Identifiers
  if (ref.doi) lines.push(`${label("DOI:")}${ref.doi}`);
  if (ref.pmid) lines.push(`${label("PMID:")}${ref.pmid}`);
  if (ref.pmcid) lines.push(`${label("PMCID:")}${ref.pmcid}`);
  if (ref.url) lines.push(`${label("URL:")}${ref.url}`);

  // UUID always shown
  lines.push(`${label("UUID:")}${ref.uuid ?? "(no uuid)"}`);

  // Tags
  if (ref.tags && ref.tags.length > 0) {
    lines.push(`${label("Tags:")}${ref.tags.join(", ")}`);
  }

  // Timestamps
  if (ref.created) lines.push(`${label("Added:")}${formatDate(ref.created)}`);
  if (ref.modified) lines.push(`${label("Modified:")}${formatDate(ref.modified)}`);

  // Fulltext & attachments
  formatFulltext(lines, ref);
  formatAttachments(lines, ref);

  // Abstract
  formatAbstract(lines, ref);

  return lines.join("\n");
}
