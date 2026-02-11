import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { buildResourceIndicators } from "./resource-indicators.js";

describe("buildResourceIndicators", () => {
  const baseItem: CslItem = {
    id: "test-2024",
    type: "article-journal",
    title: "Test Article",
  };

  it("should return empty string for item with no resources", () => {
    const result = buildResourceIndicators(baseItem);
    expect(result).toBe("");
  });

  it("should return pdf for item with fulltext PDF", () => {
    const item: CslItem = {
      ...baseItem,
      custom: {
        attachments: {
          directory: "test-dir",
          files: [{ filename: "fulltext.pdf", role: "fulltext" }],
        },
      },
    };
    const result = buildResourceIndicators(item);
    expect(result).toBe("pdf");
  });

  it("should return md for item with fulltext Markdown", () => {
    const item: CslItem = {
      ...baseItem,
      custom: {
        attachments: {
          directory: "test-dir",
          files: [{ filename: "fulltext.md", role: "fulltext" }],
        },
      },
    };
    const result = buildResourceIndicators(item);
    expect(result).toBe("md");
  });

  it("should return md for item with .markdown extension", () => {
    const item: CslItem = {
      ...baseItem,
      custom: {
        attachments: {
          directory: "test-dir",
          files: [{ filename: "fulltext.markdown", role: "fulltext" }],
        },
      },
    };
    const result = buildResourceIndicators(item);
    expect(result).toBe("md");
  });

  it("should return pdf md for item with both fulltext formats", () => {
    const item: CslItem = {
      ...baseItem,
      custom: {
        attachments: {
          directory: "test-dir",
          files: [
            { filename: "fulltext.pdf", role: "fulltext" },
            { filename: "fulltext.md", role: "fulltext" },
          ],
        },
      },
    };
    const result = buildResourceIndicators(item);
    expect(result).toBe("pdf md");
  });

  it("should return file for item with non-fulltext attachments", () => {
    const item: CslItem = {
      ...baseItem,
      custom: {
        attachments: {
          directory: "test-dir",
          files: [{ filename: "supplement.pdf", role: "supplement" }],
        },
      },
    };
    const result = buildResourceIndicators(item);
    expect(result).toBe("file");
  });

  it("should return pdf file for item with fulltext and other attachments", () => {
    const item: CslItem = {
      ...baseItem,
      custom: {
        attachments: {
          directory: "test-dir",
          files: [
            { filename: "fulltext.pdf", role: "fulltext" },
            { filename: "supplement.pdf", role: "supplement" },
          ],
        },
      },
    };
    const result = buildResourceIndicators(item);
    expect(result).toBe("pdf file");
  });

  it("should return url for item with URL", () => {
    const item: CslItem = {
      ...baseItem,
      URL: "https://example.com",
    };
    const result = buildResourceIndicators(item);
    expect(result).toBe("url");
  });

  it("should return tag for item with tags", () => {
    const item: CslItem = {
      ...baseItem,
      custom: {
        tags: ["machine-learning", "medicine"],
      },
    };
    const result = buildResourceIndicators(item);
    expect(result).toBe("tag");
  });

  it("should return pdf md file url tag for item with all resources", () => {
    const item: CslItem = {
      ...baseItem,
      URL: "https://example.com",
      custom: {
        tags: ["ml"],
        attachments: {
          directory: "test-dir",
          files: [
            { filename: "fulltext.pdf", role: "fulltext" },
            { filename: "fulltext.md", role: "fulltext" },
            { filename: "notes.txt", role: "notes" },
          ],
        },
      },
    };
    const result = buildResourceIndicators(item);
    expect(result).toBe("pdf md file url tag");
  });

  it("should maintain fixed label order regardless of data order", () => {
    const item: CslItem = {
      ...baseItem,
      URL: "https://example.com",
      custom: {
        tags: ["ml"],
        attachments: {
          directory: "test-dir",
          files: [
            { filename: "notes.txt", role: "notes" },
            { filename: "fulltext.md", role: "fulltext" },
            { filename: "fulltext.pdf", role: "fulltext" },
          ],
        },
      },
    };
    const result = buildResourceIndicators(item);
    expect(result).toBe("pdf md file url tag");
  });

  it("should not show file when only fulltext attachments exist", () => {
    const item: CslItem = {
      ...baseItem,
      custom: {
        attachments: {
          directory: "test-dir",
          files: [
            { filename: "fulltext.pdf", role: "fulltext" },
            { filename: "fulltext.md", role: "fulltext" },
          ],
        },
      },
    };
    const result = buildResourceIndicators(item);
    expect(result).not.toContain("file");
  });

  it("should return empty string for item with empty tags array", () => {
    const item: CslItem = {
      ...baseItem,
      custom: {
        tags: [],
      },
    };
    const result = buildResourceIndicators(item);
    expect(result).toBe("");
  });

  it("should return empty string for item with empty attachments files", () => {
    const item: CslItem = {
      ...baseItem,
      custom: {
        attachments: {
          directory: "test-dir",
          files: [],
        },
      },
    };
    const result = buildResourceIndicators(item);
    expect(result).toBe("");
  });
});
