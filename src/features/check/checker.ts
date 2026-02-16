import type { CslItem } from "../../core/csl-json/types.js";
import type { CrossrefMetadata, CrossrefUpdateInfo } from "./crossref-client.js";
import type { CheckFinding, CheckResult } from "./types.js";

export interface CheckConfig {
  email?: string;
  pubmed?: { email?: string; apiKey?: string };
  metadata?: boolean;
}

interface CrossrefCheckResult {
  findings: CheckFinding[];
  metadata?: CrossrefMetadata;
}

/**
 * Check a single reference against external sources for status changes.
 *
 * @param item - The CSL-JSON item to check
 * @param config - Optional config for API credentials
 * @returns Check result with findings
 */
export async function checkReference(item: CslItem, config?: CheckConfig): Promise<CheckResult> {
  const id = item.id;
  const uuid = (item.custom?.uuid as string) ?? "";
  const checkedAt = new Date().toISOString();
  const findings: CheckFinding[] = [];
  const checkedSources: string[] = [];

  const hasDoi = !!item.DOI;
  const hasPmid = !!item.PMID;

  // Skip references with neither DOI nor PMID
  if (!hasDoi && !hasPmid) {
    return { id, uuid, status: "skipped", findings: [], checkedAt, checkedSources: [] };
  }

  let crossrefMetadata: CrossrefMetadata | undefined;

  // Query Crossref if DOI is present
  if (hasDoi) {
    checkedSources.push("crossref");
    const crossrefResult = await checkCrossref(item.DOI as string, config);
    findings.push(...crossrefResult.findings);
    crossrefMetadata = crossrefResult.metadata;
  }

  // Query PubMed if PMID is present
  if (hasPmid) {
    checkedSources.push("pubmed");
    const pubmedFindings = await checkPubmed(item.PMID as string, config);
    addUniqueFindings(findings, pubmedFindings);
  }

  // Metadata comparison (default: enabled)
  const metadataFinding = await checkMetadata(item, config, crossrefMetadata, hasPmid, hasDoi);
  if (metadataFinding) {
    findings.push(metadataFinding);
  }

  const status = findings.length > 0 ? "warning" : "ok";
  return { id, uuid, status, findings, checkedAt, checkedSources };
}

/**
 * Add findings that aren't already present (by type) to the target list.
 */
function addUniqueFindings(target: CheckFinding[], source: CheckFinding[]): void {
  for (const finding of source) {
    if (!target.some((f) => f.type === finding.type)) {
      target.push(finding);
    }
  }
}

/**
 * Perform metadata comparison if enabled.
 */
async function checkMetadata(
  item: CslItem,
  config: CheckConfig | undefined,
  crossrefMetadata: CrossrefMetadata | undefined,
  hasPmid: boolean,
  hasDoi: boolean
): Promise<CheckFinding | null> {
  if (config?.metadata === false) return null;

  if (crossrefMetadata) {
    // DOI-based: compare against Crossref metadata
    return compareItemMetadata(item, crossrefMetadata);
  }

  if (hasPmid && !hasDoi) {
    // PubMed-only: fetch remote CSL-JSON via PubMed and compare
    return comparePubmedMetadata(item, config);
  }

  return null;
}

/**
 * Query Crossref and return findings plus metadata.
 */
async function checkCrossref(doi: string, config?: CheckConfig): Promise<CrossrefCheckResult> {
  const { queryCrossref } = await import("./crossref-client.js");
  const crossrefConfig = config?.email ? { email: config.email } : undefined;
  const result = await queryCrossref(doi, crossrefConfig);
  if (!result.success) return { findings: [] };

  const findings: CheckFinding[] = [];
  for (const update of result.updates) {
    const finding = mapCrossrefUpdate(update);
    if (finding) {
      findings.push(finding);
    }
  }
  return result.metadata ? { findings, metadata: result.metadata } : { findings };
}

/**
 * Compare item metadata against Crossref metadata.
 */
async function compareItemMetadata(
  item: CslItem,
  remoteMetadata: CrossrefMetadata
): Promise<CheckFinding | null> {
  const { compareMetadata } = await import("./metadata-comparator.js");

  const local = extractLocalMetadata(item);
  const comparison = compareMetadata(local, remoteMetadata);

  if (comparison.classification === "no_change") return null;

  const type = comparison.classification;
  const message =
    type === "metadata_mismatch"
      ? "Local metadata significantly differs from the remote record"
      : "Remote metadata has been updated since import";

  return {
    type,
    message,
    details: {
      updatedFields: comparison.changedFields,
      fieldDiffs: comparison.fieldDiffs,
    },
  };
}

