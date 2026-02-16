import { getRateLimiter } from "../import/rate-limiter.js";

const CROSSREF_API_BASE = "https://api.crossref.org/works";

export interface CrossrefUpdateInfo {
  type: string;
  doi?: string;
  label?: string;
  date?: string;
}

export interface CrossrefMetadata {
  title?: string;
  author?: Array<{ family?: string; given?: string }>;
  containerTitle?: string;
  type?: string;
  page?: string;
  volume?: string;
  issue?: string;
  issued?: { "date-parts"?: number[][] };
}

export type CrossrefResult =
  | { success: true; updates: CrossrefUpdateInfo[]; metadata?: CrossrefMetadata }
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
 * Extract comparable metadata fields from a Crossref message object.
 */
function extractMetadata(
  message: Record<string, unknown> | undefined
): CrossrefMetadata | undefined {
  if (!message) return undefined;

  const metadata: CrossrefMetadata = {};

  // Title: array in Crossref, take first element
  const titleArr = message.title as string[] | undefined;
  const firstTitle = Array.isArray(titleArr) ? titleArr[0] : undefined;
  if (firstTitle) {
    metadata.title = firstTitle;
  }

  // Author
  const authorArr = message.author as Array<{ family?: string; given?: string }> | undefined;
  if (Array.isArray(authorArr) && authorArr.length > 0) {
    metadata.author = authorArr.map((a) => ({
      ...(a.family ? { family: a.family } : {}),
      ...(a.given ? { given: a.given } : {}),
    }));
  }

  // Container title: array in Crossref, take first
  const containerArr = message["container-title"] as string[] | undefined;
  const firstContainer = Array.isArray(containerArr) ? containerArr[0] : undefined;
  if (firstContainer) {
    metadata.containerTitle = firstContainer;
  }

  // Type
  if (typeof message.type === "string") {
    metadata.type = message.type;
  }

  // Page, volume, issue
  if (typeof message.page === "string") metadata.page = message.page;
  if (typeof message.volume === "string") metadata.volume = message.volume;
  if (typeof message.issue === "string") metadata.issue = message.issue;

  // Issued
  const issued = message.issued as { "date-parts"?: number[][] } | undefined;
  if (issued && Array.isArray(issued["date-parts"])) {
    metadata.issued = issued;
  }

  // Return undefined if no metadata fields were populated (prevents spurious diffs)
  if (Object.keys(metadata).length === 0) return undefined;

  return metadata;
}

/**
 * Query Crossref REST API for a DOI and extract update-to information.
 *
 * @param doi - The DOI to query
 * @param config - Optional config with email for polite pool
 * @returns Crossref result with update information
 */
export async function queryCrossref(
  doi: string,
  config?: { email?: string }
): Promise<CrossrefResult> {
  const rateLimiter = getRateLimiter("crossref", {});
  await rateLimiter.acquire();

  try {
    const url = new URL(`${CROSSREF_API_BASE}/${encodeURIComponent(doi)}`);
    if (config?.email) {
      url.searchParams.set("mailto", config.email);
    }
    const response = await fetch(url.toString());

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

    const metadata = extractMetadata(message);

    return metadata ? { success: true, updates, metadata } : { success: true, updates };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
