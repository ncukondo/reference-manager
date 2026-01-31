/**
 * URL Resolution Module
 *
 * Resolves URLs from CslItem fields (DOI, URL, PMID, PMCID, additional_urls).
 * Priority order: DOI > URL > PMID > PMCID > additional_urls
 */

import type { CslItem } from "../../core/csl-json/types.js";

export type UrlType = "doi" | "url" | "pubmed" | "pmcid";

/**
 * Build a URL from a DOI value.
 */
function buildDoiUrl(doi: string): string {
  return `https://doi.org/${doi}`;
}

/**
 * Build a PubMed URL from a PMID value.
 */
function buildPubmedUrl(pmid: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}

/**
 * Build a PMC URL from a PMCID value.
 */
function buildPmcUrl(pmcid: string): string {
  return `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`;
}

/**
 * Resolve all URLs from a CslItem in priority order.
 * DOI > URL > PMID > PMCID > custom.additional_urls
 */
export function resolveAllUrls(item: CslItem): string[] {
  const urls: string[] = [];

  if (item.DOI) {
    urls.push(buildDoiUrl(item.DOI));
  }
  if (item.URL) {
    urls.push(item.URL);
  }
  if (item.PMID) {
    urls.push(buildPubmedUrl(item.PMID));
  }
  if (item.PMCID) {
    urls.push(buildPmcUrl(item.PMCID));
  }

  const additionalUrls = item.custom?.additional_urls;
  if (additionalUrls && additionalUrls.length > 0) {
    urls.push(...additionalUrls);
  }

  return urls;
}

/**
 * Resolve the best (default) URL from a CslItem by priority.
 * Returns the first available URL in priority order, or null if none.
 */
export function resolveDefaultUrl(item: CslItem): string | null {
  if (item.DOI) {
    return buildDoiUrl(item.DOI);
  }
  if (item.URL) {
    return item.URL;
  }
  if (item.PMID) {
    return buildPubmedUrl(item.PMID);
  }
  if (item.PMCID) {
    return buildPmcUrl(item.PMCID);
  }

  const additionalUrls = item.custom?.additional_urls;
  if (additionalUrls && additionalUrls.length > 0) {
    return additionalUrls[0] ?? null;
  }

  return null;
}

/**
 * Resolve a URL of a specific type from a CslItem.
 * Returns null if the requested type is not available.
 */
export function resolveUrlByType(item: CslItem, type: UrlType): string | null {
  switch (type) {
    case "doi":
      return item.DOI ? buildDoiUrl(item.DOI) : null;
    case "url":
      return item.URL ?? null;
    case "pubmed":
      return item.PMID ? buildPubmedUrl(item.PMID) : null;
    case "pmcid":
      return item.PMCID ? buildPmcUrl(item.PMCID) : null;
  }
}
