import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCslJson } from "./parser";
import { serializeCslJson, writeCslJson } from "./serializer";
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
      const institutionalEntry = (parsed as CslLibrary).find(
        (e) => e.id === "institutional_author"
      );
      expect(institutionalEntry).toBeDefined();
      expect(institutionalEntry?.author?.[0]).toHaveProperty("literal");

      // Should handle entries without authors
      const noAuthorEntry = (parsed as CslLibrary).find((e) => e.id === "no_author");
      expect(noAuthorEntry).toBeDefined();
      expect(noAuthorEntry?.author).toBeUndefined();
    });

    describe("Keyword field serialization", () => {
      it("should serialize keyword array to semicolon-separated string", () => {
        const library: CslLibrary = [
          {
            id: "test",
            type: "article-journal",
            keyword: ["machine learning", "deep learning", "neural networks"],
            custom: {
              uuid: "550e8400-e29b-41d4-a716-446655440000",
              timestamp: "2024-01-01T00:00:00.000Z",
            },
          },
        ];

        const result = serializeCslJson(library);
        const parsed = JSON.parse(result);

        expect(parsed[0].keyword).toBe("machine learning; deep learning; neural networks");
      });

      it("should serialize single keyword array", () => {
        const library: CslLibrary = [
          {
            id: "test",
            type: "article-journal",
            keyword: ["machine learning"],
            custom: {
              uuid: "550e8400-e29b-41d4-a716-446655440000",
              timestamp: "2024-01-01T00:00:00.000Z",
            },
          },
        ];

        const result = serializeCslJson(library);
        const parsed = JSON.parse(result);

        expect(parsed[0].keyword).toBe("machine learning");
      });

      it("should omit keyword field when array is empty", () => {
        const library: CslLibrary = [
          {
            id: "test",
            type: "article-journal",
            keyword: [],
            custom: {
              uuid: "550e8400-e29b-41d4-a716-446655440000",
              timestamp: "2024-01-01T00:00:00.000Z",
            },
          },
        ];

        const result = serializeCslJson(library);
        const parsed = JSON.parse(result);

        expect(parsed[0].keyword).toBeUndefined();
      });

      it("should omit keyword field when undefined", () => {
        const library: CslLibrary = [
          {
            id: "test",
            type: "article-journal",
            custom: {
              uuid: "550e8400-e29b-41d4-a716-446655440000",
              timestamp: "2024-01-01T00:00:00.000Z",
            },
          },
        ];

        const result = serializeCslJson(library);
        const parsed = JSON.parse(result);

        expect(parsed[0].keyword).toBeUndefined();
      });

      it("should join keywords with semicolon and space", () => {
        const library: CslLibrary = [
          {
            id: "test",
            type: "article-journal",
            keyword: ["keyword1", "keyword2", "keyword3"],
            custom: {
              uuid: "550e8400-e29b-41d4-a716-446655440000",
              timestamp: "2024-01-01T00:00:00.000Z",
            },
          },
        ];

        const result = serializeCslJson(library);
        const parsed = JSON.parse(result);

        // Should use "; " (semicolon + space) as separator
        expect(parsed[0].keyword).toBe("keyword1; keyword2; keyword3");
        expect(parsed[0].keyword).toContain("; ");
      });
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

      expect(smith2023_1?.custom).toStrictEqual(smith2023_2?.custom);
      expect(smith2023_1?.custom?.uuid).toBe("550e8400-e29b-41d4-a716-446655440001");

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

    it("should preserve keywords through round-trip", async () => {
      const filePath = resolve(FIXTURES_DIR, "keyword-test.csl.json");
      const library1 = await parseCslJson(filePath);

      const serialized = serializeCslJson(library1);

      await mkdir(TMP_DIR, { recursive: true });
      const tmpPath = resolve(TMP_DIR, "roundtrip-keyword.csl.json");
      await writeFile(tmpPath, serialized, "utf-8");

      const library2 = await parseCslJson(tmpPath);

      expect(library2).toEqual(library1);

      // Check specific keyword preservation
      const withKeywords1 = library1.find((e) => e.id === "with_keywords");
      const withKeywords2 = library2.find((e) => e.id === "with_keywords");

      expect(withKeywords1?.keyword).toEqual([
        "machine learning",
        "deep learning",
        "neural networks",
      ]);
      expect(withKeywords2?.keyword).toEqual(withKeywords1?.keyword);

      // Cleanup
      await rm(TMP_DIR, { recursive: true, force: true });
    });
  });
});
