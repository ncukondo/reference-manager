/**
 * Importer orchestration module
 *
 * Coordinates format detection, parsing, and fetching to import references
 * from various input formats.
 */

import { existsSync, readFileSync } from "node:fs";
import type { CslItem } from "../../core/csl-json/types.js";
import { CslItemSchema } from "../../core/csl-json/types.js";
import { cacheDoiResult, cachePmidResult, getDoiFromCache, getPmidFromCache } from "./cache.js";
import { detectByContent, detectByExtension, isDoi, isPmid } from "./detector.js";
import type { InputFormat } from "./detector.js";
import { fetchDoi, fetchPmids } from "./fetcher.js";
import type { PubmedConfig } from "./fetcher.js";
import { normalizeDoi } from "./normalizer.js";
import { parseBibtex, parseRis } from "./parser.js";

/**
 * Result of importing a single item
 */
export type ImportItemResult =
  | { success: true; item: CslItem; source: string }
  | { success: false; error: string; source: string };

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
  unknowns: string[];
}

/**
 * Classify identifiers into PMIDs, DOIs, and unknowns
 */
function classifyIdentifiers(identifiers: string[]): ClassifiedIdentifiers {
  const pmids: string[] = [];
  const dois: string[] = [];
  const unknowns: string[] = [];

  for (const id of identifiers) {
    if (isPmid(id)) {
      pmids.push(id);
    } else if (isDoi(id)) {
      dois.push(normalizeDoi(id));
    } else {
      unknowns.push(id);
    }
  }

  return { pmids, dois, unknowns };
}

/**
 * Build error results for unknown identifiers
 */
function buildUnknownResults(unknowns: string[]): ImportItemResult[] {
  return unknowns.map((unknown) => ({
    success: false as const,
    error: `Cannot interpret '${unknown}' as identifier (not a valid PMID or DOI)`,
    source: unknown,
  }));
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
      results.push({ success: true, item: cached, source: pmid });
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
          item: fetchResult.item,
          source: fetchResult.pmid,
        });
      } else {
        results.push({
          success: false,
          error: fetchResult.error,
          source: fetchResult.pmid,
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
      results.push({ success: true, item: cached, source: doi });
      continue;
    }

    const fetchResult = await fetchDoi(doi);
    if (fetchResult.success) {
      cacheDoiResult(doi, fetchResult.item);
      results.push({ success: true, item: fetchResult.item, source: doi });
    } else {
      results.push({ success: false, error: fetchResult.error, source: doi });
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
        });
      }
    }
    return { results };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      results: [{ success: false, error: `Failed to parse JSON: ${message}`, source: "json" }],
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
        { success: false, error: parseResult.error ?? "Failed to parse BibTeX", source: "bibtex" },
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
        { success: false, error: parseResult.error ?? "Failed to parse RIS", source: "ris" },
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
    default:
      return {
        results: [
          {
            success: false,
            error: `Unsupported format for content parsing: ${actualFormat}`,
            source: "content",
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
  const { pmids, dois, unknowns } = classifyIdentifiers(identifiers);

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

  return { results };
}

/**
 * Options for importFromInputs
 */
export interface ImportInputsOptions extends ImportOptions {
  /** Explicit format specification (default: auto) */
  format?: InputFormat | "auto";
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

    if (isValidPmid || isValidDoi) {
      validIdentifiers.push(input);
    } else {
      // Not a valid identifier
      const hint = looksLikeFilePath(input)
        ? " Hint: If this is a file path, check that the file exists."
        : "";
      results.push({
        success: false,
        error: `Cannot interpret '${input}' as identifier (not a valid PMID or DOI).${hint}`,
        source: input,
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
  if (inputs.length === 0) {
    return { results: [] };
  }

  const allResults: ImportItemResult[] = [];
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

  return { results: allResults };
}
