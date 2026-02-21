/**
 * Fetcher module for PMID and DOI metadata retrieval
 *
 * - PMID: Uses PMC Citation Exporter API (returns CSL-JSON directly)
 * - DOI: Uses citation-js plugin-doi (Cite.async)
 */

import { Cite } from "@citation-js/core";
import "@citation-js/plugin-doi";
import "@citation-js/plugin-isbn";
import { type CslItem, CslItemSchema } from "../../core/csl-json/types.js";
import { getRateLimiter } from "./rate-limiter.js";

/** PMC Citation Exporter API base URL */
const PMC_API_BASE = "https://pmc.ncbi.nlm.nih.gov/api/ctxp/v1/pubmed/";

/** Default timeout for API requests (10 seconds) */
const DEFAULT_TIMEOUT_MS = 10000;

/** DOI pattern for validation */
const DOI_PATTERN = /^10\.\d{4,}(?:\.\d+)*\/\S+$/;

/**
 * PubMed configuration for API requests
 */
export interface PubmedConfig {
  email?: string;
  apiKey?: string;
}

/**
 * Categorized failure reasons for JSON output
 */
export type FailureReason =
  | "not_found"
  | "fetch_error"
  | "parse_error"
  | "validation_error"
  | "unknown";

/**
 * Result of fetching a single identifier
 */
export type FetchResult =
  | { success: true; item: CslItem }
  | { success: false; error: string; reason: FailureReason };

/**
 * Result of fetching a PMID (includes pmid for tracking)
 */
export type PmidFetchResult =
  | { pmid: string; success: true; item: CslItem }
  | { pmid: string; success: false; error: string; reason: FailureReason };

/**
 * Results of fetching multiple PMIDs
 */
export type FetchResults = PmidFetchResult[];

/**
 * Build PMC API URL with query parameters
 */
function buildPmcUrl(pmids: string[], config: PubmedConfig): string {
  const url = new URL(PMC_API_BASE);
  url.searchParams.set("format", "csl");

  // Add each PMID as separate id parameter
  for (const pmid of pmids) {
    url.searchParams.append("id", pmid);
  }

  if (config.email) {
    url.searchParams.set("email", config.email);
  }
  if (config.apiKey) {
    url.searchParams.set("api_key", config.apiKey);
  }

  return url.toString();
}

/**
 * Extract PMID from CSL-JSON item id field
 * PMC API returns id like "pmid:12345678"
 */
function extractPmidFromId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const match = id.match(/^pmid:(\d+)$/);
  return match?.[1];
}

/**
 * Fetch metadata for multiple PMIDs from PMC Citation Exporter API
 *
 * Uses batch API endpoint: /api/ctxp/v1/pubmed/?format=csl&id=1&id=2
 */

/**
 * Parse raw API items and build maps of found items and validation errors
 */
function parseRawItems(rawItems: unknown[]): {
  foundItems: Map<string, CslItem>;
  validationErrors: Map<string, string>;
} {
  const foundItems = new Map<string, CslItem>();
  const validationErrors = new Map<string, string>();

  for (const rawItem of rawItems) {
    const parseResult = CslItemSchema.safeParse(rawItem);
    if (parseResult.success) {
      const pmid = extractPmidFromId(parseResult.data.id);
      if (pmid) {
        foundItems.set(pmid, parseResult.data);
      }
    } else {
      // Try to extract pmid even from invalid data for error reporting
      const maybeId = (rawItem as { id?: string })?.id;
      const pmid = extractPmidFromId(maybeId);
      if (pmid) {
        validationErrors.set(pmid, parseResult.error.message);
      }
    }
  }

  return { foundItems, validationErrors };
}

/**
 * Build fetch result for a single PMID
 */
function buildPmidResult(
  pmid: string,
  foundItems: Map<string, CslItem>,
  validationErrors: Map<string, string>
): PmidFetchResult {
  const item = foundItems.get(pmid);
  if (item) {
    return { pmid, success: true as const, item };
  }
  const validationError = validationErrors.get(pmid);
  if (validationError) {
    return {
      pmid,
      success: false as const,
      error: `Invalid CSL-JSON data: ${validationError}`,
      reason: "validation_error",
    };
  }
  return {
    pmid,
    success: false as const,
    error: `PMID ${pmid} not found`,
    reason: "not_found",
  };
}

