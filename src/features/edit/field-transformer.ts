/**
 * Regex for validating ISO partial date strings (YYYY, YYYY-MM, YYYY-MM-DD).
 */
export const ISO_DATE_REGEX = /^\d{4}(-\d{2})?(-\d{2})?$/;

/**
 * Transforms CSL-JSON date fields between internal and edit formats.
 * Internal: { "date-parts": [[2024, 3, 15]] }
 * Edit: "2024-03-15"
 */
export function datePartsToIso(dateParts: number[][]): string {
  if (!dateParts || dateParts.length === 0 || !dateParts[0]) {
    return "";
  }

  const firstPart = dateParts[0];
  const year = firstPart[0];
  const month = firstPart[1];
  const day = firstPart[2];
  const parts: string[] = [String(year)];

  if (month !== undefined) {
    parts.push(String(month).padStart(2, "0"));
  }
  if (day !== undefined) {
    parts.push(String(day).padStart(2, "0"));
  }

  return parts.join("-");
}

/**
 * Transforms ISO date string to CSL-JSON date-parts format.
 * Edit: "2024-03-15"
 * Internal: { "date-parts": [[2024, 3, 15]] }
 */
export function isoToDateParts(isoDate: string): number[][] {
  const parts = isoDate.split("-").map(Number);
  return [parts];
}

/**
 * Transforms a CSL date object to ISO string for editing.
 */
export function transformDateToEdit(
  date: { "date-parts"?: number[][] } | undefined
): string | undefined {
  if (!date || !date["date-parts"]) {
    return undefined;
  }
  return datePartsToIso(date["date-parts"]);
}

/**
 * Transforms an ISO date string back to CSL date object.
 */
export function transformDateFromEdit(isoDate: string): { "date-parts": number[][] } {
  return {
    "date-parts": isoToDateParts(isoDate),
  };
}
