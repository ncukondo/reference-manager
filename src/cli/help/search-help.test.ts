import { describe, expect, it } from "vitest";
import { buildNoResultsHintText, buildSearchHelpText } from "./search-help.js";

describe("buildSearchHelpText", () => {
  const helpText = buildSearchHelpText();

  describe("QUERY SYNTAX section", () => {
    it("should include QUERY SYNTAX header", () => {
      expect(helpText).toContain("QUERY SYNTAX");
    });

    it("should document free text search", () => {
      expect(helpText).toMatch(/Free text/);
    });

    it("should document phrase search", () => {
      expect(helpText).toMatch(/Phrase/);
      expect(helpText).toContain('"machine learning"');
    });

    it("should document field search", () => {
      expect(helpText).toMatch(/Field/);
      expect(helpText).toContain("author:Smith");
    });

    it("should document field with phrase search", () => {
      expect(helpText).toContain('author:"John Smith"');
    });
  });

  describe("FIELDS section", () => {
    it("should include FIELDS header", () => {
      expect(helpText).toContain("FIELDS");
    });

    it("should list all searchable fields", () => {
      const fields = [
        "author",
        "title",
        "year",
        "doi",
        "pmid",
        "pmcid",
        "isbn",
        "url",
        "keyword",
        "tag",
        "id",
      ];
      for (const field of fields) {
        expect(helpText).toContain(field);
      }
    });
  });

  describe("CASE SENSITIVITY section", () => {
    it("should include CASE SENSITIVITY header", () => {
      expect(helpText).toContain("CASE SENSITIVITY");
    });

    it("should explain consecutive uppercase rule", () => {
      expect(helpText).toMatch(/[Cc]onsecutive uppercase/);
    });

    it("should include AI example", () => {
      expect(helpText).toContain("AI");
    });

    it("should include RNA example", () => {
      expect(helpText).toContain("RNA");
    });
  });

  describe("EXAMPLES section", () => {
    it("should include EXAMPLES header", () => {
      expect(helpText).toContain("EXAMPLES");
    });

    it("should include example commands", () => {
      expect(helpText).toContain("ref search");
    });

    it("should include TUI example", () => {
      expect(helpText).toContain("--tui");
    });

    it("should include field search example", () => {
      expect(helpText).toContain("author:Smith");
    });
  });

  describe("formatting", () => {
    it("should start with a newline for proper spacing after options", () => {
      expect(helpText).toMatch(/^\n/);
    });
  });
});

describe("buildNoResultsHintText", () => {
  it("should include the query string", () => {
    const hint = buildNoResultsHintText("machine learning");
    expect(hint).toContain('"machine learning"');
  });

  it("should mention partial match fields", () => {
    const hint = buildNoResultsHintText("test");
    for (const field of ["author", "title", "year", "keyword", "tag"]) {
      expect(hint).toContain(field);
    }
  });

  it("should mention exact match fields", () => {
    const hint = buildNoResultsHintText("test");
    for (const field of ["id", "doi", "pmid", "pmcid", "isbn", "url"]) {
      expect(hint).toContain(field);
    }
  });

  it("should include concrete examples", () => {
    const hint = buildNoResultsHintText("test");
    expect(hint).toContain("id:smith2023");
    expect(hint).toContain("author:Smith");
  });

  it("should reference --help", () => {
    const hint = buildNoResultsHintText("test");
    expect(hint).toContain("--help");
  });
});
