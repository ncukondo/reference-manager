import type { Page } from "playwright-core";
import type { CslItem } from "../../core/csl-json/types.js";

/** Raw metadata extracted from the page via page.evaluate() */
interface RawMetadata {
  jsonLd: unknown[];
  citation: Record<string, string | string[]>;
  dc: Record<string, string>;
  og: Record<string, string>;
  title: string;
}

/** Intermediate metadata from a single source */
interface ExtractedFields {
  title?: string;
  author?: Array<{ family?: string; given?: string; literal?: string }>;
  issued?: { "date-parts": number[][] };
  type?: string;
  DOI?: string;
  publisher?: string;
  abstract?: string;
}

// --- Schema.org @type → CSL type mapping ---

const SCHEMA_TYPE_TO_CSL: Record<string, string> = {
  Legislation: "legislation",
  LegislationObject: "legislation",
  Report: "report",
  Article: "article",
  ScholarlyArticle: "article-journal",
  NewsArticle: "article-newspaper",
  WebPage: "webpage",
};

// --- Date parsing ---

function parseDate(raw: string): { "date-parts": number[][] } | undefined {
  // Handles "2024-03-15", "2024/03/15", "2024-03", "2024"
  const cleaned = raw.replace(/\//g, "-");
  const parts = cleaned.split("-").map(Number);
  if (parts.length >= 1 && !Number.isNaN(parts[0])) {
    return { "date-parts": [parts.filter((p) => !Number.isNaN(p))] };
  }
  return undefined;
}

// --- Author name parsing ---

function parseName(name: string): {
  family?: string;
  given?: string;
  literal?: string;
} {
  const trimmed = name.trim();
  if (!trimmed) return { literal: "" };

  // "Family, Given" format
  if (trimmed.includes(",")) {
    const parts = trimmed.split(",");
    const family = parts[0] ?? "";
    const given = parts.slice(1).join(",").trim();
    const result: { family: string; given?: string } = { family: family.trim() };
    if (given) result.given = given;
    return result;
  }

  // "Given Family" format (split on last space)
  const spaceIdx = trimmed.lastIndexOf(" ");
  if (spaceIdx > 0) {
    return {
      given: trimmed.slice(0, spaceIdx),
      family: trimmed.slice(spaceIdx + 1),
    };
  }

  return { literal: trimmed };
}

// --- JSON-LD extraction ---

type JsonLdObj = Record<string, unknown>;

const PRIORITY_SCHEMA_TYPES = new Set([
  "Article",
  "ScholarlyArticle",
  "NewsArticle",
  "Report",
  "Legislation",
  "LegislationObject",
]);

function isObj(v: unknown): v is JsonLdObj {
  return v != null && typeof v === "object";
}

function findInGraph(graph: unknown[]): JsonLdObj | undefined {
  // First pass: priority types
  for (const item of graph) {
    if (!isObj(item)) continue;
    const t = item["@type"];
    if (typeof t === "string" && PRIORITY_SCHEMA_TYPES.has(t)) return item;
  }
  // Second pass: first item with a name
  for (const item of graph) {
    if (isObj(item) && item.name) return item;
  }
  return undefined;
}

function findBestJsonLdItem(jsonLdArray: unknown[]): JsonLdObj | undefined {
  for (const entry of jsonLdArray) {
    if (!isObj(entry)) continue;
    if (Array.isArray(entry["@graph"])) {
      const found = findInGraph(entry["@graph"]);
      if (found) return found;
    }
    if (entry["@type"]) return entry;
  }
  return undefined;
}

function extractJsonLdAuthor(
  rawAuthor: unknown
): Array<{ family?: string; given?: string; literal?: string }> {
  const authors = Array.isArray(rawAuthor) ? rawAuthor : [rawAuthor];
  return authors.filter(isObj).map((a) => {
    const name = typeof a.name === "string" ? a.name : "";
    if (a["@type"] === "Organization") return { literal: name };
    return parseName(name);
  });
}

function extractJsonLdPublisher(pub: unknown): string | undefined {
  if (typeof pub === "string") return pub;
  if (isObj(pub) && typeof pub.name === "string") return pub.name;
  return undefined;
}

function extractJsonLdDate(item: JsonLdObj): string | undefined {
  if (typeof item.datePublished === "string") return item.datePublished;
  if (typeof item.legislationDate === "string") return item.legislationDate;
  return undefined;
}

function extractDoi(value: unknown): string | undefined {
  if (typeof value === "string" && value.startsWith("10.")) return value;
  return undefined;
}

function setDateField(fields: ExtractedFields, dateStr: string | undefined): void {
  if (!dateStr) return;
  const parsed = parseDate(dateStr);
  if (parsed) fields.issued = parsed;
}

function extractFromJsonLd(jsonLdArray: unknown[]): ExtractedFields {
  const item = findBestJsonLdItem(jsonLdArray);
  if (!item) return {};

  const fields: ExtractedFields = {};

  if (typeof item.name === "string" && item.name) fields.title = item.name;
  if (typeof item["@type"] === "string") {
    const mapped = SCHEMA_TYPE_TO_CSL[item["@type"]];
    if (mapped) fields.type = mapped;
  }
  if (item.author) {
    const authors = extractJsonLdAuthor(item.author);
    if (authors.length) fields.author = authors;
  }
  setDateField(fields, extractJsonLdDate(item));

  const doi = extractDoi(item.identifier);
  if (doi) fields.DOI = doi;

  const pub = extractJsonLdPublisher(item.publisher);
  if (pub) fields.publisher = pub;

  if (typeof item.description === "string" && item.description) fields.abstract = item.description;

  return fields;
}

// --- citation_* extraction ---

function extractFromCitation(citation: Record<string, string | string[]>): ExtractedFields {
  const fields: ExtractedFields = {};

  if (typeof citation.citation_title === "string" && citation.citation_title) {
    fields.title = citation.citation_title;
  }

  // Authors (can be string or string[])
  const rawAuthors = citation.citation_author;
  if (rawAuthors) {
    const authorList = Array.isArray(rawAuthors) ? rawAuthors : [rawAuthors];
    fields.author = authorList.map((a) => parseName(a));
  }

  // Date
  const dateStr =
    (typeof citation.citation_date === "string" ? citation.citation_date : undefined) ||
    (typeof citation.citation_publication_date === "string"
      ? citation.citation_publication_date
      : undefined);
  setDateField(fields, dateStr);

  // DOI
  if (typeof citation.citation_doi === "string" && citation.citation_doi) {
    fields.DOI = citation.citation_doi;
  }

  // Publisher / journal
  if (typeof citation.citation_journal_title === "string" && citation.citation_journal_title) {
    fields.publisher = citation.citation_journal_title;
  }

  return fields;
}

// --- Dublin Core extraction ---

function extractFromDublinCore(dc: Record<string, string>): ExtractedFields {
  const fields: ExtractedFields = {};

  if (dc["DC.title"]) fields.title = dc["DC.title"];

  if (dc["DC.creator"]) {
    fields.author = [parseName(dc["DC.creator"])];
  }

  setDateField(fields, dc["DC.date"]);

  if (dc["DC.publisher"]) fields.publisher = dc["DC.publisher"];
  if (dc["DC.description"]) fields.abstract = dc["DC.description"];

  const doi = extractDoi(dc["DC.identifier"]);
  if (doi) fields.DOI = doi;

  return fields;
}

// --- Open Graph extraction ---

function extractFromOpenGraph(og: Record<string, string>): ExtractedFields {
  const fields: ExtractedFields = {};

  if (og["og:title"]) fields.title = og["og:title"];
  if (og["og:description"]) fields.abstract = og["og:description"];

  return fields;
}

// --- Merge ---

const SIMPLE_KEYS = ["title", "type", "DOI", "publisher", "abstract"] as const;

function mergeFields(...sources: ExtractedFields[]): ExtractedFields {
  const merged: ExtractedFields = {};

  for (const key of SIMPLE_KEYS) {
    const source = sources.find((s) => s[key]);
    if (source?.[key]) (merged as Record<string, string>)[key] = source[key];
  }

  const authorSource = sources.find((s) => s.author?.length);
  if (authorSource?.author) merged.author = authorSource.author;
  const issuedSource = sources.find((s) => s.issued);
  if (issuedSource?.issued) merged.issued = issuedSource.issued;

  return merged;
}

// --- Main ---

/**
 * Extract metadata from a browser page using multiple sources.
 *
 * Priority: JSON-LD → citation_* → Dublin Core → Open Graph → HTML
 */
export async function extractMetadata(page: Page): Promise<CslItem> {
  // page.evaluate runs in the browser context where document is available.
  // Use string template to avoid TypeScript DOM reference errors.
  const rawMeta: RawMetadata = await page.evaluate(`
    (() => {
      const jsonLd = [...document.querySelectorAll('script[type="application/ld+json"]')]
        .map(el => { try { return JSON.parse(el.textContent || ""); } catch { return null; } })
        .filter(Boolean);

      const citationMulti = {};
      for (const el of document.querySelectorAll('meta[name^="citation_"]')) {
        const name = el.getAttribute("name") || "";
        const content = el.getAttribute("content") || "";
        if (!citationMulti[name]) citationMulti[name] = [];
        citationMulti[name].push(content);
      }
      const citation = {};
      for (const [key, values] of Object.entries(citationMulti)) {
        citation[key] = values.length === 1 ? values[0] : values;
      }

      const dc = Object.fromEntries(
        [...document.querySelectorAll('meta[name^="DC."]')]
          .map(el => [el.getAttribute("name"), el.getAttribute("content")]));
      const og = Object.fromEntries(
        [...document.querySelectorAll('meta[property^="og:"]')]
          .map(el => [el.getAttribute("property"), el.getAttribute("content")]));
      return { jsonLd, citation, dc, og, title: document.title };
    })()
  `);

  const pageUrl = page.url();

  // Extract from each source
  const jsonLdFields = extractFromJsonLd(rawMeta.jsonLd);
  const citationFields = extractFromCitation(rawMeta.citation);
  const dcFields = extractFromDublinCore(rawMeta.dc);
  const ogFields = extractFromOpenGraph(rawMeta.og);
  const htmlFields: ExtractedFields = {};
  if (rawMeta.title) htmlFields.title = rawMeta.title;

  // Merge with priority: JSON-LD → citation_* → DC → OG → HTML
  const merged = mergeFields(jsonLdFields, citationFields, dcFields, ogFields, htmlFields);

  const now = new Date();
  const accessed = {
    "date-parts": [[now.getFullYear(), now.getMonth() + 1, now.getDate()]],
  };

  const item: CslItem = {
    id: "",
    type: merged.type || "webpage",
    title: merged.title || pageUrl,
    URL: pageUrl,
    accessed,
  };

  if (merged.author?.length) item.author = merged.author;
  if (merged.issued) item.issued = merged.issued;
  if (merged.DOI) item.DOI = merged.DOI;
  if (merged.publisher) item.publisher = merged.publisher;
  if (merged.abstract) item.abstract = merged.abstract;

  return item;
}
