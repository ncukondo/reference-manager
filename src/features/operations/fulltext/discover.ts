/**
 * Fulltext OA discovery operation.
 *
 * Discovers open access availability for a reference by checking
 * multiple sources (Unpaywall, PMC, arXiv, CORE).
 */

import {
  type DiscoveryArticle,
  type DiscoveryConfig,
  type OALocation,
  type OAStatus,
  discoverOA,
} from "@ncukondo/academic-fulltext";
import type { FulltextConfig } from "../../../config/schema.js";
import type { IdentifierType } from "../../../core/library-interface.js";
import type { ILibrary } from "../../../core/library-interface.js";

export interface FulltextDiscoverOptions {
  /** Reference identifier (id or uuid) */
  identifier: string;
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType | undefined;
  /** Fulltext configuration */
  fulltextConfig: FulltextConfig;
}

export interface FulltextDiscoverResult {
  success: boolean;
  error?: string;
  /** The reference ID used for display */
  referenceId?: string;
  /** OA status */
  oaStatus?: OAStatus;
  /** Discovered OA locations */
  locations?: OALocation[];
  /** Source-level errors (non-fatal) */
  errors?: Array<{ source: string; error: string }>;
}

export async function fulltextDiscover(
  library: ILibrary,
  options: FulltextDiscoverOptions
): Promise<FulltextDiscoverResult> {
  const { identifier, idType = "id", fulltextConfig } = options;

  // Resolve reference
  const item = await library.find(identifier, { idType });
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  // Extract identifiers
  const doi = item.DOI;
  const pmid = item.PMID;
  const pmcid = item.PMCID;

  if (!doi && !pmid) {
    return {
      success: false,
      error: `No DOI or PMID found for ${identifier}. Cannot discover OA sources.`,
    };
  }

  // Build article object for discovery
  const article: DiscoveryArticle = {};
  if (doi) article.doi = doi;
  if (pmid) article.pmid = pmid;
  if (pmcid) article.pmcid = pmcid;

  // Build discovery config
  const config: DiscoveryConfig = {
    unpaywallEmail: fulltextConfig.sources.unpaywallEmail ?? "",
    coreApiKey: fulltextConfig.sources.coreApiKey ?? "",
    preferSources: fulltextConfig.preferSources,
  };

  const result = await discoverOA(article, config);

  const discoverResult: FulltextDiscoverResult = {
    success: true,
    referenceId: item.id,
    oaStatus: result.oaStatus,
    locations: result.locations,
  };
  if (result.errors.length > 0) {
    discoverResult.errors = result.errors;
  }
  return discoverResult;
}
