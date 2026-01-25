/**
 * Directory name utilities for attachments
 *
 * Directory format: {id}[-PMID{pmid}]-{uuid-prefix}
 * Examples:
 *   - With PMID: Smith-2024-PMID12345678-123e4567
 *   - Without PMID: Smith-2024-123e4567
 */

interface ReferenceForDirectory {
  id: string;
  PMID?: string;
  custom?: { uuid?: string };
}

interface ParsedDirectoryName {
  id: string;
  pmid?: string;
  uuidPrefix: string;
}

/**
 * Extract first 8 characters of UUID as prefix
 */
export function extractUuidPrefix(uuid: string): string {
  // Remove dashes and take first 8 chars
  const normalized = uuid.replace(/-/g, "");
  return normalized.slice(0, 8);
}

/**
 * Generate directory name for a reference
 */
export function generateDirectoryName(ref: ReferenceForDirectory): string {
  const uuid = ref.custom?.uuid;
  if (!uuid) {
    throw new Error("Reference must have custom.uuid");
  }

  const uuidPrefix = extractUuidPrefix(uuid);
  const pmid = ref.PMID?.trim();

  if (pmid) {
    return `${ref.id}-PMID${pmid}-${uuidPrefix}`;
  }
  return `${ref.id}-${uuidPrefix}`;
}

/**
 * Parse directory name to extract components
 *
 * Returns null if the directory name doesn't match expected format
 */
export function parseDirectoryName(name: string): ParsedDirectoryName | null {
  if (!name) {
    return null;
  }

  // Pattern: {id}-PMID{pmid}-{uuidPrefix} or {id}-{uuidPrefix}
  // uuidPrefix is always 8 hex characters at the end
  const uuidPrefixPattern = /^[0-9a-f]{8}$/i;

  // Split by '-' and check last part is uuid prefix
  const parts = name.split("-");
  if (parts.length < 2) {
    return null;
  }

  const lastPart = parts[parts.length - 1];
  if (!lastPart || !uuidPrefixPattern.test(lastPart)) {
    return null;
  }

  const uuidPrefix = lastPart;

  // Check for PMID pattern in second-to-last position
  const remainingParts = parts.slice(0, -1);
  const lastRemaining = remainingParts[remainingParts.length - 1];
  const pmidMatch = lastRemaining?.match(/^PMID(\d+)$/);

  if (pmidMatch?.[1]) {
    // Has PMID
    const id = remainingParts.slice(0, -1).join("-");
    if (!id) {
      return null;
    }
    return {
      id,
      pmid: pmidMatch[1],
      uuidPrefix,
    };
  }

  // No PMID
  const id = remainingParts.join("-");
  if (!id) {
    return null;
  }
  return {
    id,
    uuidPrefix,
  };
}