export async function fetchPmids(pmids: string[], config: PubmedConfig): Promise<FetchResults> {
  // Return empty array for empty input
  if (pmids.length === 0) {
    return [];
  }

  // Apply rate limiting
  const rateLimiterConfig = config.apiKey ? { pubmedApiKey: config.apiKey } : {};
  const rateLimiter = getRateLimiter("pubmed", rateLimiterConfig);
  await rateLimiter.acquire();

  const url = buildPmcUrl(pmids, config);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Return error for all PMIDs
      const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
      return pmids.map((pmid) => ({
        pmid,
        success: false as const,
        error: errorMsg,
        reason: "fetch_error",
      }));
    }

    const data = await response.json();

    // Normalize response to array
    const rawItems: unknown[] = Array.isArray(data) ? data : [data];

    // Parse raw items and build results
    const { foundItems, validationErrors } = parseRawItems(rawItems);

    // Build results for each requested PMID
    return pmids.map((pmid) => buildPmidResult(pmid, foundItems, validationErrors));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return pmids.map((pmid) => ({
      pmid,
      success: false as const,
      error: errorMsg,
      reason: "fetch_error",
    }));
  }
}

/**
 * Fetch metadata for a DOI using citation-js
 *
 * Uses @citation-js/plugin-doi for content negotiation
 */
export async function fetchDoi(doi: string): Promise<FetchResult> {
  // Validate DOI format
  if (!DOI_PATTERN.test(doi)) {
    return {
      success: false,
      error: `Invalid DOI format: ${doi}`,
      reason: "validation_error",
    };
  }

  // Apply rate limiting (crossref)
  const rateLimiter = getRateLimiter("crossref", {});
  await rateLimiter.acquire();

  try {
    // Use citation-js Cite.async for DOI resolution
    const cite = await Cite.async(doi);
    const rawItems = cite.get({ format: "real", type: "json" });

    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return {
        success: false,
        error: `No data returned for DOI ${doi}`,
        reason: "not_found",
      };
    }

    // Validate using zod schema
    const parseResult = CslItemSchema.safeParse(rawItems[0]);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid CSL-JSON data for DOI ${doi}: ${parseResult.error.message}`,
        reason: "validation_error",
      };
    }

    return { success: true, item: parseResult.data };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
      reason: "fetch_error",
    };
  }
}

/** ISBN-10 pattern: 9 digits + (digit or X) */
const ISBN10_PATTERN = /^\d{9}[\dX]$/;

/** ISBN-13 pattern: 13 digits */
const ISBN13_PATTERN = /^\d{13}$/;

/**
 * Fetch metadata for an ISBN using Google Books API via citation-js
 *
 * @param isbn - Normalized ISBN (10 or 13 digits, no hyphens)
 * @returns FetchResult with CSL-JSON item or error
 */
export async function fetchIsbn(isbn: string): Promise<FetchResult> {
  // Validate ISBN format
  if (!ISBN10_PATTERN.test(isbn) && !ISBN13_PATTERN.test(isbn)) {
    return {
      success: false,
      error: `Invalid ISBN format: ${isbn}`,
      reason: "validation_error",
    };
  }

  // Apply rate limiting (google books - daily limit so we use a generic limiter)
  const rateLimiter = getRateLimiter("isbn", {});
  await rateLimiter.acquire();

  try {
    // Use citation-js Cite.async for ISBN resolution
    const cite = await Cite.async(isbn);
    const rawItems = cite.get({ format: "real", type: "json" });

    if (!rawItems || !Array.isArray(rawItems) || rawItems.length === 0) {
      return {
        success: false,
        error: `No data returned for ISBN ${isbn}`,
        reason: "not_found",
      };
    }

    // Validate using zod schema
    const parseResult = CslItemSchema.safeParse(rawItems[0]);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid CSL-JSON data for ISBN ${isbn}: ${parseResult.error.message}`,
        reason: "validation_error",
      };
    }

    return { success: true, item: parseResult.data };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
      reason: "fetch_error",
    };
  }
}