/**
 * Fetch PubMed CSL-JSON and compare metadata for PMID-only references.
 */
async function comparePubmedMetadata(
  item: CslItem,
  config?: CheckConfig
): Promise<CheckFinding | null> {
  const { fetchPmids } = await import("../import/fetcher.js");
  const pubmedConfig = config?.pubmed ?? {};
  const results = await fetchPmids([item.PMID as string], pubmedConfig);
  const result = results[0];
  if (!result || !result.success) return null;

  const remoteMetadata = cslItemToRemoteMetadata(result.item);
  return compareItemMetadata(item, remoteMetadata);
}

/**
 * Convert a CslItem (from PubMed) to CrossrefMetadata format for comparison.
 */
function cslItemToRemoteMetadata(item: CslItem): CrossrefMetadata {
  const metadata: CrossrefMetadata = {};
  if (item.title !== undefined) metadata.title = item.title;
  if (item.author !== undefined) {
    metadata.author = item.author as Array<{ family?: string; given?: string }>;
  }
  if (item["container-title"] !== undefined) metadata.containerTitle = item["container-title"];
  if (item.type !== undefined) metadata.type = item.type;
  if (item.page !== undefined) metadata.page = item.page;
  if (item.volume !== undefined) metadata.volume = item.volume;
  if (item.issue !== undefined) metadata.issue = item.issue;
  if (item.issued !== undefined) {
    metadata.issued = item.issued as { "date-parts"?: number[][] };
  }
  return metadata;
}

/**
 * Extract local metadata fields from a CslItem for comparison.
 */
function extractLocalMetadata(
  item: CslItem
): import("./metadata-comparator.js").LocalMetadataFields {
  const local: import("./metadata-comparator.js").LocalMetadataFields = {};
  if (item.title !== undefined) local.title = item.title;
  if (item.author !== undefined)
    local.author = item.author as Array<{ family?: string; given?: string }>;
  if (item["container-title"] !== undefined) local["container-title"] = item["container-title"];
  if (item.type !== undefined) local.type = item.type;
  if (item.page !== undefined) local.page = item.page;
  if (item.volume !== undefined) local.volume = item.volume;
  if (item.issue !== undefined) local.issue = item.issue;
  if (item.issued !== undefined) local.issued = item.issued as { "date-parts"?: number[][] };
  return local;
}

/**
 * Query PubMed and return findings.
 */
async function checkPubmed(pmid: string, config?: CheckConfig): Promise<CheckFinding[]> {
  const { queryPubmed } = await import("./pubmed-client.js");
  const result = await queryPubmed(pmid, config?.pubmed);
  if (!result.success) return [];

  const findings: CheckFinding[] = [];
  if (result.isRetracted) {
    findings.push({
      type: "retracted",
      message: "This article is marked as retracted in PubMed",
    });
  }
  if (result.hasConcern) {
    findings.push({
      type: "concern",
      message: "Expression of concern noted in PubMed",
    });
  }
  return findings;
}

/**
 * Map a Crossref update-to entry to a CheckFinding.
 */
function mapCrossrefUpdate(update: CrossrefUpdateInfo): CheckFinding | null {
  const doiDetail = update.doi ? { retractionDoi: update.doi } : {};
  const dateDetail = update.date ? { retractionDate: update.date } : {};
  const newDoiDetail = update.doi ? { newDoi: update.doi } : {};

  switch (update.type) {
    case "retraction":
      return {
        type: "retracted",
        message: update.date
          ? `This article was retracted on ${update.date}`
          : "This article was retracted",
        details: { ...doiDetail, ...dateDetail },
      };
    case "expression-of-concern":
      return {
        type: "concern",
        message: update.date
          ? `Expression of concern issued on ${update.date}`
          : "Expression of concern issued",
        details: { ...doiDetail, ...dateDetail },
      };
    case "new_version":
      return {
        type: "version_changed",
        message: update.doi
          ? `Published version available: ${update.doi}`
          : "Published version available",
        details: newDoiDetail,
      };
    default:
      return null;
  }
}
