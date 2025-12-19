import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { cite } from "./cite.js";

describe("cite command", () => {
  let mockStdout: string[];
  let mockStderr: string[];
  let originalStdoutWrite: typeof process.stdout.write;
  let originalStderrWrite: typeof process.stderr.write;

  beforeEach(() => {
    mockStdout = [];
    mockStderr = [];

    // Mock stdout/stderr
    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;

    // @ts-expect-error - mocking stdout.write
    process.stdout.write = vi.fn((chunk: string) => {
      mockStdout.push(chunk);
      return true;
    });

    // @ts-expect-error - mocking stderr.write
    process.stderr.write = vi.fn((chunk: string) => {
      mockStderr.push(chunk);
      return true;
    });
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });

  const createItem = (
    id: string,
    uuid: string,
    title: string,
    authorFamily: string,
    issued?: { "date-parts": [[number, number?, number?]] }
  ): CslItem => ({
    id,
    type: "article-journal",
    title,
    author: [{ family: authorFamily, given: "John" }],
    issued: issued || { "date-parts": [[2023]] },
    "container-title": "Test Journal",
    volume: "10",
    issue: "2",
    page: "123-145",
    DOI: "10.1234/example",
    custom: {
      uuid,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  });

  describe("single ID reference", () => {
    it("should generate bibliography for single ID (default APA style)", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await cite(items, ["smith2023"], {});

      const output = mockStdout.join("");
      // Should contain author, year, title, and DOI
      expect(output).toContain("Smith");
      expect(output).toContain("2023");
      expect(output).toContain("Test Article");
      expect(output).toContain("10.1234/example");
    });

    it("should generate in-text citation with --in-text", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await cite(items, ["smith2023"], { inText: true });

      const output = mockStdout.join("");
      // Should be in format like (Smith, 2023)
      expect(output).toContain("Smith");
      expect(output).toContain("2023");
      expect(output.length).toBeLessThan(50); // In-text citations are short
    });
  });

  describe("multiple ID references", () => {
    it("should generate bibliography for multiple IDs", async () => {
      const items: CslItem[] = [
        createItem("smith2023", "abc-123", "First Article", "Smith"),
        createItem("jones2024", "def-456", "Second Article", "Jones", {
          "date-parts": [[2024]],
        }),
      ];

      await cite(items, ["smith2023", "jones2024"], {});

      const output = mockStdout.join("");
      // Should contain both references
      expect(output).toContain("Smith");
      expect(output).toContain("First Article");
      expect(output).toContain("Jones");
      expect(output).toContain("Second Article");
    });

    it("should generate combined in-text citation for multiple IDs", async () => {
      const items: CslItem[] = [
        createItem("smith2023", "abc-123", "First Article", "Smith"),
        createItem("jones2024", "def-456", "Second Article", "Jones", {
          "date-parts": [[2024]],
        }),
      ];

      await cite(items, ["smith2023", "jones2024"], { inText: true });

      const output = mockStdout.join("");
      // Should contain both authors in a single citation
      expect(output).toContain("Smith");
      expect(output).toContain("Jones");
      expect(output).toContain("2023");
      expect(output).toContain("2024");
    });
  });

  describe("UUID lookup", () => {
    it("should resolve references by UUID with --uuid", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await cite(items, ["abc-123"], { uuid: true });

      const output = mockStdout.join("");
      expect(output).toContain("Smith");
      expect(output).toContain("Test Article");
    });

    it("should resolve multiple references by UUID", async () => {
      const items: CslItem[] = [
        createItem("smith2023", "abc-123", "First Article", "Smith"),
        createItem("jones2024", "def-456", "Second Article", "Jones", {
          "date-parts": [[2024]],
        }),
      ];

      await cite(items, ["abc-123", "def-456"], { uuid: true });

      const output = mockStdout.join("");
      expect(output).toContain("Smith");
      expect(output).toContain("Jones");
    });
  });

  describe("CSL style options", () => {
    it("should use custom style with --style", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      // Vancouver style has different format than APA
      await cite(items, ["smith2023"], { style: "vancouver" });

      const output = mockStdout.join("");
      // Vancouver typically uses numbered format or different author format
      expect(output).toContain("Smith");
      expect(output).toContain("Test Article");
    });

    it("should handle invalid style gracefully (uses default style)", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await cite(items, ["smith2023"], { style: "nonexistent-style" });

      const output = mockStdout.join("");

      // citation-js doesn't throw error for invalid styles, it uses default style
      // Should still output citation with author and year
      expect(output).toContain("Smith");
      expect(output).toContain("2023");
      expect(output).toContain("Test Article");
    });
  });

  describe("CSL file option", () => {
    it("should throw error when CSL file does not exist", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await expect(
        cite(items, ["smith2023"], { cslFile: "/nonexistent/style.csl" })
      ).rejects.toThrow("CSL file");
    });
  });

  describe("output formats", () => {
    it("should output text format by default", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await cite(items, ["smith2023"], {});

      const output = mockStdout.join("");
      // Text format should not contain HTML tags
      expect(output).not.toContain("<");
      expect(output).not.toContain(">");
      expect(output).toContain("Smith");
    });

    it("should output HTML format with --format html", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await cite(items, ["smith2023"], { format: "html" });

      const output = mockStdout.join("");
      // HTML format should contain div tags
      expect(output).toContain("<div");
      expect(output).toContain("</div>");
      expect(output).toContain("Smith");
    });

    it("should output RTF format with --format rtf", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await cite(items, ["smith2023"], { format: "rtf" });

      const output = mockStdout.join("");
      // RTF format should contain RTF control words
      expect(output).toMatch(/\\rtf/);
      expect(output).toContain("Smith");
    });

    it("should throw error for invalid format", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await expect(
        // @ts-expect-error - testing invalid format
        cite(items, ["smith2023"], { format: "invalid" })
      ).rejects.toThrow("Invalid format");
    });
  });

  describe("locale option", () => {
    it("should use custom locale with --locale", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      // Should not throw error with valid locale
      await cite(items, ["smith2023"], { locale: "ja-JP" });

      const output = mockStdout.join("");
      expect(output).toContain("Smith");
    });
  });

  describe("error handling", () => {
    it("should throw error when ID not found", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await expect(cite(items, ["nonexistent"], {})).rejects.toThrow(
        "Reference 'nonexistent' not found"
      );
    });

    it("should throw error when UUID not found", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await expect(cite(items, ["xyz-999"], { uuid: true })).rejects.toThrow(
        "Reference with UUID 'xyz-999' not found"
      );
    });

    it("should fail early when one of multiple IDs not found", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await expect(cite(items, ["smith2023", "nonexistent"], {})).rejects.toThrow(
        "Reference 'nonexistent' not found"
      );

      // Should not output partial results
      const output = mockStdout.join("");
      expect(output).toBe("");
    });

    it("should fail early when one of multiple UUIDs not found", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await expect(cite(items, ["abc-123", "xyz-999"], { uuid: true })).rejects.toThrow(
        "Reference with UUID 'xyz-999' not found"
      );

      // Should not output partial results
      const output = mockStdout.join("");
      expect(output).toBe("");
    });

    it("should handle empty library", async () => {
      const items: CslItem[] = [];

      await expect(cite(items, ["smith2023"], {})).rejects.toThrow(
        "Reference 'smith2023' not found"
      );
    });
  });

  describe("edge cases", () => {
    it("should handle references with minimal metadata", async () => {
      const items: CslItem[] = [
        {
          id: "minimal",
          type: "article",
          title: "Minimal Article",
          custom: {
            uuid: "min-123",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
          },
        },
      ];

      await cite(items, ["minimal"], {});

      const output = mockStdout.join("");
      expect(output).toContain("Minimal Article");
    });

    it("should handle references with multiple authors", async () => {
      const items: CslItem[] = [
        {
          id: "multiauthor",
          type: "article-journal",
          title: "Multi Author Article",
          author: [
            { family: "Smith", given: "John" },
            { family: "Jones", given: "Jane" },
            { family: "Doe", given: "Alice" },
          ],
          issued: { "date-parts": [[2023]] },
          custom: {
            uuid: "multi-123",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
          },
        },
      ];

      await cite(items, ["multiauthor"], {});

      const output = mockStdout.join("");
      expect(output).toContain("Smith");
      expect(output).toContain("Multi Author Article");
    });
  });

  describe("integration with fallback formatter", () => {
    it("should use fallback formatter when CSL processor fails", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      // Trigger fallback by using invalid style
      await cite(items, ["smith2023"], { style: "invalid-style-trigger-fallback" });

      const output = mockStdout.join("");
      const error = mockStderr.join("");

      // Should warn about fallback
      expect(error).toContain("falling back");

      // Should use simplified AMA-like format
      // Format: FirstAuthor [et al]. JournalAbbrev. YYYY;volume(issue):pages. DOI:xxx. Title.
      expect(output).toContain("Smith");
      expect(output).toContain("2023");
      expect(output).toContain("Test Article");
    });

    it("should use fallback for in-text when CSL processor fails", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      await cite(items, ["smith2023"], {
        style: "invalid-style",
        inText: true,
      });

      const output = mockStdout.join("");
      const error = mockStderr.join("");

      // Should warn about fallback
      expect(error).toContain("falling back");

      // Fallback in-text format: (FirstAuthor [et al], YYYY)
      expect(output).toContain("Smith");
      expect(output).toContain("2023");
    });
  });

  describe("configuration integration", () => {
    it("should respect default style from config", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      // When no --style option is provided, should use default from config
      // (This will be tested via integration tests with actual config)
      await cite(items, ["smith2023"], {});

      const output = mockStdout.join("");
      expect(output).toContain("Smith");
      expect(output).toContain("2023");
    });

    it("should override config with command-line options", async () => {
      const items: CslItem[] = [createItem("smith2023", "abc-123", "Test Article", "Smith")];

      // Command-line --style should override config default_style
      await cite(items, ["smith2023"], { style: "vancouver" });

      const output = mockStdout.join("");
      expect(output).toContain("Smith");
    });
  });
});
