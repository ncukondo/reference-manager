import { describe, expect, it } from "vitest";
import { generateFilename, parseFilename, slugifyLabel } from "./filename.js";

describe("slugifyLabel", () => {
  it("should convert to lowercase", () => {
    expect(slugifyLabel("Table S1")).toBe("table-s1");
  });

  it("should replace spaces with hyphens", () => {
    expect(slugifyLabel("Reading Notes")).toBe("reading-notes");
  });

  it("should remove special characters", () => {
    expect(slugifyLabel("Table (S1)")).toBe("table-s1");
  });

  it("should collapse multiple hyphens", () => {
    expect(slugifyLabel("Table  S1")).toBe("table-s1");
  });

  it("should trim leading/trailing hyphens", () => {
    expect(slugifyLabel(" Table S1 ")).toBe("table-s1");
  });

  it("should handle already slugified labels", () => {
    expect(slugifyLabel("table-s1")).toBe("table-s1");
  });

  it("should handle empty string", () => {
    expect(slugifyLabel("")).toBe("");
  });
});

describe("generateFilename", () => {
  it("should generate filename without label", () => {
    expect(generateFilename("fulltext", "pdf")).toBe("fulltext.pdf");
  });

  it("should generate filename with label", () => {
    expect(generateFilename("supplement", "xlsx", "Table S1")).toBe("supplement-table-s1.xlsx");
  });

  it("should handle markdown extension", () => {
    expect(generateFilename("notes", "md")).toBe("notes.md");
  });

  it("should slugify label with special characters", () => {
    expect(generateFilename("draft", "pdf", "Initial (v1)")).toBe("draft-initial-v1.pdf");
  });

  it("should handle custom role", () => {
    expect(generateFilename("slides", "pdf", "Conference 2024")).toBe("slides-conference-2024.pdf");
  });
});

describe("parseFilename", () => {
  it("should parse filename without label", () => {
    const result = parseFilename("fulltext.pdf");
    expect(result).toEqual({
      role: "fulltext",
      ext: "pdf",
      label: undefined,
    });
  });

  it("should parse filename with label", () => {
    const result = parseFilename("supplement-table-s1.xlsx");
    expect(result).toEqual({
      role: "supplement",
      ext: "xlsx",
      label: "table-s1",
    });
  });

  it("should parse notes filename", () => {
    const result = parseFilename("notes-reading-analysis.md");
    expect(result).toEqual({
      role: "notes",
      ext: "md",
      label: "reading-analysis",
    });
  });

  it("should parse draft filename", () => {
    const result = parseFilename("draft-v1.pdf");
    expect(result).toEqual({
      role: "draft",
      ext: "pdf",
      label: "v1",
    });
  });

  it("should parse custom role filename", () => {
    const result = parseFilename("slides-conference-2024.pdf");
    expect(result).toEqual({
      role: "slides",
      ext: "pdf",
      label: "conference-2024",
    });
  });

  it("should handle filename without extension", () => {
    const result = parseFilename("notes");
    expect(result).toEqual({
      role: "notes",
      ext: "",
      label: undefined,
    });
  });

  it("should handle complex extension", () => {
    const result = parseFilename("data-results.tar.gz");
    expect(result).toEqual({
      role: "data",
      ext: "gz",
      label: "results.tar",
    });
  });

  it("should return null for empty filename", () => {
    expect(parseFilename("")).toBeNull();
  });
});
