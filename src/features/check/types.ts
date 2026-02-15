/**
 * Check feature types
 */

export type CheckStatus = "ok" | "retracted" | "concern" | "version_changed" | "metadata_changed";

export interface CheckFinding {
  type: CheckStatus;
  message: string;
  details?: {
    retractionDoi?: string;
    retractionDate?: string;
    newDoi?: string;
    updatedFields?: string[];
  };
}

export interface CheckResult {
  id: string;
  uuid: string;
  status: "ok" | "warning" | "skipped";
  findings: CheckFinding[];
  checkedAt: string;
  checkedSources: string[];
}
