/**
 * Config value validator - validates values against key types
 */

import { type ConfigKeyInfo, getConfigKeyInfo } from "./key-parser.js";

/**
 * Result of value validation
 */
export interface ValidationResult {
  valid: boolean;
  value?: unknown;
  error?: string;
}

/**
 * Validate a value for a given config key.
 */
export function validateConfigValue(key: string, value: unknown): ValidationResult {
  const keyInfo = getConfigKeyInfo(key);
  if (!keyInfo) {
    return { valid: false, error: `Unknown configuration key: '${key}'` };
  }

  return validateByType(keyInfo, value);
}

/**
 * Validate a value based on the key's type information.
 */
function validateByType(keyInfo: ConfigKeyInfo, value: unknown): ValidationResult {
  switch (keyInfo.type) {
    case "string":
      return validateString(keyInfo, value);
    case "integer":
      return validateInteger(keyInfo, value);
    case "boolean":
      return validateBoolean(value);
    case "enum":
      return validateEnum(keyInfo, value);
    case "string[]":
      return validateStringArray(value);
    default:
      return { valid: false, error: `Unknown type: ${keyInfo.type}` };
  }
}

/**
 * Validate a string value.
 */
function validateString(keyInfo: ConfigKeyInfo, value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: `Expected string, received ${typeof value}` };
  }

  // Check for empty strings on required keys
  if (value === "" && !keyInfo.optional) {
    return { valid: false, error: "Value cannot be empty" };
  }

  return { valid: true, value };
}

/**
 * Validate an integer value.
 */
function validateInteger(keyInfo: ConfigKeyInfo, value: unknown): ValidationResult {
  if (typeof value !== "number") {
    return { valid: false, error: `Expected number, received ${typeof value}` };
  }

  if (!Number.isInteger(value)) {
    return { valid: false, error: "Value must be an integer" };
  }

  // Check for positive integer requirement (backup keys require positive)
  const requiresPositive = keyInfo.key.startsWith("backup.") && keyInfo.key !== "backup.directory";
  if (requiresPositive && value <= 0) {
    return { valid: false, error: "Value must be a positive integer" };
  }

  // Check for non-negative requirement (most integer keys)
  if (!requiresPositive && value < 0) {
    return { valid: false, error: "Value must be a non-negative integer" };
  }

  return { valid: true, value };
}

/**
 * Validate a boolean value.
 */
function validateBoolean(value: unknown): ValidationResult {
  if (typeof value !== "boolean") {
    return { valid: false, error: `Expected boolean, received ${typeof value}` };
  }

  return { valid: true, value };
}

/**
 * Validate an enum value.
 */
function validateEnum(keyInfo: ConfigKeyInfo, value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, error: `Expected string, received ${typeof value}` };
  }

  const allowedValues = keyInfo.enumValues ?? [];
  if (!allowedValues.includes(value)) {
    return {
      valid: false,
      error: `Invalid value '${value}'. Expected one of: ${allowedValues.join(", ")}`,
    };
  }

  return { valid: true, value };
}

/**
 * Validate a string array value.
 */
function validateStringArray(value: unknown): ValidationResult {
  if (!Array.isArray(value)) {
    return { valid: false, error: "Expected array" };
  }

  for (const item of value) {
    if (typeof item !== "string") {
      return { valid: false, error: "All array elements must be strings" };
    }
  }

  return { valid: true, value };
}

/**
 * Parse a string value into the appropriate type for a key.
 * Used when parsing command-line arguments.
 */
export function parseValueForKey(key: string, stringValue: string): unknown {
  const keyInfo = getConfigKeyInfo(key);
  if (!keyInfo) {
    return null;
  }

  switch (keyInfo.type) {
    case "string":
    case "enum":
      return stringValue;

    case "integer": {
      const num = Number(stringValue);
      if (Number.isNaN(num)) {
        return stringValue; // Let validation catch the error
      }
      return num;
    }

    case "boolean":
      if (stringValue === "true") return true;
      if (stringValue === "false") return false;
      return stringValue; // Let validation catch the error

    case "string[]":
      return stringValue.split(",").map((s) => s.trim());

    default:
      return stringValue;
  }
}
