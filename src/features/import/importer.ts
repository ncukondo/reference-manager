/**
 * Importer orchestration module
 *
 * Coordinates format detection, parsing, and fetching to import references
 * from various input formats.
 */

import { existsSync, readFileSync } from "node:fs";
import type { CslItem } from "../../core/csl-json/types.js";
import { CslItemSchema } from "../../core/csl-json/types.js";
import {
  cacheArxivResult,
  cacheDoiResult,
  cacheIsbnResult,
  cachePmidResult,
  getArxivFromCache,
  getDoiFromCache,
  getIsbnFromCache,
  getPmidFromCache,
} from "./cache.js";
import { detectByContent, detectByExtension, isArxiv, isDoi, isIsbn, isPmid } from "./detector.js";
import type { InputFormat } from "./detector.js";
import { fetchArxiv, fetchDoi, fetchIsbn, fetchPmids } from "./fetcher.js";
import type { FailureReason, PubmedConfig } from "./fetcher.js";
import { normalizeArxiv, normalizeDoi, normalizeIsbn, normalizePmid } from "./normalizer.js";
import { parseBibtex, parseNbib, parseRis } from "./parser.js";

// Re-export FailureReason for external use
export type { FailureReason } from "./fetcher.js";

/**
 * Result of importing a single item
 */
export type ImportItemResult =
  | { success: true; item: CslItem; source: string }
  | { success: false; error: string; source: string; reason: FailureReason };

/**
 * Result of an import operation
 */
export interface ImportResult {
  results: ImportItemResult[];
}

/**
 * Options for import operations
 */
export interface ImportOptions {
  pubmedConfig?: PubmedConfig;
}

/**
 * Classified identifiers
 */
interface ClassifiedIdentifiers {
  pmids: string[];
  dois: string[];
  isbns: string[];
  arxivs: string[];
  unknowns: string[];
}

/**
 * Classify identifiers into PMIDs, DOIs, and unknowns
 */
function classifyIdentifiers(identifiers: string[]): ClassifiedIdentifiers {
  const pmids: string[] = [];
  const dois: string[] = [];
  const isbns: string[] = [];
  const arxivs: string[] = [];
  const unknowns: string[] = [];

  for (const id of identifiers) {
    if (isDoi(id)) {
      dois.push(normalizeDoi(id));
    } else if (isArxiv(id)) {
      arxivs.push(normalizeArxiv(id));
    } else if (isIsbn(id)) {
      isbns.push(normalizeIsbn(id));
    } else if (isPmid(id)) {
      pmids.push(normalizePmid(id));
    } else {
      unknowns.push(id);
    }
  }

  return { pmids, dois, isbns, arxivs, unknowns };
}

/**
 * Build error results for unknown identifiers
 */
function buildUnknownResults(unknowns: string[]): ImportItemResult[] {
  return unknowns.map((unknown) => ({
    success: false as const,
    error: `Cannot interpret '${unknown}' as identifier (not a valid PMID or DOI)`,
    source: unknown,
    reason: "validation_error" as const,
  }));
}

/**
 * Clear the id from a fetched item to force regeneration using author-year format
 * Identifiers (PMID, DOI, ISBN) from APIs may have non-standard IDs that should not be used
 */
function clearItemId(item: CslItem): CslItem {
  const { id: _ignored, ...rest } = item;
  return { ...rest, id: "" };
}

/**
 * Fetch PMIDs with cache support
 */
async function fetchPmidsWithCache(
  pmids: string[],
  pubmedConfig: PubmedConfig
): Promise<ImportItemResult[]> {
  const results: ImportItemResult[] = [];
  const pmidsToFetch: string[] = [];

  // Check cache first
  for (const pmid of pmids) {
    const cached = getPmidFromCache(pmid);
    if (cached) {
      results.push({ success: true, item: clearItemId(cached), source: pmid });
    } else {
      pmidsToFetch.push(pmid);
    }
  }

  // Fetch uncached PMIDs
  if (pmidsToFetch.length > 0) {
    const fetchResults = await fetchPmids(pmidsToFetch, pubmedConfig);
    for (const fetchResult of fetchResults) {
      if (fetchResult.success) {
        cachePmidResult(fetchResult.pmid, fetchResult.item);
        results.push({
          success: true,
          item: clearItemId(fetchResult.item),
          source: fetchResult.pmid,
        });
      } else {
        results.push({
          success: false,
          error: fetchResult.error,
          source: fetchResult.pmid,
          reason: fetchResult.reason,
        });
      }
    }
  }

  return results;
}

