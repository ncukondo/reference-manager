import { randomUUID } from "node:crypto";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_KEY = "reference_manager_uuid";

/**
 * Validate if a string is a valid UUID v4
 */
export function isValidUuid(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

/**
 * Generate a new UUID v4
 */
export function generateUuid(): string {
  return randomUUID();
}

/**
 * Extract UUID from custom field
 * Format: "reference_manager_uuid=<uuid>[;other_key=value]"
 */
export function extractUuidFromCustom(custom: string | undefined): string | null {
  if (!custom) {
    return null;
  }

  // Split by semicolon to handle multiple key-value pairs
  const pairs = custom.split(";");

  for (const pair of pairs) {
    const trimmed = pair.trim();
    const [key, value] = trimmed.split("=");

    // Case-insensitive comparison for key
    if (key?.trim().toLowerCase() === UUID_KEY.toLowerCase() && value) {
      const uuid = value.trim();
      return isValidUuid(uuid) ? uuid : null;
    }
  }

  return null;
}

/**
 * Set or update UUID in custom field
 * Preserves other key-value pairs
 */
export function setUuidInCustom(custom: string | undefined, uuid: string): string {
  if (!custom) {
    return `${UUID_KEY}=${uuid}`;
  }

  const pairs = custom.split(";").map(p => p.trim()).filter(p => p.length > 0);
  const updatedPairs: string[] = [];
  let uuidFound = false;

  for (const pair of pairs) {
    const [key, value] = pair.split("=");

    // Case-insensitive comparison for key
    if (key?.trim().toLowerCase() === UUID_KEY.toLowerCase()) {
      updatedPairs.push(`${UUID_KEY}=${uuid}`);
      uuidFound = true;
    } else {
      updatedPairs.push(pair);
    }
  }

  // If UUID key wasn't found, add it
  if (!uuidFound) {
    updatedPairs.push(`${UUID_KEY}=${uuid}`);
  }

  return updatedPairs.join(";");
}

/**
 * Ensure an entry has a valid UUID in its custom field
 * Generates a new UUID if missing or invalid
 */
export function ensureUuid(custom: string | undefined): string {
  const existingUuid = extractUuidFromCustom(custom);

  if (existingUuid) {
    return custom!;
  }

  const newUuid = generateUuid();
  return setUuidInCustom(custom, newUuid);
}
