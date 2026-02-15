import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { checkReference } from "./checker.js";
import type { CrossrefResult } from "./crossref-client.js";

// Mock crossref-client
vi.mock("./crossref-client.js", () => ({
  queryCrossref: vi.fn(),
}));

// Mock pubmed-client
vi.mock("./pubmed-client.js", () => ({
  queryPubmed: vi.fn(),
}));

describe("checkReference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return skipped for references without DOI or PMID", async () => {
    const item: CslItem = {
      id: "test-2024",
      type: "article-journal",
      title: "Test Article",
      custom: { uuid: "uuid-1" },
    };

    const result = await checkReference(item);

    expect(result.status).toBe("skipped");
    expect(result.findings).toHaveLength(0);
    expect(result.checkedSources).toHaveLength(0);
  });

  it("should detect retraction via Crossref", async () => {
    const { queryCrossref } = await import("./crossref-client.js");
    const mockQuery = vi.mocked(queryCrossref);
    mockQuery.mockResolvedValueOnce({
      success: true,
      updates: [
        {
          type: "retraction",
          doi: "10.1234/retraction",
          date: "2024-06-01",
        },
      ],
    } as CrossrefResult);

    const item: CslItem = {
      id: "retracted-2024",
      type: "article-journal",
      DOI: "10.1234/test",
      custom: { uuid: "uuid-2" },
    };

    const result = await checkReference(item);

    expect(result.status).toBe("warning");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].type).toBe("retracted");
    expect(result.findings[0].details?.retractionDoi).toBe("10.1234/retraction");
    expect(result.findings[0].details?.retractionDate).toBe("2024-06-01");
    expect(result.checkedSources).toContain("crossref");
  });

  it("should detect expression of concern via Crossref", async () => {
    const { queryCrossref } = await import("./crossref-client.js");
    const mockQuery = vi.mocked(queryCrossref);
    mockQuery.mockResolvedValueOnce({
      success: true,
      updates: [
        {
          type: "expression-of-concern",
          doi: "10.1234/concern",
          date: "2024-03-15",
        },
      ],
    } as CrossrefResult);

    const item: CslItem = {
      id: "concern-2024",
      type: "article-journal",
      DOI: "10.1234/test",
      custom: { uuid: "uuid-3" },
    };

    const result = await checkReference(item);

    expect(result.status).toBe("warning");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].type).toBe("concern");
  });

  it("should detect version change via Crossref", async () => {
    const { queryCrossref } = await import("./crossref-client.js");
    const mockQuery = vi.mocked(queryCrossref);
    mockQuery.mockResolvedValueOnce({
      success: true,
      updates: [
        {
          type: "new_version",
          doi: "10.5678/published",
          date: "2024-09-01",
        },
      ],
    } as CrossrefResult);

    const item: CslItem = {
      id: "preprint-2024",
      type: "article-journal",
      DOI: "10.1234/preprint",
      custom: { uuid: "uuid-4" },
    };

    const result = await checkReference(item);

    expect(result.status).toBe("warning");
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].type).toBe("version_changed");
    expect(result.findings[0].details?.newDoi).toBe("10.5678/published");
  });

  it("should return ok when no issues found", async () => {
    const { queryCrossref } = await import("./crossref-client.js");
    const mockQuery = vi.mocked(queryCrossref);
    mockQuery.mockResolvedValueOnce({
      success: true,
      updates: [],
    } as CrossrefResult);

    const item: CslItem = {
      id: "clean-2024",
      type: "article-journal",
      DOI: "10.1234/clean",
      custom: { uuid: "uuid-5" },
    };

    const result = await checkReference(item);

    expect(result.status).toBe("ok");
    expect(result.findings).toHaveLength(0);
    expect(result.checkedSources).toContain("crossref");
  });

  it("should handle Crossref API errors gracefully", async () => {
    const { queryCrossref } = await import("./crossref-client.js");
    const mockQuery = vi.mocked(queryCrossref);
    mockQuery.mockResolvedValueOnce({
      success: false,
      error: "Network error",
    } as CrossrefResult);

    const item: CslItem = {
      id: "error-2024",
      type: "article-journal",
      DOI: "10.1234/test",
      custom: { uuid: "uuid-6" },
    };

    const result = await checkReference(item);

    // Even with API errors, the check completes (it just reports ok with no findings)
    expect(result.status).toBe("ok");
    expect(result.checkedSources).toContain("crossref");
  });

  it("should include correct id, uuid, and checkedAt", async () => {
    const { queryCrossref } = await import("./crossref-client.js");
    const mockQuery = vi.mocked(queryCrossref);
    mockQuery.mockResolvedValueOnce({
      success: true,
      updates: [],
    } as CrossrefResult);

    const item: CslItem = {
      id: "meta-2024",
      type: "article-journal",
      DOI: "10.1234/meta",
      custom: { uuid: "test-uuid-123" },
    };

    const result = await checkReference(item);

    expect(result.id).toBe("meta-2024");
    expect(result.uuid).toBe("test-uuid-123");
    expect(result.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("should handle multiple findings from Crossref", async () => {
    const { queryCrossref } = await import("./crossref-client.js");
    const mockQuery = vi.mocked(queryCrossref);
    mockQuery.mockResolvedValueOnce({
      success: true,
      updates: [
        {
          type: "retraction",
          doi: "10.1234/retraction",
          date: "2024-06-01",
        },
        {
          type: "expression-of-concern",
          doi: "10.1234/concern",
          date: "2024-03-01",
        },
      ],
    } as CrossrefResult);

    const item: CslItem = {
      id: "multi-2024",
      type: "article-journal",
      DOI: "10.1234/test",
      custom: { uuid: "uuid-7" },
    };

    const result = await checkReference(item);

    expect(result.status).toBe("warning");
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0].type).toBe("retracted");
    expect(result.findings[1].type).toBe("concern");
  });

  describe("PubMed integration", () => {
    it("should use PubMed for PMID-only references", async () => {
      const { queryPubmed } = await import("./pubmed-client.js");
      const mockPubmed = vi.mocked(queryPubmed);
      mockPubmed.mockResolvedValueOnce({
        success: true,
        isRetracted: true,
        hasConcern: false,
      });

      const item: CslItem = {
        id: "pmid-only-2024",
        type: "article-journal",
        PMID: "12345678",
        custom: { uuid: "uuid-pmid" },
      };

      const result = await checkReference(item);

      expect(result.status).toBe("warning");
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].type).toBe("retracted");
      expect(result.checkedSources).toContain("pubmed");
      expect(result.checkedSources).not.toContain("crossref");
    });

    it("should use both Crossref and PubMed when both DOI and PMID present", async () => {
      const { queryCrossref } = await import("./crossref-client.js");
      const { queryPubmed } = await import("./pubmed-client.js");
      const mockCrossref = vi.mocked(queryCrossref);
      const mockPubmed = vi.mocked(queryPubmed);

      mockCrossref.mockResolvedValueOnce({
        success: true,
        updates: [],
      });
      mockPubmed.mockResolvedValueOnce({
        success: true,
        isRetracted: false,
        hasConcern: false,
      });

      const item: CslItem = {
        id: "both-2024",
        type: "article-journal",
        DOI: "10.1234/test",
        PMID: "12345678",
        custom: { uuid: "uuid-both" },
      };

      const result = await checkReference(item);

      expect(result.checkedSources).toContain("crossref");
      expect(result.checkedSources).toContain("pubmed");
    });

    it("should detect PubMed expression of concern", async () => {
      const { queryPubmed } = await import("./pubmed-client.js");
      const mockPubmed = vi.mocked(queryPubmed);
      mockPubmed.mockResolvedValueOnce({
        success: true,
        isRetracted: false,
        hasConcern: true,
      });

      const item: CslItem = {
        id: "concern-pmid-2024",
        type: "article-journal",
        PMID: "12345678",
        custom: { uuid: "uuid-concern-pmid" },
      };

      const result = await checkReference(item);

      expect(result.status).toBe("warning");
      expect(result.findings).toHaveLength(1);
      expect(result.findings[0].type).toBe("concern");
    });

    it("should handle PubMed API errors gracefully", async () => {
      const { queryPubmed } = await import("./pubmed-client.js");
      const mockPubmed = vi.mocked(queryPubmed);
      mockPubmed.mockResolvedValueOnce({
        success: false,
        error: "PubMed error",
      });

      const item: CslItem = {
        id: "error-pmid-2024",
        type: "article-journal",
        PMID: "12345678",
        custom: { uuid: "uuid-error-pmid" },
      };

      const result = await checkReference(item);

      expect(result.status).toBe("ok");
      expect(result.checkedSources).toContain("pubmed");
    });
  });
});