/**
 * Fetch DOIs with cache support
 */
async function fetchDoisWithCache(dois: string[]): Promise<ImportItemResult[]> {
  const results: ImportItemResult[] = [];

  for (const doi of dois) {
    const cached = getDoiFromCache(doi);
    if (cached) {
      results.push({ success: true, item: clearItemId(cached), source: doi });
      continue;
    }

    const fetchResult = await fetchDoi(doi);
    if (fetchResult.success) {
      cacheDoiResult(doi, fetchResult.item);
      results.push({ success: true, item: clearItemId(fetchResult.item), source: doi });
    } else {
      results.push({
        success: false,
        error: fetchResult.error,
        source: doi,
        reason: fetchResult.reason,
      });
    }
  }

  return results;
}

/**
 * Fetch ISBNs with caching
 */
async function fetchIsbnsWithCache(isbns: string[]): Promise<ImportItemResult[]> {
  const results: ImportItemResult[] = [];

  for (const isbn of isbns) {
    const cached = getIsbnFromCache(isbn);
    if (cached) {
      results.push({ success: true, item: clearItemId(cached), source: isbn });
      continue;
    }

    const fetchResult = await fetchIsbn(isbn);
    if (fetchResult.success) {
      cacheIsbnResult(isbn, fetchResult.item);
      results.push({ success: true, item: clearItemId(fetchResult.item), source: isbn });
    } else {
      results.push({
        success: false,
        error: fetchResult.error,
        source: isbn,
        reason: fetchResult.reason,
      });
    }
  }

  return results;
}

/**
 * Fetch arXiv IDs with cache support
 */
async function fetchArxivsWithCache(arxivIds: string[]): Promise<ImportItemResult[]> {
  const results: ImportItemResult[] = [];

  for (const arxivId of arxivIds) {
    const cached = getArxivFromCache(arxivId);
    if (cached) {
      results.push({ success: true, item: clearItemId(cached), source: arxivId });
      continue;
    }

    const fetchResult = await fetchArxiv(arxivId);
    if (fetchResult.success) {
      cacheArxivResult(arxivId, fetchResult.item);
      results.push({ success: true, item: clearItemId(fetchResult.item), source: arxivId });
    } else {
      results.push({
        success: false,
        error: fetchResult.error,
        source: arxivId,
        reason: fetchResult.reason,
      });
    }
  }

  return results;
}

/**
 * Parse JSON content and return import result
 */
function parseJsonContent(content: string): ImportResult {
  try {
    const parsed = JSON.parse(content);
    const items: unknown[] = Array.isArray(parsed) ? parsed : [parsed];

    if (items.length === 0) {
      return { results: [] };
    }

    const results: ImportItemResult[] = [];
    for (const item of items) {
      const parseResult = CslItemSchema.safeParse(item);
      if (parseResult.success) {
        results.push({ success: true, item: parseResult.data, source: "json" });
      } else {
        results.push({
          success: false,
          error: `Invalid CSL-JSON: ${parseResult.error.message}`,
          source: "json",
          reason: "validation_error",
        });
      }
    }
    return { results };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      results: [
        {
          success: false,
          error: `Failed to parse JSON: ${message}`,
          source: "json",
          reason: "parse_error",
        },
      ],
    };
  }
}

/**
 * Parse BibTeX content and return import result
 */
function parseBibtexContent(content: string): ImportResult {
  const parseResult = parseBibtex(content);

  if (!parseResult.success) {
    return {
      results: [
        {
          success: false,
          error: parseResult.error ?? "Failed to parse BibTeX",
          source: "bibtex",
          reason: "parse_error",
        },
      ],
    };
  }

  if (parseResult.items.length === 0) {
    return { results: [] };
  }

  return {
    results: parseResult.items.map((item) => ({
      success: true as const,
      item,
      source: "bibtex",
    })),
  };
}

/**
 * Parse RIS content and return import result
 */
function parseRisContent(content: string): ImportResult {
  const parseResult = parseRis(content);

  if (!parseResult.success) {
    return {
      results: [
        {
          success: false,
          error: parseResult.error ?? "Failed to parse RIS",
          source: "ris",
          reason: "parse_error",
        },
      ],
    };
  }

  if (parseResult.items.length === 0) {
    return { results: [] };
  }

  return {
    results: parseResult.items.map((item) => ({
      success: true as const,
      item,
      source: "ris",
    })),
  };
}

