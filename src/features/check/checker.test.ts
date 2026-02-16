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

// Mock metadata-comparator
vi.mock("./metadata-comparator.js", () => ({
  compareMetadata: vi.fn(),
}));

/**
 * Helper to mock Crossref response with matching metadata.
 * When metadata matches the item, compareMetadata returns no_change.
 */
function mockCrossrefWithMatchingMetadata(
  mockQuery: ReturnType<typeof vi.fn>,
  updates: CrossrefResult extends { success: true } ? CrossrefResult["updates"] : never = []
) {
  mockQuery.mockResolvedValueOnce({
    success: true,
    updates,
    metadata: { title: "Test Article" },
  });
}

describe("checkReference", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Default: metadata comparison returns no_change
    const { compareMetadata } = await import("./metadata-comparator.js");
    vi.mocked(compareMetadata).mockReturnValue({
      classification: "no_change",
      changedFields: [],
      fieldDiffs: [],
    });
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
      metadata: { title: "Test Article" },
    } as CrossrefResult);

    const item: CslItem = {
      id: "retracted-2024",
      type: "article-journal",
      title: "Test Article",
      DOI: "10.1234/test",
      custom: { uuid: "uuid-2" },
    };

    const result = await checkReference(item);

    expect(result.status).toBe("warning");
    expect(result.findings.some((f) => f.type === "retracted")).toBe(true);
    const retracted = result.findings.find((f) => f.type === "retracted");
    expect(retracted?.details?.retractionDoi).toBe("10.1234/retraction");
    expect(retracted?.details?.retractionDate).toBe("2024-06-01");
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
      metadata: { title: "Test Article" },
    } as CrossrefResult);

    const item: CslItem = {
      id: "concern-2024",
      type: "article-journal",
      title: "Test Article",
      DOI: "10.1234/test",
      custom: { uuid: "uuid-3" },
    };

    const result = await checkReference(item);

    expect(result.status).toBe("warning");
    expect(result.findings.some((f) => f.type === "concern")).toBe(true);
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
      metadata: { title: "Test Article" },
    } as CrossrefResult);

    const item: CslItem = {
      id: "preprint-2024",
      type: "article-journal",
      title: "Test Article",
      DOI: "10.1234/preprint",
      custom: { uuid: "uuid-4" },
    };

    const result = await checkReference(item);

    expect(result.status).toBe("warning");
    expect(result.findings.some((f) => f.type === "version_changed")).toBe(true);
    const version = result.findings.find((f) => f.type === "version_changed");
    expect(version?.details?.newDoi).toBe("10.5678/published");
  });

  it("should return ok when no issues found", async () => {
    const { queryCrossref } = await import("./crossref-client.js");
    const mockQuery = vi.mocked(queryCrossref);
    mockCrossrefWithMatchingMetadata(mockQuery);

    const item: CslItem = {
      id: "clean-2024",
      type: "article-journal",
      title: "Test Article",
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
    mockCrossrefWithMatchingMetadata(mockQuery);

    const item: CslItem = {
      id: "meta-2024",
      type: "article-journal",
      title: "Test Article",
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
      metadata: { title: "Test Article" },
    } as CrossrefResult);

    const item: CslItem = {
      id: "multi-2024",
      type: "article-journal",
      title: "Test Article",
      DOI: "10.1234/test",
      custom: { uuid: "uuid-7" },
    };

    const result = await checkReference(item);

    expect(result.status).toBe("warning");
    expect(result.findings.some((f) => f.type === "retracted")).toBe(true);
    expect(result.findings.some((f) => f.type === "concern")).toBe(true);
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

      mockCrossrefWithMatchingMetadata(mockCrossref);
      mockPubmed.mockResolvedValueOnce({
        success: true,
        isRetracted: false,
        hasConcern: false,
      });

      const item: CslItem = {
        id: "both-2024",
        type: "article-journal",
        title: "Test Article",
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

  describe("metadata comparison", () => {
    it("should detect metadata mismatch when title is completely different", async () => {
      const { queryCrossref } = await import("./crossref-client.js");
      const { compareMetadata } = await import("./metadata-comparator.js");
      const mockQuery = vi.mocked(queryCrossref);
      const mockCompare = vi.mocked(compareMetadata);

      mockQuery.mockResolvedValueOnce({
        success: true,
        updates: [],
        metadata: {
          title: "Completely Different Title",
          author: [{ family: "Brown" }],
        },
      });
      mockCompare.mockReturnValueOnce({
        classification: "metadata_mismatch",
        changedFields: ["title", "author"],
        fieldDiffs: [
          { field: "title", local: "Original Title", remote: "Completely Different Title" },
          { field: "author", local: "Smith", remote: "Brown" },
        ],
      });

      const item: CslItem = {
        id: "mismatch-2024",
        type: "article-journal",
        title: "Original Title",
        author: [{ family: "Smith" }],
        DOI: "10.1234/test",
        custom: { uuid: "uuid-mismatch" },
      };

      const result = await checkReference(item);

      expect(result.status).toBe("warning");
      const finding = result.findings.find((f) => f.type === "metadata_mismatch");
      expect(finding).toBeDefined();
      expect(finding?.message).toContain("significantly differs");
      expect(finding?.details?.updatedFields).toContain("title");
      expect(finding?.details?.fieldDiffs).toHaveLength(2);
    });

    it("should detect metadata outdated when publication fields differ", async () => {
      const { queryCrossref } = await import("./crossref-client.js");
      const { compareMetadata } = await import("./metadata-comparator.js");
      const mockQuery = vi.mocked(queryCrossref);
      const mockCompare = vi.mocked(compareMetadata);

      mockQuery.mockResolvedValueOnce({
        success: true,
        updates: [],
        metadata: {
          title: "Same Title",
          author: [{ family: "Smith" }],
          page: "123-145",
          volume: "42",
        },
      });
      mockCompare.mockReturnValueOnce({
        classification: "metadata_outdated",
        changedFields: ["page", "volume"],
        fieldDiffs: [
          { field: "page", local: null, remote: "123-145" },
          { field: "volume", local: null, remote: "42" },
        ],
      });

      const item: CslItem = {
        id: "outdated-2024",
        type: "article-journal",
        title: "Same Title",
        author: [{ family: "Smith" }],
        DOI: "10.1234/test",
        custom: { uuid: "uuid-outdated" },
      };

      const result = await checkReference(item);

      expect(result.status).toBe("warning");
      const finding = result.findings.find((f) => f.type === "metadata_outdated");
      expect(finding).toBeDefined();
      expect(finding?.message).toContain("updated since import");
      expect(finding?.details?.updatedFields).toContain("page");
    });

    it("should skip metadata comparison when metadata option is false", async () => {
      const { queryCrossref } = await import("./crossref-client.js");
      const { compareMetadata } = await import("./metadata-comparator.js");
      const mockQuery = vi.mocked(queryCrossref);
      const mockCompare = vi.mocked(compareMetadata);

      mockQuery.mockResolvedValueOnce({
        success: true,
        updates: [],
        metadata: {
          title: "Different Title",
        },
      });

      const item: CslItem = {
        id: "no-meta-2024",
        type: "article-journal",
        title: "Original Title",
        DOI: "10.1234/test",
        custom: { uuid: "uuid-no-meta" },
      };

      const result = await checkReference(item, { metadata: false });

      expect(result.status).toBe("ok");
      expect(mockCompare).not.toHaveBeenCalled();
    });

    it("should skip metadata comparison when no Crossref metadata available", async () => {
      const { queryCrossref } = await import("./crossref-client.js");
      const { compareMetadata } = await import("./metadata-comparator.js");
      const mockQuery = vi.mocked(queryCrossref);
      const mockCompare = vi.mocked(compareMetadata);

      mockQuery.mockResolvedValueOnce({
        success: true,
        updates: [],
      });

      const item: CslItem = {
        id: "no-meta-2024",
        type: "article-journal",
        title: "Test",
        DOI: "10.1234/test",
        custom: { uuid: "uuid-no-meta" },
      };

      const result = await checkReference(item);

      expect(result.status).toBe("ok");
      expect(mockCompare).not.toHaveBeenCalled();
    });

    it("should not produce metadata finding when metadata matches", async () => {
      const { queryCrossref } = await import("./crossref-client.js");
      const mockQuery = vi.mocked(queryCrossref);
      mockCrossrefWithMatchingMetadata(mockQuery);

      const item: CslItem = {
        id: "match-2024",
        type: "article-journal",
        title: "Test Article",
        DOI: "10.1234/test",
        custom: { uuid: "uuid-match" },
      };

      const result = await checkReference(item);

      expect(result.status).toBe("ok");
      expect(result.findings).toHaveLength(0);
    });
  });
});
