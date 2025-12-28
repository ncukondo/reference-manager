import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";

// Mock global fetch for PMID tests
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Mock Cite.async for DOI tests
const mockCiteAsync = vi.fn();
vi.mock("@citation-js/core", () => {
  return {
    Cite: {
      async: (input: string) => mockCiteAsync(input),
    },
  };
});

import {
  type FetchResult,
  type FetchResults,
  type PubmedConfig,
  fetchDoi,
  fetchIsbn,
  fetchPmids,
} from "./fetcher.js";
import { resetRateLimiters } from "./rate-limiter.js";

describe("fetchPmids", () => {
  beforeEach(() => {
    resetRateLimiters();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("successful fetching", () => {
    it("should fetch a single PMID and return CSL-JSON", async () => {
      const mockResponse: CslItem[] = [
        {
          id: "pmid:12345678",
          type: "article-journal",
          title: "Test Article",
          author: [{ family: "Smith", given: "John" }],
          issued: { "date-parts": [[2024]] },
          "container-title": "Test Journal",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const config: PubmedConfig = {};
      const results = await fetchPmids(["12345678"], config);

      expect(results).toHaveLength(1);
      expect(results[0].pmid).toBe("12345678");
      expect(results[0].success).toBe(true);
      expect(results[0].item?.title).toBe("Test Article");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("pmc.ncbi.nlm.nih.gov/api/ctxp/v1/pubmed"),
        expect.any(Object)
      );
    });

    it("should fetch multiple PMIDs in a single request", async () => {
      const mockResponse: CslItem[] = [
        {
          id: "pmid:12345678",
          type: "article-journal",
          title: "First Article",
        },
        {
          id: "pmid:23456789",
          type: "article-journal",
          title: "Second Article",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const config: PubmedConfig = {};
      const results = await fetchPmids(["12345678", "23456789"], config);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      // Verify single request with multiple ids
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/id=12345678.*id=23456789|id=23456789.*id=12345678/),
        expect.any(Object)
      );
    });

    it("should include email parameter when configured", async () => {
      const mockResponse: CslItem[] = [
        {
          id: "pmid:12345678",
          type: "article-journal",
          title: "Test Article",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const config: PubmedConfig = { email: "user@example.com" };
      await fetchPmids(["12345678"], config);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("email=user%40example.com"),
        expect.any(Object)
      );
    });

    it("should include api_key parameter when configured", async () => {
      const mockResponse: CslItem[] = [
        {
          id: "pmid:12345678",
          type: "article-journal",
          title: "Test Article",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const config: PubmedConfig = { apiKey: "test-api-key" };
      await fetchPmids(["12345678"], config);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("api_key=test-api-key"),
        expect.any(Object)
      );
    });
  });

  describe("partial success handling", () => {
    it("should handle when some PMIDs are not found", async () => {
      // API returns only found items
      const mockResponse: CslItem[] = [
        {
          id: "pmid:12345678",
          type: "article-journal",
          title: "Found Article",
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
      });

      const config: PubmedConfig = {};
      const results = await fetchPmids(["12345678", "99999999"], config);

      expect(results).toHaveLength(2);
      // Find results by pmid
      const found = results.find((r) => r.pmid === "12345678");
      const notFound = results.find((r) => r.pmid === "99999999");

      expect(found?.success).toBe(true);
      expect(found?.item).toBeDefined();
      expect(notFound?.success).toBe(false);
      expect(notFound?.error).toContain("not found");
    });
  });

  describe("error handling", () => {
    it("should return error for all PMIDs when request fails", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const config: PubmedConfig = {};
      const results = await fetchPmids(["12345678", "23456789"], config);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(false);
      expect(results[0].error).toContain("500");
    });

    it("should return error for network failure", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const config: PubmedConfig = {};
      const results = await fetchPmids(["12345678"], config);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain("Network error");
    });

    it("should return error for invalid JSON response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const config: PubmedConfig = {};
      const results = await fetchPmids(["12345678"], config);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toBeDefined();
    });

    it("should return empty array for empty input", async () => {
      const config: PubmedConfig = {};
      const results = await fetchPmids([], config);

      expect(results).toHaveLength(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});

describe("fetchDoi", () => {
  beforeEach(() => {
    resetRateLimiters();
    mockCiteAsync.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("successful fetching", () => {
    it("should fetch a DOI and return CSL-JSON", async () => {
      const mockCslResponse: CslItem[] = [
        {
          id: "10.1000/xyz",
          type: "article-journal",
          title: "DOI Test Article",
          DOI: "10.1000/xyz",
          author: [{ family: "Jones", given: "Alice" }],
        },
      ];

      // Mock Cite.async to return a Cite instance with get method
      mockCiteAsync.mockResolvedValueOnce({
        get: () => mockCslResponse,
      });

      const result = await fetchDoi("10.1000/xyz");

      expect(result.success).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.item?.title).toBe("DOI Test Article");
      expect(mockCiteAsync).toHaveBeenCalledWith("10.1000/xyz");
    });
  });

  describe("error handling", () => {
    it("should return error when DOI not found", async () => {
      // citation-js throws error for not found DOI
      mockCiteAsync.mockRejectedValueOnce(new Error("DOI not found"));

      const result = await fetchDoi("10.9999/notfound");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for network failure", async () => {
      mockCiteAsync.mockRejectedValueOnce(new Error("Network error"));

      const result = await fetchDoi("10.1000/xyz");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("should return error for invalid DOI format", async () => {
      const result = await fetchDoi("invalid-doi");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid DOI");
      // Should not call Cite.async for invalid DOI
      expect(mockCiteAsync).not.toHaveBeenCalled();
    });

    it("should return error when no items returned", async () => {
      mockCiteAsync.mockResolvedValueOnce({
        get: () => [],
      });

      const result = await fetchDoi("10.1000/xyz");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No data");
    });
  });
});

describe("FetchResult type", () => {
  it("should have success and item on success", () => {
    const result: FetchResult = {
      success: true,
      item: {
        id: "test",
        type: "article-journal",
        title: "Test",
      },
    };

    expect(result.success).toBe(true);
    expect(result.item).toBeDefined();
  });

  it("should have success and error on failure", () => {
    const result: FetchResult = {
      success: false,
      error: "Not found",
    };

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("FetchResults type", () => {
  it("should include pmid for each result", () => {
    const results: FetchResults = [
      {
        pmid: "12345678",
        success: true,
        item: { id: "test", type: "article-journal", title: "Test" },
      },
      {
        pmid: "99999999",
        success: false,
        error: "Not found",
      },
    ];

    expect(results[0].pmid).toBe("12345678");
    expect(results[1].pmid).toBe("99999999");
  });
});

describe("fetchIsbn", () => {
  beforeEach(() => {
    resetRateLimiters();
    mockCiteAsync.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("successful fetching", () => {
    it("should fetch an ISBN and return CSL-JSON", async () => {
      const mockCslResponse: CslItem[] = [
        {
          id: "9784000000000",
          type: "book",
          title: "ISBN Test Book",
          ISBN: "9784000000000",
          author: [{ family: "Author", given: "Test" }],
        },
      ];

      mockCiteAsync.mockResolvedValueOnce({
        get: () => mockCslResponse,
      });

      const result = await fetchIsbn("9784000000000");

      expect(result.success).toBe(true);
      expect(result.item).toBeDefined();
      expect(result.item?.title).toBe("ISBN Test Book");
      expect(mockCiteAsync).toHaveBeenCalledWith("9784000000000");
    });

    it("should fetch ISBN-10 with X check digit", async () => {
      const mockCslResponse: CslItem[] = [
        {
          id: "400000000X",
          type: "book",
          title: "ISBN-10 Book",
          ISBN: "400000000X",
        },
      ];

      mockCiteAsync.mockResolvedValueOnce({
        get: () => mockCslResponse,
      });

      const result = await fetchIsbn("400000000X");

      expect(result.success).toBe(true);
      expect(result.item?.title).toBe("ISBN-10 Book");
    });
  });

  describe("error handling", () => {
    it("should return error when ISBN not found", async () => {
      mockCiteAsync.mockRejectedValueOnce(new Error("ISBN not found"));

      const result = await fetchIsbn("9789999999990");

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should return error for network failure", async () => {
      mockCiteAsync.mockRejectedValueOnce(new Error("Network error"));

      const result = await fetchIsbn("9784000000000");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("should return error for invalid ISBN format (too short)", async () => {
      const result = await fetchIsbn("123456");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid ISBN");
      expect(mockCiteAsync).not.toHaveBeenCalled();
    });

    it("should return error for invalid ISBN format (too long)", async () => {
      const result = await fetchIsbn("12345678901234");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid ISBN");
      expect(mockCiteAsync).not.toHaveBeenCalled();
    });

    it("should return error for non-numeric ISBN", async () => {
      const result = await fetchIsbn("abcdefghij");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid ISBN");
      expect(mockCiteAsync).not.toHaveBeenCalled();
    });

    it("should return error when no items returned", async () => {
      mockCiteAsync.mockResolvedValueOnce({
        get: () => [],
      });

      const result = await fetchIsbn("9784000000000");

      expect(result.success).toBe(false);
      expect(result.error).toContain("No data");
    });
  });
});
