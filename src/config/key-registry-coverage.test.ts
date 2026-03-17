import { describe, expect, it } from "vitest";
import type { ZodTypeAny } from "zod";
import { getAllConfigKeys } from "./key-parser.js";
import { configSchema } from "./schema.js";

/**
 * Keys that use z.record() or are otherwise dynamic and cannot be enumerated
 * in CONFIG_KEY_REGISTRY as static entries.
 */
const DYNAMIC_RECORD_PREFIXES = ["fulltext.converters"];

/**
 * Convert a camelCase string to snake_case.
 */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Check if a Zod schema is an object type (has .shape).
 */
function isZodObject(schema: ZodTypeAny): boolean {
  return "shape" in schema && typeof schema.shape === "object" && schema.shape !== null;
}

/**
 * Unwrap optional/default/effects wrappers from a Zod schema.
 */
function unwrap(schema: ZodTypeAny): ZodTypeAny {
  const def = schema._def;
  if (def.innerType) {
    return unwrap(def.innerType);
  }
  if (def.schema) {
    return unwrap(def.schema);
  }
  return schema;
}

/**
 * Check if a Zod schema is a record type.
 */
function isZodRecord(schema: ZodTypeAny): boolean {
  const inner = unwrap(schema);
  return (
    inner._def.typeName === "ZodRecord" || ("valueType" in inner._def && "keyType" in inner._def)
  );
}

/**
 * Recursively extract all leaf key paths from a Zod object schema.
 * Returns paths in snake_case using dot notation (e.g. "backup.max_generations").
 */
function extractLeafPaths(schema: ZodTypeAny, prefix: string): string[] {
  const paths: string[] = [];
  const inner = unwrap(schema);

  if (isZodRecord(inner)) {
    // Dynamic keys — skip
    return [];
  }

  if (isZodObject(inner)) {
    const shape = inner.shape as Record<string, ZodTypeAny>;
    for (const [key, value] of Object.entries(shape)) {
      const snakeKey = camelToSnake(key);
      const fullPath = prefix ? `${prefix}.${snakeKey}` : snakeKey;
      const childPaths = extractLeafPaths(value, fullPath);
      if (childPaths.length === 0) {
        // Leaf node
        paths.push(fullPath);
      } else {
        paths.push(...childPaths);
      }
    }
    return paths;
  }

  // All other types are leaf nodes
  return [];
}

describe("CONFIG_KEY_REGISTRY coverage", () => {
  it("should extract paths from the schema (sanity check)", () => {
    const schemaPaths = extractLeafPaths(configSchema, "");
    expect(schemaPaths.length).toBeGreaterThan(0);
    expect(schemaPaths).toContain("library");
    expect(schemaPaths).toContain("log_level");
    expect(schemaPaths).toContain("backup.max_generations");
  });

  it("should cover all fixed scalar keys from the Zod schema", () => {
    const schemaPaths = extractLeafPaths(configSchema, "");
    const registryKeys = new Set(getAllConfigKeys());

    const missingKeys: string[] = [];
    for (const path of schemaPaths) {
      // Skip dynamic record prefixes
      const isDynamic = DYNAMIC_RECORD_PREFIXES.some(
        (prefix) => path === prefix || path.startsWith(`${prefix}.`)
      );
      if (isDynamic) {
        continue;
      }

      if (!registryKeys.has(path)) {
        missingKeys.push(path);
      }
    }

    if (missingKeys.length > 0) {
      throw new Error(
        `CONFIG_KEY_REGISTRY is missing keys that exist in the Zod schema:\n  ${missingKeys.join("\n  ")}\n\nAdd these keys to CONFIG_KEY_REGISTRY in src/config/key-parser.ts,\nor add the prefix to DYNAMIC_RECORD_PREFIXES in this test if they are dynamic.`
      );
    }
  });

  it("should not have registry keys absent from the Zod schema", () => {
    const schemaPaths = new Set(extractLeafPaths(configSchema, ""));
    const registryKeys = getAllConfigKeys();

    const extraKeys: string[] = [];
    for (const key of registryKeys) {
      if (!schemaPaths.has(key)) {
        extraKeys.push(key);
      }
    }

    if (extraKeys.length > 0) {
      throw new Error(
        `CONFIG_KEY_REGISTRY has keys not found in the Zod schema:\n  ${extraKeys.join("\n  ")}\n\nEither the Zod schema is missing these fields, or these registry entries are stale.`
      );
    }
  });
});
