import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FulltextConfig } from "../../../config/schema.js";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { Library } from "../../../core/library.js";
import { fulltextDiscover } from "./discover.js";

// Mock the academic-fulltext package
vi.mock("@ncukondo/academic-fulltext", () => ({
  discoverOA: vi.fn(),
}));

import { discoverOA } from "@ncukondo/academic-fulltext";

const mockedDiscoverOA = vi.mocked(discoverOA);

describe("fulltextDiscover", () => {
  let mockLibrary: Library;

  const createItem = (
    id: string,
    overrides?: { DOI?: string; PMID?: string; PMCID?: string }
  ): CslItem => ({
    id,
    type: "article",
    title: "Test Article",
    DOI: overrides?.DOI,
    PMID: overrides?.PMID,
    PMCID: overrides?.PMCID,
    custom: {
      uuid: `${id}-uuid`,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  });

  const defaultConfig: FulltextConfig = {
    preferSources: ["pmc", "arxiv", "unpaywall", "core"],
    sources: {
      unpaywallEmail: "test@example.com",
      coreApiKey: "test-key",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLibrary = {
      find: vi.fn(),
    } as unknown as Library;
  });

  it("should return error when reference not found", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(null);

    const result = await fulltextDiscover(mockLibrary, {
      identifier: "nonexistent",
      fulltextConfig: defaultConfig,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Reference 'nonexistent' not found");
  });

  it("should return error when reference has no DOI or PMID", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id"));

    const result = await fulltextDiscover(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No DOI or PMID found for test-id. Cannot discover OA sources.");
  });

  it("should discover OA sources using DOI", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id", { DOI: "10.1234/test" }));
    mockedDiscoverOA.mockResolvedValue({
      oaStatus: "open",
      locations: [
        {
          source: "unpaywall",
          url: "https://example.com/paper.pdf",
          urlType: "pdf",
          version: "published",
          license: "cc-by",
        },
      ],
      errors: [],
    });

    const result = await fulltextDiscover(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
    });

    expect(result.success).toBe(true);
    expect(result.oaStatus).toBe("open");
    expect(result.locations).toHaveLength(1);
    expect(result.locations?.[0].source).toBe("unpaywall");
    expect(mockedDiscoverOA).toHaveBeenCalledWith(
      { doi: "10.1234/test" },
      {
        unpaywallEmail: "test@example.com",
        coreApiKey: "test-key",
        preferSources: ["pmc", "arxiv", "unpaywall", "core"],
      }
    );
  });

  it("should discover OA sources using PMID when no DOI", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id", { PMID: "12345678" }));
    mockedDiscoverOA.mockResolvedValue({
      oaStatus: "open",
      locations: [
        {
          source: "pmc",
          url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1234567/",
          urlType: "xml",
          version: "published",
        },
      ],
      errors: [],
    });

    const result = await fulltextDiscover(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
    });

    expect(result.success).toBe(true);
    expect(result.locations).toHaveLength(1);
    expect(mockedDiscoverOA).toHaveBeenCalledWith({ pmid: "12345678" }, expect.any(Object));
  });

  it("should pass DOI, PMID, and PMCID when all available", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(
      createItem("test-id", { DOI: "10.1234/test", PMID: "12345678", PMCID: "PMC1234567" })
    );
    mockedDiscoverOA.mockResolvedValue({
      oaStatus: "open",
      locations: [],
      errors: [],
    });

    await fulltextDiscover(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
    });

    expect(mockedDiscoverOA).toHaveBeenCalledWith(
      { doi: "10.1234/test", pmid: "12345678", pmcid: "PMC1234567" },
      expect.any(Object)
    );
  });

  it("should return no sources when OA status is closed", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id", { DOI: "10.1234/test" }));
    mockedDiscoverOA.mockResolvedValue({
      oaStatus: "closed",
      locations: [],
      errors: [],
    });

    const result = await fulltextDiscover(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
    });

    expect(result.success).toBe(true);
    expect(result.oaStatus).toBe("closed");
    expect(result.locations).toHaveLength(0);
  });

  it("should support uuid identifier type", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id", { DOI: "10.1234/test" }));
    mockedDiscoverOA.mockResolvedValue({
      oaStatus: "open",
      locations: [],
      errors: [],
    });

    await fulltextDiscover(mockLibrary, {
      identifier: "test-uuid",
      idType: "uuid",
      fulltextConfig: defaultConfig,
    });

    expect(mockLibrary.find).toHaveBeenCalledWith("test-uuid", { idType: "uuid" });
  });

  it("should propagate discovery errors in result", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id", { DOI: "10.1234/test" }));
    mockedDiscoverOA.mockResolvedValue({
      oaStatus: "unknown",
      locations: [],
      errors: [{ source: "unpaywall", error: "Rate limited" }],
    });

    const result = await fulltextDiscover(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
    });

    expect(result.success).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.errors?.[0].source).toBe("unpaywall");
  });
});
