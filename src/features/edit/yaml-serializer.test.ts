import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { serializeToYaml } from "./yaml-serializer.js";

describe("serializeToYaml", () => {
  const baseItem: CslItem = {
    id: "Smith-2024",
    type: "article-journal",
    title: "Test Article",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440000",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-03-15T10:30:00.000Z",
    },
  };

  it("serializes a single reference", () => {
    const yaml = serializeToYaml([baseItem]);
    expect(yaml).toContain("id: Smith-2024");
    expect(yaml).toContain("type: article-journal");
    expect(yaml).toContain("title: Test Article");
  });

  it("serializes multiple references", () => {
    const items: CslItem[] = [
      baseItem,
      {
        id: "Doe-2023",
        type: "book",
        title: "Another Book",
        custom: {
          uuid: "660e8400-e29b-41d4-a716-446655440001",
          created_at: "2023-01-01T00:00:00.000Z",
          timestamp: "2023-06-15T10:30:00.000Z",
        },
      },
    ];
    const yaml = serializeToYaml(items);
    expect(yaml).toContain("id: Smith-2024");
    expect(yaml).toContain("id: Doe-2023");
  });

  describe("protected fields as comments", () => {
    it("shows uuid in comment block", () => {
      const yaml = serializeToYaml([baseItem]);
      expect(yaml).toContain("# uuid: 550e8400-e29b-41d4-a716-446655440000");
    });

    it("shows created_at in comment block", () => {
      const yaml = serializeToYaml([baseItem]);
      expect(yaml).toContain("# created_at: 2024-01-01T00:00:00.000Z");
    });

    it("shows timestamp in comment block", () => {
      const yaml = serializeToYaml([baseItem]);
      expect(yaml).toContain("# timestamp: 2024-03-15T10:30:00.000Z");
    });

    it("shows fulltext in comment block when present", () => {
      const itemWithFulltext: CslItem = {
        ...baseItem,
        custom: {
          uuid: baseItem.custom?.uuid ?? "",
          created_at: baseItem.custom?.created_at ?? "",
          timestamp: baseItem.custom?.timestamp ?? "",
          fulltext: {
            pdf: "Smith-2024-PMID12345678-550e8400.pdf",
          },
        },
      };
      const yaml = serializeToYaml([itemWithFulltext]);
      expect(yaml).toContain("# fulltext:");
      expect(yaml).toContain("#   pdf: Smith-2024-PMID12345678-550e8400.pdf");
    });

    it("does not include protected fields in editable content", () => {
      const yaml = serializeToYaml([baseItem]);
      // The uuid should only appear in comments, not in the editable content
      const editableSection = yaml.split("# ========================================")[1];
      expect(editableSection).not.toContain("uuid:");
      expect(editableSection).not.toContain("created_at:");
      expect(editableSection).not.toContain("timestamp:");
    });
  });

  describe("field transformations", () => {
    it("transforms issued date-parts to ISO string", () => {
      const itemWithDate: CslItem = {
        ...baseItem,
        issued: { "date-parts": [[2024, 3, 15]] },
      };
      const yaml = serializeToYaml([itemWithDate]);
      expect(yaml).toContain('issued: "2024-03-15"');
    });

    it("transforms accessed date-parts to ISO string", () => {
      const itemWithDate: CslItem = {
        ...baseItem,
        accessed: { "date-parts": [[2024, 1, 5]] },
      };
      const yaml = serializeToYaml([itemWithDate]);
      expect(yaml).toContain('accessed: "2024-01-05"');
    });

    it("handles partial dates (year only)", () => {
      const itemWithDate: CslItem = {
        ...baseItem,
        issued: { "date-parts": [[2024]] },
      };
      const yaml = serializeToYaml([itemWithDate]);
      expect(yaml).toContain('issued: "2024"');
    });

    it("handles partial dates (year-month)", () => {
      const itemWithDate: CslItem = {
        ...baseItem,
        issued: { "date-parts": [[2024, 3]] },
      };
      const yaml = serializeToYaml([itemWithDate]);
      // YAML may or may not quote the value
      expect(yaml).toMatch(/issued: "?2024-03"?/);
    });

    it("preserves keyword as array", () => {
      const itemWithKeywords: CslItem = {
        ...baseItem,
        keyword: ["machine learning", "deep learning"],
      };
      const yaml = serializeToYaml([itemWithKeywords]);
      expect(yaml).toContain("keyword:");
      expect(yaml).toContain("- machine learning");
      expect(yaml).toContain("- deep learning");
    });
  });

  describe("special characters and multi-line text", () => {
    it("handles special characters in title", () => {
      const itemWithSpecialChars: CslItem = {
        ...baseItem,
        title: 'Title with "quotes" and: colons',
      };
      const yaml = serializeToYaml([itemWithSpecialChars]);
      // Should be properly quoted
      expect(yaml).toContain("title:");
    });

    it("handles multi-line abstract", () => {
      const itemWithAbstract: CslItem = {
        ...baseItem,
        abstract: "First line\nSecond line\nThird line",
      };
      const yaml = serializeToYaml([itemWithAbstract]);
      expect(yaml).toContain("abstract:");
    });
  });
});
