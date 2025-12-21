/**
 * Fetcher module for PMID and DOI metadata retrieval
 *
 * - PMID: Uses PMC Citation Exporter API (returns CSL-JSON directly)
 * - DOI: Uses citation-js plugin-doi (Cite.async)
 */

import { Cite } from "@citation-js/core";
import "@citation-js/plugin-doi";
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
 * Result of fetching a single identifier
 */
export type FetchResult = { success: true; item: CslItem } | { success: false; error: string };

/**
 * Result of fetching a PMID (includes pmid for tracking)
 */
export type PmidFetchResult =
  | { pmid: string; success: true; item: CslItem }
  | { pmid: string; success: false; error: string };

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
    };
  }
  return {
    pmid,
    success: false as const,
    error: `PMID ${pmid} not found`,
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
      };
    }

    // Validate using zod schema
    const parseResult = CslItemSchema.safeParse(rawItems[0]);
    if (!parseResult.success) {
      return {
        success: false,
        error: `Invalid CSL-JSON data for DOI ${doi}: ${parseResult.error.message}`,
      };
    }

    return { success: true, item: parseResult.data };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
