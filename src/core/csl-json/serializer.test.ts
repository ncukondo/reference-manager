import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { serializeCslJson, writeCslJson } from "./serializer";
import { parseCslJson } from "./parser";
import type { CslLibrary } from "./types";

const FIXTURES_DIR = resolve(__dirname, "../../../tests/fixtures");
const TMP_DIR = resolve(__dirname, "../../../tests/tmp");

describe("CSL-JSON Serializer", () => {
  describe("serializeCslJson", () => {
    it("should serialize a valid CSL-JSON library to string", async () => {
      const filePath = resolve(FIXTURES_DIR, "sample.csl.json");
      const library = await parseCslJson(filePath);

      const result = serializeCslJson(library);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");

      // Should be valid JSON
      expect(() => JSON.parse(result)).not.toThrow();

      // Should parse back to an array
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(5);
    });

    it("should serialize an empty library", async () => {
      const emptyLibrary: CslLibrary = [];

      const result = serializeCslJson(emptyLibrary);

      expect(result).toBeDefined();
      expect(typeof result).toBe("string");

      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(0);
    });

    it("should format JSON with 2-space indentation", async () => {
      const filePath = resolve(FIXTURES_DIR, "single-entry.csl.json");
      const library = await parseCslJson(filePath);

      const result = serializeCslJson(library);

      // Should have proper indentation
      expect(result).toContain("[\n  {");
      expect(result).toContain("  }");

      // Should not have tabs
      expect(result).not.toContain("\t");
    });

    it("should preserve all fields during serialization", async () => {
      const filePath = resolve(FIXTURES_DIR, "sample.csl.json");
      const library = await parseCslJson(filePath);

      const result = serializeCslJson(library);
      const parsed = JSON.parse(result);

      // Check first entry has all expected fields
      const firstEntry = parsed[0];
      expect(firstEntry).toHaveProperty("id");
      expect(firstEntry).toHaveProperty("type");
      expect(firstEntry).toHaveProperty("custom");
    });

    it("should handle entries with complex structures", async () => {
      const filePath = resolve(FIXTURES_DIR, "edge-cases.csl.json");
      const library = await parseCslJson(filePath);

      const result = serializeCslJson(library);
      const parsed = JSON.parse(result);

      // Should handle institutional authors
      const institutionalEntry = parsed.find((e: any) => e.id === "institutional_author");
      expect(institutionalEntry).toBeDefined();
      expect(institutionalEntry.author?.[0]).toHaveProperty("literal");

      // Should handle entries without authors
      const noAuthorEntry = parsed.find((e: any) => e.id === "no_author");
      expect(noAuthorEntry).toBeDefined();
      expect(noAuthorEntry.author).toBeUndefined();
    });
  });

  describe("writeCslJson", () => {
    it("should write library to file", async () => {
      // Create tmp directory
      await mkdir(TMP_DIR, { recursive: true });

      const filePath = resolve(FIXTURES_DIR, "sample.csl.json");
      const library = await parseCslJson(filePath);

      const outputPath = resolve(TMP_DIR, "output.csl.json");
      await writeCslJson(outputPath, library);

      // File should exist and be readable
      const content = await readFile(outputPath, "utf-8");
      expect(content).toBeDefined();

      // Should be valid JSON
      const parsed = JSON.parse(content);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(5);

      // Cleanup
      await rm(TMP_DIR, { recursive: true, force: true });
    });

    it("should create parent directories if needed", async () => {
      const nestedPath = resolve(TMP_DIR, "nested/dir/output.csl.json");

      const library: CslLibrary = [];
      await writeCslJson(nestedPath, library);

      // File should exist
      const content = await readFile(nestedPath, "utf-8");
      expect(content).toBeDefined();

      // Cleanup
      await rm(TMP_DIR, { recursive: true, force: true });
    });
  });

  describe("Round-trip tests", () => {
    it("should preserve data through parse -> serialize -> parse cycle", async () => {
      const filePath = resolve(FIXTURES_DIR, "sample.csl.json");

      // First parse
      const library1 = await parseCslJson(filePath);

      // Serialize
      const serialized = serializeCslJson(library1);

      // Write to temp file
      await mkdir(TMP_DIR, { recursive: true });
      const tmpPath = resolve(TMP_DIR, "roundtrip.csl.json");
      await writeFile(tmpPath, serialized, "utf-8");

      // Parse again
      const library2 = await parseCslJson(tmpPath);

      // Should be identical
      expect(library2).toEqual(library1);

      // Cleanup
      await rm(TMP_DIR, { recursive: true, force: true });
    });

    it("should preserve UUIDs through round-trip", async () => {
      const filePath = resolve(FIXTURES_DIR, "sample.csl.json");
      const library1 = await parseCslJson(filePath);

      const serialized = serializeCslJson(library1);

      await mkdir(TMP_DIR, { recursive: true });
      const tmpPath = resolve(TMP_DIR, "roundtrip-uuid.csl.json");
      await writeFile(tmpPath, serialized, "utf-8");

      const library2 = await parseCslJson(tmpPath);

      // Check specific UUID preservation
      const smith2023_1 = library1.find((e) => e.id === "smith2023");
      const smith2023_2 = library2.find((e) => e.id === "smith2023");

      expect(smith2023_1?.custom).toBe(smith2023_2?.custom);
      expect(smith2023_1?.custom).toBe(
        "reference_manager_uuid=550e8400-e29b-41d4-a716-446655440001"
      );

      // Cleanup
      await rm(TMP_DIR, { recursive: true, force: true });
    });

    it("should handle empty library round-trip", async () => {
      const filePath = resolve(FIXTURES_DIR, "empty.csl.json");
      const library1 = await parseCslJson(filePath);

      const serialized = serializeCslJson(library1);

      await mkdir(TMP_DIR, { recursive: true });
      const tmpPath = resolve(TMP_DIR, "roundtrip-empty.csl.json");
      await writeFile(tmpPath, serialized, "utf-8");

      const library2 = await parseCslJson(tmpPath);

      expect(library2).toEqual(library1);
      expect(library2.length).toBe(0);

      // Cleanup
      await rm(TMP_DIR, { recursive: true, force: true });
    });

    it("should handle edge cases round-trip", async () => {
      const filePath = resolve(FIXTURES_DIR, "edge-cases.csl.json");
      const library1 = await parseCslJson(filePath);

      const serialized = serializeCslJson(library1);

      await mkdir(TMP_DIR, { recursive: true });
      const tmpPath = resolve(TMP_DIR, "roundtrip-edge.csl.json");
      await writeFile(tmpPath, serialized, "utf-8");

      const library2 = await parseCslJson(tmpPath);

      expect(library2).toEqual(library1);

      // Cleanup
      await rm(TMP_DIR, { recursive: true, force: true });
    });
  });
});
