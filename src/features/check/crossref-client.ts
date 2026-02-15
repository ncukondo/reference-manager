import { getRateLimiter } from "../import/rate-limiter.js";

const CROSSREF_API_BASE = "https://api.crossref.org/works";

export interface CrossrefUpdateInfo {
  type: string;
  doi?: string;
  label?: string;
  date?: string;
}

export type CrossrefResult =
  | { success: true; updates: CrossrefUpdateInfo[] }
  | { success: false; error: string };

/**
 * Format date-parts from Crossref API response to ISO date string.
 */
function formatDateParts(updated: unknown): { date?: string } {
  if (!updated || typeof updated !== "object") return {};
  const dateParts = (updated as Record<string, unknown>)["date-parts"];
  if (!Array.isArray(dateParts) || dateParts.length === 0) return {};
  const parts = dateParts[0] as number[];
  if (!Array.isArray(parts) || parts.length === 0) return {};
  const [year, month, day] = parts;
  const m = String(month ?? 1).padStart(2, "0");
  const d = String(day ?? 1).padStart(2, "0");
  return { date: `${year}-${m}-${d}` };
}

/**
 * Query Crossref REST API for a DOI and extract update-to information.
 *
 * @param doi - The DOI to query
 * @returns Crossref result with update information
 */
export async function queryCrossref(doi: string): Promise<CrossrefResult> {
  const rateLimiter = getRateLimiter("crossref", {});
  await rateLimiter.acquire();

  try {
    const response = await fetch(`${CROSSREF_API_BASE}/${encodeURIComponent(doi)}`);

    if (!response.ok) {
      return {
        success: false,
        error: `Crossref API returned ${response.status} ${response.statusText}`,
      };
    }

    const data = (await response.json()) as Record<string, unknown>;
    const message = data.message as Record<string, unknown> | undefined;

    const updateTo = (message?.["update-to"] ?? []) as Record<string, unknown>[];
    const updates: CrossrefUpdateInfo[] = updateTo.map((e) => {
      const datePart = formatDateParts(e.updated);
      return {
        type: String(e.type ?? ""),
        ...(e.DOI ? { doi: String(e.DOI) } : {}),
        ...(e.label ? { label: String(e.label) } : {}),
        ...(datePart.date ? { date: datePart.date } : {}),
      };
    });

    return { success: true, updates };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
