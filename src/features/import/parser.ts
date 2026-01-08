/**
 * Parser module for BibTeX and RIS formats
 *
 * Uses citation-js plugins for parsing:
 * - @citation-js/plugin-bibtex for BibTeX
 * - @citation-js/plugin-ris for RIS
 */

import { Cite } from "@citation-js/core";
import "@citation-js/plugin-bibtex";
import "@citation-js/plugin-ris";
import type { CslItem } from "../../core/csl-json/types.js";

/**
 * Result of a parse operation
 */
export type ParseResult = {
  success: boolean;
  items: CslItem[];
  error?: string;
};

/**
 * Parse BibTeX content to CSL-JSON
 *
 * @param content - BibTeX content string
 * @returns Parse result with CSL-JSON items
 */
export function parseBibtex(content: string): ParseResult {
  return parseWithCitationJs(content, "bibtex");
}

/**
 * Parse RIS content to CSL-JSON
 *
 * @param content - RIS content string
 * @returns Parse result with CSL-JSON items
 */
export function parseRis(content: string): ParseResult {
  return parseWithCitationJs(content, "ris");
}

/**
 * NBIB to RIS tag mapping
 *
 * Maps PubMed MEDLINE tags to RIS equivalents
 */
const NBIB_TO_RIS_TAG_MAP: Record<string, string> = {
  PMID: "AN", // PubMed ID -> Accession Number
  TI: "TI", // Title -> Title
  FAU: "AU", // Full Author -> Author
  AU: "AU", // Author -> Author (short form, use FAU when available)
  JT: "JO", // Journal Title -> Journal Name
  TA: "JA", // Title Abbreviation -> Journal Abbreviation
  AB: "AB", // Abstract -> Abstract
  VI: "VL", // Volume -> Volume
  IP: "IS", // Issue/Part -> Issue Number
  PG: "SP", // Pagination -> Start Page (includes range)
  DP: "PY", // Date of Publication -> Publication Year
  LA: "LA", // Language -> Language
  MH: "KW", // MeSH Headings -> Keywords
  OT: "KW", // Other Terms -> Keywords
  AD: "AD", // Affiliation/Address -> Author Address
  IS: "SN", // ISSN -> Serial Number
  PT: "TY", // Publication Type -> Type of Reference
};

/**
 * Publication type mapping from NBIB to RIS
 */
const NBIB_PUBLICATION_TYPE_MAP: Record<string, string> = {
  "Journal Article": "JOUR",
  Review: "JOUR",
  Book: "BOOK",
  "Book Chapter": "CHAP",
  "Conference Paper": "CPAPER",
  Thesis: "THES",
  Report: "RPRT",
};

/**
 * Parse a single NBIB entry into tag-value pairs
 */
function parseNbibEntry(entry: string): Array<{ tag: string; value: string }> {
  const result: Array<{ tag: string; value: string }> = [];
  const lines = entry.split("\n");

  let currentTag = "";
  let currentValue = "";

  for (const line of lines) {
    // Check if line starts with a tag (uppercase letters followed by space(s) and dash)
    const tagMatch = line.match(/^([A-Z]+)\s*-\s*(.*)$/);

    if (tagMatch) {
      // Save previous tag-value pair
      if (currentTag) {
        result.push({ tag: currentTag, value: currentValue.trim() });
      }
      currentTag = tagMatch[1] ?? "";
      currentValue = tagMatch[2] ?? "";
    } else if (currentTag && line.match(/^\s+/)) {
      // Continuation line (starts with whitespace)
      currentValue += ` ${line.trim()}`;
    }
  }

  // Save the last tag-value pair
  if (currentTag) {
    result.push({ tag: currentTag, value: currentValue.trim() });
  }

  return result;
}

/**
 * Convert a single NBIB tag-value pair to RIS line
 * @returns RIS line or null if tag should be skipped
 */
