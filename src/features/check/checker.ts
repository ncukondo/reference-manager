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
    // Only add PubMed findings that aren't already found via Crossref
    for (const pf of pubmedFindings) {
      if (!findings.some((f) => f.type === pf.type)) {
        findings.push(pf);
      }
    }
  }

  // Metadata comparison (default: enabled)
  const metadataEnabled = config?.metadata !== false;
  if (metadataEnabled && crossrefMetadata) {
    const metadataFinding = await compareItemMetadata(item, crossrefMetadata);
    if (metadataFinding) {
      findings.push(metadataFinding);
    }
  }

  const status = findings.length > 0 ? "warning" : "ok";
  return { id, uuid, status, findings, checkedAt, checkedSources };
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
 * Extract local metadata fields from a CslItem for comparison.
 */
function extractLocalMetadata(
  item: CslItem
): import("./metadata-comparator.js").LocalMetadataFields {
  const local: import("./metadata-comparator.js").LocalMetadataFields = {};
  if (item.title) local.title = item.title;
  if (item.author) local.author = item.author as Array<{ family?: string; given?: string }>;
  if (item["container-title"]) local["container-title"] = item["container-title"];
  if (item.type) local.type = item.type;
  if (item.page) local.page = item.page;
  if (item.volume) local.volume = item.volume;
  if (item.issue) local.issue = item.issue;
  if (item.issued) local.issued = item.issued as { "date-parts"?: number[][] };
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