/** arXiv Atom API base URL */
const ARXIV_API_BASE = "http://export.arxiv.org/api/query";

/** arXiv ID pattern for validation */
const ARXIV_ID_PATTERN = /^\d{4}\.\d{4,5}(v\d+)?$/;

/**
 * Extract text content from an XML element using regex.
 * Returns empty string if not found.
 */
function extractXmlText(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`);
  const match = regex.exec(xml);
  return match?.[1]?.trim() ?? "";
}

/**
 * Extract all author names from arXiv Atom XML entry.
 */
function extractAuthors(entryXml: string): { literal: string }[] {
  const authors: { literal: string }[] = [];
  const matches = entryXml.matchAll(/<author>\s*<name>([^<]+)<\/name>\s*<\/author>/g);
  for (const match of matches) {
    const name = match[1]?.trim();
    if (name) {
      authors.push({ literal: name });
    }
  }
  return authors;
}

/**
 * Extract journal DOI from arxiv:doi element.
 */
function extractJournalDoi(entryXml: string): string | undefined {
  const match = /<arxiv:doi[^>]*>([^<]+)<\/arxiv:doi>/.exec(entryXml);
  return match?.[1]?.trim();
}

/**
 * Parse ISO date string to CSL date-parts.
 */
function parseIssuedDate(dateStr: string): { "date-parts": number[][] } | undefined {
  if (!dateStr) return undefined;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return undefined;
  return {
    "date-parts": [[date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]],
  };
}

/**
 * Fetch arXiv metadata by arXiv ID using the Atom API.
 *
 * @param arxivId - Normalized arXiv ID (e.g., "2301.13867" or "2301.13867v2")
 * @returns FetchResult with CSL-JSON item on success
 */
export async function fetchArxiv(arxivId: string): Promise<FetchResult> {
  // Validate arXiv ID format
  if (!ARXIV_ID_PATTERN.test(arxivId)) {
    return {
      success: false,
      error: `Invalid arXiv ID format: ${arxivId}`,
      reason: "validation_error",
    };
  }

  // Apply rate limiting
  const rateLimiter = getRateLimiter("arxiv", {});
  await rateLimiter.acquire();

  try {
    const url = `${ARXIV_API_BASE}?id_list=${encodeURIComponent(arxivId)}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `arXiv API returned status ${response.status}`,
        reason: "fetch_error",
      };
    }

    const xml = await response.text();

    // Check if entry exists
    const entryMatch = /<entry>([\s\S]*?)<\/entry>/.exec(xml);
    if (!entryMatch) {
      return {
        success: false,
        error: `No results found for arXiv ID ${arxivId}`,
        reason: "not_found",
      };
    }

    const entryXml = entryMatch[1] ?? "";

    // Extract metadata
    const title = extractXmlText(entryXml, "title");
    const summary = extractXmlText(entryXml, "summary");
    const published = extractXmlText(entryXml, "published");
    const authors = extractAuthors(entryXml);
    const journalDoi = extractJournalDoi(entryXml);

    // Build DOI: prefer journal DOI, fall back to arXiv DOI
    const baseId = arxivId.replace(/v\d+$/, "");
    const doi = journalDoi ?? `10.48550/arXiv.${baseId}`;

    // Build CSL-JSON item
    const item: CslItem = {
      id: "",
      type: "article",
      title,
      author: authors,
      abstract: summary || undefined,
      issued: parseIssuedDate(published),
      DOI: doi,
      URL: `https://arxiv.org/abs/${arxivId}`,
      custom: {
        arxiv_id: arxivId,
      },
    };

    // Validate using zod schema
    const parseResult = CslItemSchema.safeParse(item);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid CSL-JSON data for arXiv ${arxivId}: ${parseResult.error.message}`,
        reason: "validation_error",
      };
    }

    return { success: true, item: parseResult.data };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
      reason: "fetch_error",
    };
  }
}
