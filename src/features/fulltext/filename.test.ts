import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { generateFulltextFilename } from "./filename.js";

describe("generateFulltextFilename", () => {
  const baseItem: CslItem = {
    id: "Smith-2024",
    type: "article-journal",
    title: "Test Article",
    custom: {
      uuid: "123e4567-e89b-12d3-a456-426614174000",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  describe("with PMID", () => {
    const itemWithPmid: CslItem = {
      ...baseItem,
      PMID: "12345678",
    };

    it("generates PDF filename with PMID", () => {
      const filename = generateFulltextFilename(itemWithPmid, "pdf");
      expect(filename).toBe("Smith-2024-PMID12345678-123e4567-e89b-12d3-a456-426614174000.pdf");
    });

    it("generates Markdown filename with PMID", () => {
      const filename = generateFulltextFilename(itemWithPmid, "markdown");
      expect(filename).toBe("Smith-2024-PMID12345678-123e4567-e89b-12d3-a456-426614174000.md");
    });
  });

  describe("without PMID", () => {
    it("generates PDF filename without PMID", () => {
      const filename = generateFulltextFilename(baseItem, "pdf");
      expect(filename).toBe("Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
    });

    it("generates Markdown filename without PMID", () => {
      const filename = generateFulltextFilename(baseItem, "markdown");
      expect(filename).toBe("Smith-2024-123e4567-e89b-12d3-a456-426614174000.md");
    });
  });

  describe("edge cases", () => {
    it("handles ID with special characters", () => {
      const itemWithSpecialId: CslItem = {
        ...baseItem,
        id: "Author_Name-2024a",
      };
      const filename = generateFulltextFilename(itemWithSpecialId, "pdf");
      expect(filename).toBe("Author_Name-2024a-123e4567-e89b-12d3-a456-426614174000.pdf");
    });

    it("handles empty PMID as no PMID", () => {
      const itemWithEmptyPmid: CslItem = {
        ...baseItem,
        PMID: "",
      };
      const filename = generateFulltextFilename(itemWithEmptyPmid, "pdf");
      expect(filename).toBe("Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
    });

    it("throws error if custom.uuid is missing", () => {
      const itemWithoutUuid: CslItem = {
        id: "Smith-2024",
        type: "article-journal",
      };
      expect(() => generateFulltextFilename(itemWithoutUuid, "pdf")).toThrow("Missing uuid");
    });
  });
});
