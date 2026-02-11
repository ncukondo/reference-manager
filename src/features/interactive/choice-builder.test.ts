import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { formatSource, toChoice } from "./choice-builder.js";

describe("formatSource", () => {
  const baseItem: CslItem = {
    id: "test-2024",
    type: "article-journal",
    title: "Test Article",
  };

  it("should return container-title-short when available", () => {
    const item: CslItem = {
      ...baseItem,
      "container-title-short": "J Med Inform",
      "container-title": "Journal of Medical Informatics",
    };
    expect(formatSource(item)).toBe("J Med Inform");
  });

  it("should return container-title when container-title-short is not available", () => {
    const item: CslItem = {
      ...baseItem,
      "container-title": "Journal of Medical Informatics",
    };
    expect(formatSource(item)).toBe("Journal of Medical Informatics");
  });

  it("should return formatted type for article without container title", () => {
    expect(formatSource(baseItem)).toBe("Journal article");
  });

  it("should return publisher for book type with publisher", () => {
    const item: CslItem = {
      ...baseItem,
      type: "book",
      publisher: "Cambridge University Press",
    };
    expect(formatSource(item)).toBe("Cambridge University Press");
  });

  it("should return Book for book type without publisher", () => {
    const item: CslItem = {
      ...baseItem,
      type: "book",
    };
    expect(formatSource(item)).toBe("Book");
  });

  it("should return container-title for chapter type", () => {
    const item: CslItem = {
      ...baseItem,
      type: "chapter",
      "container-title": "Advanced AI Textbook",
    };
    expect(formatSource(item)).toBe("Advanced AI Textbook");
  });

  it("should return Thesis for thesis type without container title", () => {
    const item: CslItem = {
      ...baseItem,
      type: "thesis",
    };
    expect(formatSource(item)).toBe("Thesis");
  });

  it("should return Report for report type without container title", () => {
    const item: CslItem = {
      ...baseItem,
      type: "report",
    };
    expect(formatSource(item)).toBe("Report");
  });

  it("should return Web page for webpage type without container title", () => {
    const item: CslItem = {
      ...baseItem,
      type: "webpage",
    };
    expect(formatSource(item)).toBe("Web page");
  });
});

describe("toChoice", () => {
  const baseItem: CslItem = {
    id: "test-2024",
    type: "article-journal",
    title: "Test Article",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2024]] },
    DOI: "10.1234/test",
  };

  it("should prepend indicators to meta when item has resources", () => {
    const item: CslItem = {
      ...baseItem,
      URL: "https://example.com",
      custom: {
        tags: ["ml"],
        attachments: {
          directory: "test-dir",
          files: [{ filename: "fulltext.pdf", role: "fulltext" }],
        },
      },
    };
    const choice = toChoice(item);
    expect(choice.meta).toMatch(/^pdf url tag · /);
  });

  it("should not modify meta when item has no resources", () => {
    const choice = toChoice(baseItem);
    expect(choice.meta).not.toMatch(/^pdf|^md|^file|^url|^tag/);
  });

  it("should use container-title-short in meta for journal articles", () => {
    const item: CslItem = {
      ...baseItem,
      "container-title-short": "J Med Inform",
    };
    const choice = toChoice(item);
    expect(choice.meta).toContain("J Med Inform");
    expect(choice.meta).not.toContain("Journal article");
  });

  it("should use publisher for book without container-title", () => {
    const item: CslItem = {
      ...baseItem,
      type: "book",
      publisher: "Cambridge University Press",
    };
    const choice = toChoice(item);
    expect(choice.meta).toContain("Cambridge University Press");
  });

  it("should include year in meta", () => {
    const choice = toChoice(baseItem);
    expect(choice.meta).toContain("2024");
  });

  it("should include identifiers in meta", () => {
    const choice = toChoice(baseItem);
    expect(choice.meta).toContain("DOI: 10.1234/test");
  });

  it("should set title, subtitle, id, and value correctly", () => {
    const choice = toChoice(baseItem);
    expect(choice.id).toBe("test-2024");
    expect(choice.title).toBe("Test Article");
    expect(choice.subtitle).toBe("Smith, J.");
    expect(choice.value).toBe(baseItem);
  });

  it("should handle item without title", () => {
    const item: CslItem = { ...baseItem, title: undefined };
    const choice = toChoice(item);
    expect(choice.title).toBe("(No title)");
  });

  it("should handle item without authors", () => {
    const item: CslItem = { ...baseItem, author: undefined };
    const choice = toChoice(item);
    expect(choice.subtitle).toBe("(No authors)");
  });
});
