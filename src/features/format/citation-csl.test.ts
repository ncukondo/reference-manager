import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { formatBibliographyCSL, formatInTextCSL } from "./citation-csl.js";

describe("CSL Processor Wrapper", () => {
  const sampleItem1: CslItem = {
    id: "smith-2023",
    type: "article-journal",
    title: "Machine Learning in Medical Diagnosis",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2023]] },
    "container-title": "Journal of Medical Informatics",
    volume: "10",
    issue: "2",
    page: "123-145",
    DOI: "10.1234/jmi.2023.0045",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440001",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const sampleItem2: CslItem = {
    id: "jones-2024",
    type: "article-journal",
    title: "Deep Learning for Image Analysis",
    author: [
      { family: "Jones", given: "Bob" },
      { family: "Williams", given: "Mary" },
    ],
    issued: { "date-parts": [[2024]] },
    "container-title": "Science",
    volume: "15",
    issue: "3",
    page: "200-210",
    DOI: "10.1234/science.2024.0123",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440002",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  describe("formatBibliographyCSL", () => {
    describe("basic functionality", () => {
      it("should format empty array as empty string", () => {
        const result = formatBibliographyCSL([], {});
        expect(result).toBe("");
      });

      it("should format single item with default APA style (text format)", () => {
        const result = formatBibliographyCSL([sampleItem1], {});
        // APA format should include author, year, title, journal, volume(issue), pages, DOI
        expect(result).toContain("Smith, J.");
        expect(result).toContain("2023");
        expect(result).toContain("Machine Learning in Medical Diagnosis");
        expect(result).toContain("Journal of Medical Informatics");
      });

      it("should format multiple items separated by newlines", () => {
        const result = formatBibliographyCSL([sampleItem1, sampleItem2], {});
        // Should contain both citations
        expect(result).toContain("Smith, J.");
        expect(result).toContain("Jones, B.");
        // Should have newline separation (CSL typically uses \n\n for entries)
        expect(result.split("\n").length).toBeGreaterThan(1);
      });
    });

    describe("CSL styles", () => {
      it("should format with APA style when specified", () => {
        const result = formatBibliographyCSL([sampleItem1], { style: "apa" });
        expect(result).toContain("Smith, J.");
        expect(result).toContain("(2023)");
      });

      it("should format with Vancouver style when specified", () => {
        const result = formatBibliographyCSL([sampleItem1], {
          style: "vancouver",
        });
        // Vancouver uses numbered format: 1. Smith J...
        expect(result).toMatch(/\d+\.\s+Smith J/);
      });

      it("should format with Chicago style when specified", () => {
        const result = formatBibliographyCSL([sampleItem1], {
          style: "chicago",
        });
        expect(result).toContain("Smith");
        expect(result).toContain("2023");
      });

      it("should format with Harvard style when specified", () => {
        const result = formatBibliographyCSL([sampleItem1], {
          style: "harvard",
        });
        expect(result).toContain("Smith");
        expect(result).toContain("2023");
      });

      it("should format with MLA style when specified", () => {
        const result = formatBibliographyCSL([sampleItem1], { style: "mla" });
        expect(result).toContain("Smith");
      });

      it("should format with AMA style when specified", () => {
        const result = formatBibliographyCSL([sampleItem1], { style: "ama" });
        expect(result).toContain("Smith");
      });
    });

    describe("output formats", () => {
      it("should output plain text format by default", () => {
        const result = formatBibliographyCSL([sampleItem1], {});
        // Plain text should not contain HTML tags
        expect(result).not.toMatch(/<[^>]+>/);
      });

      it("should output HTML format when specified", () => {
        const result = formatBibliographyCSL([sampleItem1], {
          format: "html",
        });
        // HTML output should contain div with csl-entry class
        expect(result).toContain("<div");
        expect(result).toContain("csl-");
      });

      it("should output RTF format when specified", () => {
        const result = formatBibliographyCSL([sampleItem1], { format: "rtf" });
        // RTF should start with {\rtf
        expect(result).toMatch(/\{\\rtf/);
      });

      it("should output text format when explicitly specified", () => {
        const result = formatBibliographyCSL([sampleItem1], {
          format: "text",
        });
        // Plain text should not contain HTML or RTF markup
        expect(result).not.toMatch(/<[^>]+>/);
        expect(result).not.toMatch(/\{\\rtf/);
      });
    });

    describe("locale support", () => {
      it("should use en-US locale by default", () => {
        const result = formatBibliographyCSL([sampleItem1], {});
        // Should format successfully (no errors)
        expect(result).toBeTruthy();
      });

      it("should use specified locale", () => {
        const result = formatBibliographyCSL([sampleItem1], {
          locale: "en-GB",
        });
        // Should format successfully with British English
        expect(result).toBeTruthy();
      });
    });

    describe("error handling", () => {
      it("should fall back to simplified format when CSL style not found", () => {
        const result = formatBibliographyCSL([sampleItem1], {
          style: "nonexistent-style-xyz",
        });
        // Citation.js may still process with a default style, or fall back
        // Either way, should produce output with author and year
        expect(result).toBeTruthy();
        expect(result).toContain("Smith");
        expect(result).toContain("2023");
      });

      it("should fall back to simplified format on CSL processing error", () => {
        // Invalid CSL-JSON item (missing required fields for CSL processing)
        const invalidItem: CslItem = {
          id: "invalid",
          type: "article-journal",
          custom: {
            uuid: "550e8400-e29b-41d4-a716-446655440003",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
          },
        };

        const result = formatBibliographyCSL([invalidItem], {});
        // Should fall back to simplified format
        expect(result).toBeTruthy();
      });

      it("should handle items with minimal fields gracefully", () => {
        const minimalItem: CslItem = {
          id: "minimal",
          type: "article-journal",
          title: "Minimal Article",
          custom: {
            uuid: "550e8400-e29b-41d4-a716-446655440004",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
          },
        };

        const result = formatBibliographyCSL([minimalItem], {});
        expect(result).toContain("Minimal Article");
      });
    });
  });

  describe("formatInTextCSL", () => {
    describe("basic functionality", () => {
      it("should format empty array as empty string", () => {
        const result = formatInTextCSL([], {});
        expect(result).toBe("");
      });

      it("should format single item with default APA style", () => {
        const result = formatInTextCSL([sampleItem1], {});
        // APA in-text: (Smith, 2023)
        expect(result).toMatch(/\(.*Smith.*2023.*\)/);
      });

      it("should format multiple items with semicolon separation", () => {
        const result = formatInTextCSL([sampleItem1, sampleItem2], {});
        // APA in-text for multiple: items are sorted by CSL processor
        // Should contain both items with parentheses
        expect(result).toContain("Smith");
        expect(result).toContain("2023");
        expect(result).toContain("Jones");
        expect(result).toContain("2024");
        expect(result).toMatch(/^\(/); // starts with (
        expect(result).toMatch(/\)$/); // ends with )
      });
    });

    describe("CSL styles", () => {
      it("should format with APA style", () => {
        const result = formatInTextCSL([sampleItem1], { style: "apa" });
        expect(result).toContain("Smith");
        expect(result).toContain("2023");
      });

      it("should format with Vancouver style (numbered)", () => {
        const result = formatInTextCSL([sampleItem1], { style: "vancouver" });
        // Vancouver in-text is numbered (format may be (1) or [1])
        expect(result).toMatch(/[\[\(]\d+[\]\)]/);
      });

      it("should format with Chicago style", () => {
        const result = formatInTextCSL([sampleItem1], { style: "chicago" });
        expect(result).toContain("Smith");
        expect(result).toContain("2023");
      });
    });

    describe("output formats", () => {
      it("should output plain text by default", () => {
        const result = formatInTextCSL([sampleItem1], {});
        expect(result).not.toMatch(/<[^>]+>/);
      });

      it("should output HTML when specified", () => {
        const result = formatInTextCSL([sampleItem1], { format: "html" });
        // In-text citations might have <span> or other markup
        expect(result).toBeTruthy();
      });

      it("should output RTF when specified", () => {
        const result = formatInTextCSL([sampleItem1], { format: "rtf" });
        expect(result).toBeTruthy();
      });
    });

    describe("error handling", () => {
      it("should fall back to simplified format when CSL style not found", () => {
        const result = formatInTextCSL([sampleItem1], {
          style: "nonexistent-style-xyz",
        });
        // Fallback format: (Smith et al, 2023) or similar
        expect(result).toBeTruthy();
        expect(result).toContain("Smith");
        expect(result).toContain("2023");
      });

      it("should fall back to simplified format on processing error", () => {
        const invalidItem: CslItem = {
          id: "invalid",
          type: "article-journal",
          custom: {
            uuid: "550e8400-e29b-41d4-a716-446655440003",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
          },
        };

        const result = formatInTextCSL([invalidItem], {});
        // Should produce some output even with fallback
        expect(result).toBeTruthy();
      });
    });
  });

  describe("integration", () => {
    it("should work with same items for both bibliography and in-text", () => {
      const bibliography = formatBibliographyCSL([sampleItem1], {});
      const inText = formatInTextCSL([sampleItem1], {});

      // Both should contain author and year
      expect(bibliography).toContain("Smith");
      expect(bibliography).toContain("2023");
      expect(inText).toContain("Smith");
      expect(inText).toContain("2023");

      // Bibliography should be longer (has more details)
      expect(bibliography.length).toBeGreaterThan(inText.length);
    });

    it("should maintain consistency across different calls", () => {
      const result1 = formatBibliographyCSL([sampleItem1], { style: "apa" });
      const result2 = formatBibliographyCSL([sampleItem1], { style: "apa" });

      expect(result1).toBe(result2);
    });
  });
});
