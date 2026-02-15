import type { CslItem } from "../../core/csl-json/types.js";
import type { CrossrefUpdateInfo } from "./crossref-client.js";
import type { CheckFinding, CheckResult } from "./types.js";

/**
 * Check a single reference against external sources for status changes.
 *
 * @param item - The CSL-JSON item to check
 * @returns Check result with findings
 */
export async function checkReference(item: CslItem): Promise<CheckResult> {
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

  // Query Crossref if DOI is present
  if (hasDoi) {
    checkedSources.push("crossref");
    const { queryCrossref } = await import("./crossref-client.js");
    const crossrefResult = await queryCrossref(item.DOI as string);

    if (crossrefResult.success) {
      for (const update of crossrefResult.updates) {
        const finding = mapCrossrefUpdate(update);
        if (finding) {
          findings.push(finding);
        }
      }
    }
  }

  const status = findings.length > 0 ? "warning" : "ok";
  return { id, uuid, status, findings, checkedAt, checkedSources };
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