function convertNbibTagToRisLine(
  tag: string,
  value: string
): { line: string; isType?: boolean } | null {
  // Handle DOI specially (AID tag with [doi] suffix)
  if (tag === "AID" && value.includes("[doi]")) {
    const doi = value.replace(/\s*\[doi\].*$/, "").trim();
    return { line: `DO  - ${doi}` };
  }

  // Get mapped RIS tag
  const risTag = NBIB_TO_RIS_TAG_MAP[tag];
  if (!risTag) {
    return null; // Skip unmapped tags
  }

  // Handle publication year (extract year only)
  if (risTag === "PY") {
    const yearMatch = value.match(/^(\d{4})/);
    return yearMatch ? { line: `PY  - ${yearMatch[1]}` } : null;
  }

  // Handle publication type
  if (risTag === "TY") {
    const risType = NBIB_PUBLICATION_TYPE_MAP[value] || "JOUR";
    return { line: `TY  - ${risType}`, isType: true };
  }

  return { line: `${risTag}  - ${value}` };
}

/**
 * Convert a single NBIB entry to RIS format
 */
function convertSingleNbibEntryToRis(entry: string): string {
  const parsed = parseNbibEntry(entry);

  if (parsed.length === 0) {
    return "";
  }

  const risLines: string[] = [];
  let hasType = false;

  for (const { tag, value } of parsed) {
    const converted = convertNbibTagToRisLine(tag, value);
    if (!converted) {
      continue;
    }

    if (converted.isType) {
      risLines.unshift(converted.line); // TY must be first
      hasType = true;
    } else {
      risLines.push(converted.line);
    }
  }

  // Add default type if not present
  if (!hasType) {
    risLines.unshift("TY  - JOUR");
  }

  // Add end record tag
  risLines.push("ER  -");

  return risLines.join("\n");
}

/**
 * Convert NBIB (PubMed MEDLINE) format to RIS format
 *
 * @param content - NBIB content string
 * @returns RIS format string
 */
export function convertNbibToRis(content: string): string {
  const trimmed = content.trim();

  if (!trimmed) {
    return "";
  }

  // Split into entries by blank lines (PMID- starts each entry)
  const entries = trimmed.split(/\n\s*\n/).filter((e) => e.trim());

  const risEntries = entries.map((entry) => convertSingleNbibEntryToRis(entry)).filter(Boolean);

  return risEntries.join("\n\n");
}

/**
 * Parse NBIB (PubMed MEDLINE) content to CSL-JSON
 *
 * Converts NBIB to RIS format first, then parses with citation-js
 *
 * @param content - NBIB content string
 * @returns Parse result with CSL-JSON items
 */
export function parseNbib(content: string): ParseResult {
  const trimmed = content.trim();

  // Handle empty input
  if (!trimmed) {
    return { success: true, items: [] };
  }

  // Convert NBIB to RIS
  const risContent = convertNbibToRis(trimmed);

  if (!risContent) {
    return {
      success: false,
      items: [],
      error: "Failed to convert NBIB to RIS: No valid entries found",
    };
  }

  // Parse the RIS content
  return parseRis(risContent);
}

/**
 * Parse content using citation-js
 */
function parseWithCitationJs(content: string, format: string): ParseResult {
  const trimmed = content.trim();

  // Handle empty input
  if (!trimmed) {
    return { success: true, items: [] };
  }

  try {
    // Parse with citation-js (auto-detection works well for bibtex/ris)
    const cite = new Cite(trimmed);

    // Get CSL-JSON output
    const items = cite.get({ format: "real", type: "json" }) as CslItem[];

    // Handle case where parsing produces no results
    if (!items || items.length === 0) {
      // Check if input looks like valid format but has no entries
      if (isEmptyFormat(trimmed, format)) {
        return { success: true, items: [] };
      }

      return {
        success: false,
        items: [],
        error: `No valid ${format.toUpperCase()} entries found`,
      };
    }

    return { success: true, items };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check if this is truly empty content (comments only for bibtex)
    if (isEmptyFormat(trimmed, format)) {
      return { success: true, items: [] };
    }

    return {
      success: false,
      items: [],
      error: `Failed to parse ${format.toUpperCase()}: ${errorMessage}`,
    };
  }
}

/**
 * Check if content is "empty" for the given format
 * (e.g., only comments for BibTeX)
 */
function isEmptyFormat(content: string, format: string): boolean {
  if (format === "bibtex") {
    // BibTeX comments start with %
    const lines = content.split("\n");
    return lines.every((line) => {
      const trimmed = line.trim();
      return trimmed === "" || trimmed.startsWith("%");
    });
  }

  return false;
}
