import { describe, expect, it } from "vitest";
import type { CslItem } from "./csl-json/types";
import { Reference } from "./reference";

describe("Reference", () => {
  const sampleItem: CslItem = {
    id: "smith-2023",
    type: "article-journal",
    title: "Machine Learning in Medical Diagnosis",
    author: [
      { family: "Smith", given: "John" },
      { family: "Johnson", given: "Emily" },
    ],
    issued: { "date-parts": [[2023, 5, 15]] },
    "container-title": "Journal of Medical Informatics",
    DOI: "10.1234/jmi.2023.0045",
    PMID: "12345678",
  };

  describe("constructor", () => {
    it("should create a reference from CSL item", () => {
      const ref = new Reference(sampleItem);
      const item = ref.getItem();
      // UUID is added automatically, so check other fields
      expect(item.id).toBe(sampleItem.id);
      expect(item.type).toBe(sampleItem.type);
      expect(item.title).toBe(sampleItem.title);
      expect(item.custom).toBeDefined(); // UUID is added
    });

    it("should preserve all CSL item fields", () => {
      const ref = new Reference(sampleItem);
      const item = ref.getItem();
      expect(item.id).toBe("smith-2023");
      expect(item.type).toBe("article-journal");
      expect(item.title).toBe("Machine Learning in Medical Diagnosis");
    });
  });

  describe("UUID management", () => {
    it("should extract UUID from custom field if present", () => {
      const itemWithUuid: CslItem = {
        ...sampleItem,
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };
      const ref = new Reference(itemWithUuid);
      expect(ref.getUuid()).toBe("550e8400-e29b-41d4-a716-446655440001");
    });

    it("should generate UUID if not present", () => {
      const ref = new Reference(sampleItem);
      const uuid = ref.getUuid();
      expect(uuid).toBeDefined();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should generate UUID if custom field is invalid", () => {
      const itemWithInvalidUuid: CslItem = {
        ...sampleItem,
        custom: {
          uuid: "invalid-uuid",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };
      const ref = new Reference(itemWithInvalidUuid);
      const uuid = ref.getUuid();
      expect(uuid).toBeDefined();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it("should update custom field with generated UUID", () => {
      const ref = new Reference(sampleItem);
      const uuid = ref.getUuid();
      const item = ref.getItem();
      expect(item.custom).toBeDefined();
      expect(item.custom?.uuid).toBe(uuid);
    });

    it("should generate timestamp if not present", () => {
      const ref = new Reference(sampleItem);
      const item = ref.getItem();
      expect(item.custom).toBeDefined();
      expect(item.custom?.timestamp).toBeDefined();
      // Check if timestamp is a valid ISO 8601 string
      expect(new Date(item.custom?.timestamp).toISOString()).toBe(item.custom?.timestamp);
    });

    it("should preserve existing timestamp", () => {
      const itemWithTimestamp: CslItem = {
        ...sampleItem,
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };
      const ref = new Reference(itemWithTimestamp);
      const item = ref.getItem();
      expect(item.custom?.timestamp).toBe("2024-01-01T00:00:00.000Z");
    });

    it("should preserve additional_urls if present", () => {
      const itemWithUrls: CslItem = {
        ...sampleItem,
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: "2024-01-01T00:00:00.000Z",
          additional_urls: ["https://example.com/resource1", "https://example.com/resource2"],
        },
      };
      const ref = new Reference(itemWithUrls);
      const item = ref.getItem();
      expect(item.custom?.additional_urls).toEqual([
        "https://example.com/resource1",
        "https://example.com/resource2",
      ]);
    });
  });

  describe("ID access", () => {
    it("should return ID from CSL item", () => {
      const ref = new Reference(sampleItem);
      expect(ref.getId()).toBe("smith-2023");
    });

    it("should handle missing ID", () => {
      const itemWithoutId: CslItem = {
        id: "",
        type: "article-journal",
      };
      const ref = new Reference(itemWithoutId);
      expect(ref.getId()).toBe("");
    });
  });

  describe("metadata access", () => {
    it("should return title", () => {
      const ref = new Reference(sampleItem);
      expect(ref.getTitle()).toBe("Machine Learning in Medical Diagnosis");
    });

    it("should return undefined for missing title", () => {
      const itemWithoutTitle: CslItem = { id: "test", type: "article" };
      const ref = new Reference(itemWithoutTitle);
      expect(ref.getTitle()).toBeUndefined();
    });

    it("should return authors", () => {
      const ref = new Reference(sampleItem);
      const authors = ref.getAuthors();
      expect(authors).toHaveLength(2);
      expect(authors?.[0]).toEqual({ family: "Smith", given: "John" });
    });

    it("should return undefined for missing authors", () => {
      const itemWithoutAuthors: CslItem = { id: "test", type: "article" };
      const ref = new Reference(itemWithoutAuthors);
      expect(ref.getAuthors()).toBeUndefined();
    });

    it("should return year from issued date", () => {
      const ref = new Reference(sampleItem);
      expect(ref.getYear()).toBe(2023);
    });

    it("should return undefined for missing issued date", () => {
      const itemWithoutDate: CslItem = { id: "test", type: "article" };
      const ref = new Reference(itemWithoutDate);
      expect(ref.getYear()).toBeUndefined();
    });

    it("should return undefined for issued date without date-parts", () => {
      const itemWithRawDate: CslItem = {
        id: "test",
        type: "article",
        issued: { raw: "2023" },
      };
      const ref = new Reference(itemWithRawDate);
      expect(ref.getYear()).toBeUndefined();
    });

    it("should return DOI", () => {
      const ref = new Reference(sampleItem);
      expect(ref.getDoi()).toBe("10.1234/jmi.2023.0045");
    });

    it("should return undefined for missing DOI", () => {
      const itemWithoutDoi: CslItem = { id: "test", type: "article" };
      const ref = new Reference(itemWithoutDoi);
      expect(ref.getDoi()).toBeUndefined();
    });

    it("should return PMID", () => {
      const ref = new Reference(sampleItem);
      expect(ref.getPmid()).toBe("12345678");
    });

    it("should return undefined for missing PMID", () => {
      const itemWithoutPmid: CslItem = { id: "test", type: "article" };
      const ref = new Reference(itemWithoutPmid);
      expect(ref.getPmid()).toBeUndefined();
    });

    it("should return PMCID", () => {
      const itemWithPmcid: CslItem = {
        ...sampleItem,
        PMCID: "PMC12345678",
      };
      const ref = new Reference(itemWithPmcid);
      expect(ref.getPmcid()).toBe("PMC12345678");
    });

    it("should return undefined for missing PMCID", () => {
      const itemWithoutPmcid: CslItem = { id: "test", type: "article" };
      const ref = new Reference(itemWithoutPmcid);
      expect(ref.getPmcid()).toBeUndefined();
    });

    it("should return URL", () => {
      const itemWithUrl: CslItem = {
        ...sampleItem,
        URL: "https://example.com/article",
      };
      const ref = new Reference(itemWithUrl);
      expect(ref.getUrl()).toBe("https://example.com/article");
    });

    it("should return undefined for missing URL", () => {
      const itemWithoutUrl: CslItem = { id: "test", type: "article" };
      const ref = new Reference(itemWithoutUrl);
      expect(ref.getUrl()).toBeUndefined();
    });

    it("should return keyword", () => {
      const itemWithKeyword: CslItem = {
        ...sampleItem,
        keyword: "machine learning; deep learning; neural networks",
      };
      const ref = new Reference(itemWithKeyword);
      expect(ref.getKeyword()).toBe("machine learning; deep learning; neural networks");
    });

    it("should return undefined for missing keyword", () => {
      const itemWithoutKeyword: CslItem = { id: "test", type: "article" };
      const ref = new Reference(itemWithoutKeyword);
      expect(ref.getKeyword()).toBeUndefined();
    });

    it("should return additional URLs", () => {
      const itemWithAdditionalUrls: CslItem = {
        ...sampleItem,
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: "2024-01-01T00:00:00.000Z",
          additional_urls: ["https://example.com/resource1", "https://example.com/resource2"],
        },
      };
      const ref = new Reference(itemWithAdditionalUrls);
      expect(ref.getAdditionalUrls()).toEqual([
        "https://example.com/resource1",
        "https://example.com/resource2",
      ]);
    });

    it("should return undefined for missing additional URLs", () => {
      const ref = new Reference(sampleItem);
      expect(ref.getAdditionalUrls()).toBeUndefined();
    });

    it("should return timestamp", () => {
      const itemWithTimestamp: CslItem = {
        ...sampleItem,
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };
      const ref = new Reference(itemWithTimestamp);
      expect(ref.getTimestamp()).toBe("2024-01-01T00:00:00.000Z");
    });
  });

  describe("ID generation", () => {
    it("should generate ID if not provided", () => {
      const itemWithoutId: CslItem = {
        id: "",
        type: "article-journal",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        title: "Test Article",
      };
      const ref = Reference.create(itemWithoutId);
      const id = ref.getId();
      // TitleSlug is only used when author or year is missing
      expect(id).toBe("smith-2023");
    });

    it("should avoid ID collision with existing IDs", () => {
      const itemWithoutId: CslItem = {
        id: "",
        type: "article-journal",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
        title: "Test Article",
      };
      const existingIds = new Set(["smith-2023"]);
      const ref = Reference.create(itemWithoutId, { existingIds });
      const id = ref.getId();
      expect(id).not.toBe("smith-2023");
      // Collision suffix should be appended (e.g., smith-2023a)
      expect(id).toMatch(/^smith-2023[a-z]+$/);
    });

    it("should keep existing ID if provided", () => {
      const ref = Reference.create(sampleItem);
      expect(ref.getId()).toBe("smith-2023");
    });
  });

  describe("static factory method", () => {
    it("should create reference with UUID generation", () => {
      const ref = Reference.create(sampleItem);
      expect(ref.getUuid()).toBeDefined();
      expect(ref.getId()).toBe("smith-2023");
    });

    it("should create reference with ID generation", () => {
      const itemWithoutId: CslItem = {
        id: "",
        type: "article-journal",
        author: [{ family: "Test", given: "Author" }],
        issued: { "date-parts": [[2024]] },
      };
      const ref = Reference.create(itemWithoutId);
      expect(ref.getId()).toMatch(/test-2024/);
    });
  });

  describe("type", () => {
    it("should return type from CSL item", () => {
      const ref = new Reference(sampleItem);
      expect(ref.getType()).toBe("article-journal");
    });
  });
});