/**
 * Parse NBIB content and return import result
 */
function parseNbibContent(content: string): ImportResult {
  const parseResult = parseNbib(content);

  if (!parseResult.success) {
    return {
      results: [
        {
          success: false,
          error: parseResult.error ?? "Failed to parse NBIB",
          source: "nbib",
          reason: "parse_error",
        },
      ],
    };
  }

  if (parseResult.items.length === 0) {
    return { results: [] };
  }

  return {
    results: parseResult.items.map((item) => ({
      success: true as const,
      item,
      source: "nbib",
    })),
  };
}

/**
 * Import references from content string
 *
 * @param content - The content to parse
 * @param format - The format of the content (or "auto" for detection)
 * @param options - Import options
 * @returns Import result with parsed items
 */
export async function importFromContent(
  content: string,
  format: InputFormat | "auto",
  _options: ImportOptions
): Promise<ImportResult> {
  // Determine the actual format
  let actualFormat: InputFormat;
  if (format === "auto") {
    actualFormat = detectByContent(content);
    if (actualFormat === "unknown") {
      return {
        results: [
          {
            success: false,
            error: "Cannot detect input format. Use --format to specify explicitly.",
            source: "content",
            reason: "validation_error",
          },
        ],
      };
    }
  } else {
    actualFormat = format;
  }

  // Parse based on format
  switch (actualFormat) {
    case "json":
      return parseJsonContent(content);
    case "bibtex":
      return parseBibtexContent(content);
    case "ris":
      return parseRisContent(content);
    case "nbib":
      return parseNbibContent(content);
    default:
      return {
        results: [
          {
            success: false,
            error: `Unsupported format for content parsing: ${actualFormat}`,
            source: "content",
            reason: "validation_error",
          },
        ],
      };
  }
}

/**
 * Import references from identifier strings (PMID or DOI)
 *
 * @param identifiers - Array of identifier strings
 * @param options - Import options (requires pubmedConfig for PMID fetching)
 * @returns Import result with fetched items
 */
export async function importFromIdentifiers(
  identifiers: string[],
  options: ImportOptions
): Promise<ImportResult> {
  if (identifiers.length === 0) {
    return { results: [] };
  }

  // Classify identifiers
  const { pmids, dois, isbns, arxivs, unknowns } = classifyIdentifiers(identifiers);

  // Collect results
  const results: ImportItemResult[] = [];

  // Add errors for unknown identifiers
  results.push(...buildUnknownResults(unknowns));

  // Fetch PMIDs with cache
  const pmidResults = await fetchPmidsWithCache(pmids, options.pubmedConfig ?? {});
  results.push(...pmidResults);

  // Fetch DOIs with cache
  const doiResults = await fetchDoisWithCache(dois);
  results.push(...doiResults);

  // Fetch ISBNs with cache
  const isbnResults = await fetchIsbnsWithCache(isbns);
  results.push(...isbnResults);

  // Fetch arXiv IDs with cache
  const arxivResults = await fetchArxivsWithCache(arxivs);
  results.push(...arxivResults);

  return { results };
}

/**
 * Options for importFromInputs
 */
export interface ImportInputsOptions extends ImportOptions {
  /** Explicit format specification (default: auto) */
  format?: InputFormat | "auto";
  /** Content from stdin (if provided, processed before file/identifier inputs) */
  stdinContent?: string;
}

/**
 * Unified entry point for importing references from file paths or identifiers
 *
 * Classifies inputs as files or identifiers:
 * - If path exists as file → read and parse
 * - If path does not exist → interpret as identifier (PMID/DOI)
 *
 * @param inputs - Array of file paths or identifier strings
 * @param options - Import options including format specification
 * @returns Import result with all parsed/fetched items
 */

/**
 * Check if input looks like a file path (has file-like extension)
 */
function looksLikeFilePath(input: string): boolean {
  const fileExtensions = [".json", ".bib", ".ris", ".txt", ".xml", ".yaml", ".yml"];
  const lowerInput = input.toLowerCase();
  return fileExtensions.some((ext) => lowerInput.endsWith(ext));
}

/**
 * Process a single file input
 */
