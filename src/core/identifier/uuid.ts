import { randomUUID } from "node:crypto";
import type { CslCustom } from "../csl-json/types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
 * Generate a new ISO 8601 timestamp
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Extract UUID from custom field
 */
export function extractUuidFromCustom(custom: CslCustom | undefined): string | null {
  if (!custom || !custom.uuid) {
    return null;
  }

  return isValidUuid(custom.uuid) ? custom.uuid : null;
}

/**
 * Ensure custom metadata has a valid UUID
 * Generates a new UUID if missing or invalid
 */
function ensureUuid(custom: CslCustom | undefined): Partial<CslCustom> & { uuid: string } {
  const existingUuid = extractUuidFromCustom(custom);

  if (existingUuid && custom) {
    return custom as Partial<CslCustom> & { uuid: string };
  }

  const newUuid = generateUuid();
  return {
    ...custom,
    uuid: newUuid,
  };
}

/**
 * Ensure custom metadata has a valid created_at timestamp
 * Migrates from legacy timestamp field if needed
 * Generates a new timestamp if missing
 */
function ensureCreatedAt(
  custom: Partial<CslCustom> & { uuid: string }
): Partial<CslCustom> & { uuid: string; created_at: string } {
  // Already has created_at
  if (custom.created_at) {
    return custom as Partial<CslCustom> & { uuid: string; created_at: string };
  }

  // Legacy migration: move timestamp to created_at if timestamp exists but created_at doesn't
  if (custom.timestamp) {
    return {
      ...custom,
      created_at: custom.timestamp,
    };
  }

  // Generate new created_at
  const newTimestamp = generateTimestamp();
  return {
    ...custom,
    created_at: newTimestamp,
  };
}

/**
 * Ensure custom metadata has a valid timestamp (last modification time)
 * Defaults to created_at if missing
 */
function ensureTimestamp(
  custom: Partial<CslCustom> & { uuid: string; created_at: string }
): CslCustom {
  // Already has timestamp
  if (custom.timestamp) {
    return custom as CslCustom;
  }

  // Default to created_at (new item, not yet modified)
  return {
    ...custom,
    timestamp: custom.created_at,
  };
}

/**
 * Ensure custom metadata has valid UUID, created_at, and timestamp
 * Handles legacy migration from old timestamp-only format
 * Generates new values if missing or invalid
 */
export function ensureCustomMetadata(custom: CslCustom | undefined): CslCustom {
  const withUuid = ensureUuid(custom);
  const withCreatedAt = ensureCreatedAt(withUuid);
  const withTimestamp = ensureTimestamp(withCreatedAt);
  return withTimestamp;
}
