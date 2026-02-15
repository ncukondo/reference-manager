import { getRateLimiter } from "../import/rate-limiter.js";

const PUBMED_ESUMMARY_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";

export type PubmedResult =
  | { success: true; isRetracted: boolean; hasConcern: boolean }
  | { success: false; error: string };

/**
 * Query PubMed E-utilities for publication status of a PMID.
 *
 * @param pmid - The PubMed ID to query
 * @param config - Optional PubMed config (email, apiKey)
 * @returns PubMed result with retraction status
 */
/**
 * Build PubMed E-utilities esummary URL.
 */
function buildEsummaryUrl(pmid: string, config?: { email?: string; apiKey?: string }): string {
  const url = new URL(PUBMED_ESUMMARY_BASE);
  url.searchParams.set("db", "pubmed");
  url.searchParams.set("id", pmid);
  url.searchParams.set("retmode", "json");
  if (config?.email) {
    url.searchParams.set("email", config.email);
  }
  if (config?.apiKey) {
    url.searchParams.set("api_key", config.apiKey);
  }
  return url.toString();
}

export async function queryPubmed(
  pmid: string,
  config?: { email?: string; apiKey?: string }
): Promise<PubmedResult> {
  const rateLimiterConfig = config?.apiKey ? { pubmedApiKey: config.apiKey } : {};
  const rateLimiter = getRateLimiter("pubmed", rateLimiterConfig);
  await rateLimiter.acquire();

  try {
    const url = buildEsummaryUrl(pmid, config);
    const response = await fetch(url);

    if (!response.ok) {
      return {
        success: false,
        error: `PubMed API returned ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as Record<string, unknown>;
    const resultObj = data.result as Record<string, unknown> | undefined;
    const articleData = resultObj?.[pmid] as Record<string, unknown> | undefined;

    if (!articleData) {
      return { success: true, isRetracted: false, hasConcern: false };
    }

    const pubTypes = (articleData.pubtype ?? []) as string[];
    const isRetracted = pubTypes.some(
      (t) => t === "Retracted Publication" || t === "Retraction of Publication"
    );
    const hasConcern = pubTypes.some((t) => t === "Expression of Concern");

    return { success: true, isRetracted, hasConcern };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