async function processFile(
  filePath: string,
  options: ImportInputsOptions
): Promise<ImportItemResult[]> {
  try {
    const content = readFileSync(filePath, "utf-8");

    // Determine format
    let format: InputFormat | "auto";
    if (options.format && options.format !== "auto") {
      format = options.format;
    } else {
      // Try extension first
      const extFormat = detectByExtension(filePath);
      format = extFormat !== "unknown" ? extFormat : "auto";
    }

    const result = await importFromContent(content, format, options);

    // Update source to be the file path
    return result.results.map((r) => ({
      ...r,
      source: filePath,
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      {
        success: false,
        error: `Failed to read file: ${message}`,
        source: filePath,
        reason: "fetch_error",
      },
    ];
  }
}

/**
 * Process identifier inputs (PMID/DOI)
 */
async function processIdentifiers(
  inputs: string[],
  options: ImportInputsOptions
): Promise<ImportItemResult[]> {
  const results: ImportItemResult[] = [];
  const validIdentifiers: string[] = [];

  // Separate valid identifiers from invalid inputs
  for (const input of inputs) {
    // Check if it's a valid identifier
    const isValidPmid = isPmid(input);
    const isValidDoi = isDoi(input);
    const isValidIsbn = isIsbn(input);
    const isValidArxiv = isArxiv(input);

    if (isValidPmid || isValidDoi || isValidIsbn || isValidArxiv) {
      validIdentifiers.push(input);
    } else {
      // Not a valid identifier
      const hint = looksLikeFilePath(input)
        ? " Hint: If this is a file path, check that the file exists."
        : "";
      results.push({
        success: false,
        error: `Cannot interpret '${input}' as identifier (not a valid PMID, DOI, ISBN, or arXiv ID).${hint}`,
        source: input,
        reason: "validation_error",
      });
    }
  }

  // Fetch valid identifiers
  if (validIdentifiers.length > 0) {
    const fetchResult = await importFromIdentifiers(validIdentifiers, options);
    results.push(...fetchResult.results);
  }

  return results;
}

export async function importFromInputs(
  inputs: string[],
  options: ImportInputsOptions
): Promise<ImportResult> {
  const allResults: ImportItemResult[] = [];

  // Process stdinContent if provided
  if (options.stdinContent?.trim()) {
    const stdinResults = await processStdinContent(options.stdinContent, options);
    allResults.push(...stdinResults);
  }

  // Process file/identifier inputs
  if (inputs.length > 0) {
    const identifiersToFetch: string[] = [];

    // Process each input
    for (const input of inputs) {
      if (existsSync(input)) {
        // Input is an existing file
        const fileResults = await processFile(input, options);
        allResults.push(...fileResults);
      } else {
        // Input does not exist as file - treat as potential identifier
        identifiersToFetch.push(input);
      }
    }

    // Process identifiers
    if (identifiersToFetch.length > 0) {
      const identifierResults = await processIdentifiers(identifiersToFetch, options);
      allResults.push(...identifierResults);
    }
  }

  return { results: allResults };
}

/**
 * Process stdin content based on format detection
 * - For file formats (json/bibtex/ris): parse directly
 * - For identifier formats (pmid/doi) or auto with identifiers: split and process
 */
async function processStdinContent(
  content: string,
  options: ImportInputsOptions
): Promise<ImportItemResult[]> {
  const format = options.format || "auto";

  // If explicit file format specified, parse as content
  if (format === "json" || format === "bibtex" || format === "ris" || format === "nbib") {
    const result = await importFromContent(content, format, options);
    return result.results.map((r) => ({
      ...r,
      source: r.source === "content" ? "stdin" : r.source,
    }));
  }

  // If explicit identifier format, split and process
  if (format === "pmid" || format === "doi" || format === "isbn" || format === "arxiv") {
    const identifiers = content.split(/\s+/).filter((s) => s.length > 0);
    return processIdentifiers(identifiers, options);
  }

  // Auto-detect format from content
  const detectedFormat = detectByContent(content);

  if (
    detectedFormat === "json" ||
    detectedFormat === "bibtex" ||
    detectedFormat === "ris" ||
    detectedFormat === "nbib"
  ) {
    // File format detected - parse as content
    const result = await importFromContent(content, detectedFormat, options);
    return result.results.map((r) => ({
      ...r,
      source: r.source === "content" ? "stdin" : r.source,
    }));
  }

  // Not a file format - treat as whitespace-separated identifiers
  const identifiers = content.split(/\s+/).filter((s) => s.length > 0);
  if (identifiers.length === 0) {
    return [];
  }

  return processIdentifiers(identifiers, options);
}
