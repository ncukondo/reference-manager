import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { normalizeReference } from "./show-normalizer.js";

/**
 * Helper to create a minimal CslItem for testing.
 */
function makeItem(id: string, overrides: Partial<CslItem> = {}): CslItem {
  return {
    id,
    type: "article-journal",
    ...overrides,
  };
}

describe("normalizeReference", () => {
  describe("basic fields", () => {
    it("normalizes id, uuid, type, title", () => {
      const item = makeItem("Smith2020", {
        title: "Machine learning approaches",
        custom: { uuid: "a1b2c3d4-e5f6" },
      });
      const result = normalizeReference(item);
      expect(result.id).toBe("Smith2020");
      expect(result.uuid).toBe("a1b2c3d4-e5f6");
      expect(result.type).toBe("article-journal");
      expect(result.title).toBe("Machine learning approaches");
    });

    it("returns null for absent optional fields", () => {
      const item = makeItem("Bare2020");
      const result = normalizeReference(item);
      expect(result.title).toBeNull();
      expect(result.authors).toBeNull();
      expect(result.year).toBeNull();
      expect(result.journal).toBeNull();
      expect(result.volume).toBeNull();
      expect(result.issue).toBeNull();
      expect(result.page).toBeNull();
      expect(result.doi).toBeNull();
      expect(result.pmid).toBeNull();
      expect(result.pmcid).toBeNull();
      expect(result.url).toBeNull();
      expect(result.abstract).toBeNull();
      expect(result.tags).toBeNull();
      expect(result.created).toBeNull();
      expect(result.modified).toBeNull();
      expect(result.uuid).toBeNull();
    });
  });

  describe("authors", () => {
    it("normalizes authors from CslItem author array to 'Family, Given' strings", () => {
      const item = makeItem("Smith2020", {
        author: [
          { family: "Smith", given: "John" },
          { family: "Tanaka", given: "Keiko" },
        ],
      });
      const result = normalizeReference(item);
      expect(result.authors).toEqual(["Smith, J.", "Tanaka, K."]);
    });

    it("handles literal author names", () => {
      const item = makeItem("WHO2020", {
        author: [{ literal: "World Health Organization" }],
      });
      const result = normalizeReference(item);
      expect(result.authors).toEqual(["World Health Organization"]);
    });

    it("handles family-only author names", () => {
      const item = makeItem("Mono2020", {
        author: [{ family: "Aristotle" }],
      });
      const result = normalizeReference(item);
      expect(result.authors).toEqual(["Aristotle"]);
    });
  });

  describe("year", () => {
    it("extracts year from issued.date-parts", () => {
      const item = makeItem("Smith2020", {
        issued: { "date-parts": [[2020, 6, 15]] },
      });
      const result = normalizeReference(item);
      expect(result.year).toBe(2020);
    });

    it("returns null when issued is absent", () => {
      const item = makeItem("NoYear");
      const result = normalizeReference(item);
      expect(result.year).toBeNull();
    });
  });

  describe("journal info", () => {
    it("consolidates journal info", () => {
      const item = makeItem("Smith2020", {
        "container-title": "Nature Methods",
        volume: "17",
        issue: "3",
        page: "245-260",
      });
      const result = normalizeReference(item);
      expect(result.journal).toBe("Nature Methods");
      expect(result.volume).toBe("17");
      expect(result.issue).toBe("3");
      expect(result.page).toBe("245-260");
    });
  });

  describe("identifiers", () => {
    it("extracts DOI, PMID, PMCID, URL", () => {
      const item = makeItem("Smith2020", {
        DOI: "10.1038/s41592-020-0001-0",
        PMID: "32015508",
        PMCID: "PMC7123456",
        URL: "https://doi.org/10.1038/s41592-020-0001-0",
      });
      const result = normalizeReference(item);
      expect(result.doi).toBe("10.1038/s41592-020-0001-0");
      expect(result.pmid).toBe("32015508");
      expect(result.pmcid).toBe("PMC7123456");
      expect(result.url).toBe("https://doi.org/10.1038/s41592-020-0001-0");
    });
  });

  describe("tags", () => {
    it("extracts tags from custom.tags", () => {
      const item = makeItem("Smith2020", {
        custom: { tags: ["machine-learning", "genomics"] },
      });
      const result = normalizeReference(item);
      expect(result.tags).toEqual(["machine-learning", "genomics"]);
    });

    it("returns null when no tags", () => {
      const item = makeItem("Smith2020");
      const result = normalizeReference(item);
      expect(result.tags).toBeNull();
    });
  });

  describe("timestamps", () => {
    it("extracts created/modified from custom fields", () => {
      const item = makeItem("Smith2020", {
        custom: {
          created_at: "2024-06-15T10:00:00Z",
          timestamp: "2024-09-01T14:30:00Z",
        },
      });
      const result = normalizeReference(item);
      expect(result.created).toBe("2024-06-15T10:00:00Z");
      expect(result.modified).toBe("2024-09-01T14:30:00Z");
    });
  });

  describe("abstract", () => {
    it("extracts abstract", () => {
      const item = makeItem("Smith2020", {
        abstract: "Recent advances in machine learning...",
      });
      const result = normalizeReference(item);
      expect(result.abstract).toBe("Recent advances in machine learning...");
    });
  });

  describe("raw", () => {
    it("includes raw as the original CslItem", () => {
      const item = makeItem("Smith2020", { title: "Test" });
      const result = normalizeReference(item);
      expect(result.raw).toBe(item);
    });
  });

  describe("fulltext and attachments", () => {
    it("resolves fulltext paths when attachmentsDirectory provided", () => {
      const item = makeItem("Smith2020", {
        custom: {
          attachments: {
            directory: "Smith2020",
            files: [
              { filename: "fulltext.pdf", role: "fulltext" },
              { filename: "fulltext.md", role: "fulltext" },
            ],
          },
        },
      });
      const result = normalizeReference(item, {
        attachmentsDirectory: "/home/user/.ref/files",
      });
      expect(result.fulltext).toEqual({
        pdf: "/home/user/.ref/files/Smith2020/fulltext.pdf",
        markdown: "/home/user/.ref/files/Smith2020/fulltext.md",
      });
    });

    it("returns fulltext null when no fulltext attached", () => {
      const item = makeItem("Smith2020", {
        custom: {
          attachments: {
            directory: "Smith2020",
            files: [{ filename: "supplement.pdf", role: "supplement" }],
          },
        },
      });
      const result = normalizeReference(item, {
        attachmentsDirectory: "/home/user/.ref/files",
      });
      expect(result.fulltext).toEqual({
        pdf: null,
        markdown: null,
      });
    });

    it("lists non-fulltext attachments with filename and role", () => {
      const item = makeItem("Smith2020", {
        custom: {
          attachments: {
            directory: "Smith2020",
            files: [
              { filename: "fulltext.pdf", role: "fulltext" },
              { filename: "supplement1.pdf", role: "supplement" },
              { filename: "data.csv", role: "supplement" },
            ],
          },
        },
      });
      const result = normalizeReference(item, {
        attachmentsDirectory: "/home/user/.ref/files",
      });
      expect(result.attachments).toEqual([
        { filename: "supplement1.pdf", role: "supplement" },
        { filename: "data.csv", role: "supplement" },
      ]);
    });

    it("returns null fulltext and attachments when no attachmentsDirectory", () => {
      const item = makeItem("Smith2020", {
        custom: {
          attachments: {
            directory: "Smith2020",
            files: [{ filename: "fulltext.pdf", role: "fulltext" }],
          },
        },
      });
      const result = normalizeReference(item);
      expect(result.fulltext).toBeNull();
      expect(result.attachments).toBeNull();
    });

    it("returns null fulltext and empty attachments when no attachments metadata", () => {
      const item = makeItem("Smith2020");
      const result = normalizeReference(item, {
        attachmentsDirectory: "/home/user/.ref/files",
      });
      expect(result.fulltext).toEqual({ pdf: null, markdown: null });
      expect(result.attachments).toEqual([]);
    });
  });
});
