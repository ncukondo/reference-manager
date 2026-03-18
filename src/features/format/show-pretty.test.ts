import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { NormalizedReference } from "./show-normalizer.js";
import { formatShowPretty } from "./show-pretty.js";

function makeNormalized(overrides: Partial<NormalizedReference> = {}): NormalizedReference {
  return {
    id: "Smith2020",
    uuid: "a1b2c3d4-e5f6",
    type: "journal-article",
    title: "Machine learning approaches in genomics",
    authors: ["Smith, J.", "Tanaka, K.", "Lee, M."],
    year: 2020,
    journal: "Nature Methods",
    volume: "17",
    issue: "3",
    page: "245-260",
    doi: "10.1038/s41592-020-0001-0",
    pmid: "32015508",
    pmcid: "PMC7123456",
    url: "https://doi.org/10.1038/s41592-020-0001-0",
    abstract:
      "Recent advances in machine learning have transformed\nthe analysis of genomic data...",
    tags: ["machine-learning", "genomics"],
    created: "2024-06-15T10:00:00Z",
    modified: "2024-09-01T14:30:00Z",
    fulltext: {
      pdf: "/home/user/.ref/files/Smith2020/fulltext.pdf",
      markdown: "/home/user/.ref/files/Smith2020/fulltext.md",
    },
    attachments: [{ filename: "supplement1.pdf", role: "supplement" }],
    raw: { id: "Smith2020", type: "journal-article" } as CslItem,
    ...overrides,
  };
}

describe("formatShowPretty", () => {
  it("shows header line with [id] title", () => {
    const result = formatShowPretty(makeNormalized());
    expect(result).toMatch(/^\[Smith2020\] Machine learning approaches in genomics/);
  });

  it("shows Type, Authors, Year, Journal fields", () => {
    const result = formatShowPretty(makeNormalized());
    expect(result).toContain("  Type:      journal-article");
    expect(result).toContain("  Authors:   Smith, J.; Tanaka, K.; Lee, M.");
    expect(result).toContain("  Year:      2020");
    expect(result).toContain("  Journal:   Nature Methods, 17(3), 245-260");
  });

  it("shows DOI, PMID, PMCID, URL when present", () => {
    const result = formatShowPretty(makeNormalized());
    expect(result).toContain("  DOI:       10.1038/s41592-020-0001-0");
    expect(result).toContain("  PMID:      32015508");
    expect(result).toContain("  PMCID:     PMC7123456");
    expect(result).toContain("  URL:       https://doi.org/10.1038/s41592-020-0001-0");
  });

  it("always shows UUID", () => {
    const result = formatShowPretty(makeNormalized());
    expect(result).toContain("  UUID:      a1b2c3d4-e5f6");
  });

  it("shows tags when present", () => {
    const result = formatShowPretty(makeNormalized());
    expect(result).toContain("  Tags:      machine-learning, genomics");
  });

  it("shows Added/Modified dates", () => {
    const result = formatShowPretty(makeNormalized());
    expect(result).toContain("  Added:     2024-06-15");
    expect(result).toContain("  Modified:  2024-09-01");
  });

  it("shows Fulltext section with pdf/markdown paths", () => {
    const result = formatShowPretty(makeNormalized());
    expect(result).toContain("  Fulltext:");
    expect(result).toContain("    pdf:      /home/user/.ref/files/Smith2020/fulltext.pdf");
    expect(result).toContain("    markdown: /home/user/.ref/files/Smith2020/fulltext.md");
  });

  it("shows Fulltext - when no fulltext", () => {
    const result = formatShowPretty(makeNormalized({ fulltext: { pdf: null, markdown: null } }));
    expect(result).toContain("  Fulltext:  -");
  });

  it("shows Fulltext partial (pdf only, markdown -)", () => {
    const result = formatShowPretty(
      makeNormalized({
        fulltext: { pdf: "/path/to/fulltext.pdf", markdown: null },
      })
    );
    expect(result).toContain("  Fulltext:");
    expect(result).toContain("    pdf:      /path/to/fulltext.pdf");
    expect(result).toContain("    markdown: -");
  });

  it("shows Files line for non-fulltext attachments", () => {
    const result = formatShowPretty(
      makeNormalized({
        attachments: [
          { filename: "supplement1.pdf", role: "supplement" },
          { filename: "data.csv", role: "supplement" },
        ],
      })
    );
    expect(result).toContain("  Files:     supplement (2 files)");
  });

  it("shows abstract at end when present", () => {
    const result = formatShowPretty(makeNormalized());
    const lines = result.split("\n");
    // Abstract should be near the end
    const abstractIdx = lines.findIndex((l) => l.trimStart().startsWith("Abstract:"));
    expect(abstractIdx).toBeGreaterThan(0);
    expect(lines[abstractIdx + 1]).toContain(
      "Recent advances in machine learning have transformed"
    );
  });

  it("omits absent optional fields (no noise)", () => {
    const result = formatShowPretty(
      makeNormalized({
        doi: null,
        pmid: null,
        pmcid: null,
        url: null,
        tags: null,
        abstract: null,
        fulltext: null,
        attachments: null,
        created: null,
        modified: null,
      })
    );
    expect(result).not.toContain("DOI:");
    expect(result).not.toContain("PMID:");
    expect(result).not.toContain("PMCID:");
    expect(result).not.toContain("URL:");
    expect(result).not.toContain("Tags:");
    expect(result).not.toContain("Abstract:");
    expect(result).not.toContain("Fulltext:");
    expect(result).not.toContain("Added:");
    expect(result).not.toContain("Modified:");
  });

  it("shows journal without volume/issue/page when absent", () => {
    const result = formatShowPretty(makeNormalized({ volume: null, issue: null, page: null }));
    expect(result).toContain("  Journal:   Nature Methods");
  });

  it("omits Authors line when absent", () => {
    const result = formatShowPretty(makeNormalized({ authors: null }));
    expect(result).not.toContain("Authors:");
  });
});
