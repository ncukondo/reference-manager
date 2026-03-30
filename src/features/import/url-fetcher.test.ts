import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { UrlConfig } from "../../config/schema.js";

// Mock node:fs to track readFileSync calls for Readability caching test
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
  };
});

const mockReadFileSync = vi.mocked(readFileSync);

// Mock dependencies
vi.mock("./browser.js", () => ({
  launchBrowser: vi.fn(),
  BrowserNotFoundError: class BrowserNotFoundError extends Error {
    constructor(cause?: Error) {
      super("Browser not found", { cause });
      this.name = "BrowserNotFoundError";
    }
  },
}));

vi.mock("./url-metadata.js", () => ({
  extractMetadata: vi.fn(),
}));

vi.mock("./url-fulltext.js", () => ({
  generateFulltext: vi.fn(),
}));

vi.mock("./url-archive.js", () => ({
  createArchive: vi.fn(),
}));

import { launchBrowser } from "./browser.js";
import { createArchive } from "./url-archive.js";
import { fetchUrl, fetchUrls } from "./url-fetcher.js";
import { generateFulltext } from "./url-fulltext.js";
import { extractMetadata } from "./url-metadata.js";

const mockLaunchBrowser = vi.mocked(launchBrowser);
const mockExtractMetadata = vi.mocked(extractMetadata);
const mockGenerateFulltext = vi.mocked(generateFulltext);
const mockCreateArchive = vi.mocked(createArchive);

const defaultUrlConfig: UrlConfig = {
  archiveFormat: "mhtml",
  browserPath: "",
  timeout: 30,
};

function setupMocks() {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(null),
    waitForLoadState: vi.fn().mockResolvedValue(undefined),
    addScriptTag: vi.fn().mockResolvedValue(null),
    close: vi.fn().mockResolvedValue(undefined),
  };
  const mockBrowser = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  };
  mockLaunchBrowser.mockResolvedValue(mockBrowser as never);
  mockExtractMetadata.mockResolvedValue({
    id: "",
    type: "webpage",
    title: "Example Page",
    URL: "https://example.com",
    accessed: { "date-parts": [[2026, 3, 30]] },
  });
  mockGenerateFulltext.mockResolvedValue("# Example\n\nContent here");
  mockCreateArchive.mockResolvedValue({ data: "MHTML data", extension: "mhtml" });

  return { mockPage, mockBrowser };
}

describe("fetchUrl", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return item, fulltext, archive, and empty warnings", async () => {
    setupMocks();

    const result = await fetchUrl("https://example.com", { urlConfig: defaultUrlConfig });

    expect(result.item.title).toBe("Example Page");
    expect(result.item.URL).toBe("https://example.com");
    expect(result.item.type).toBe("webpage");
    expect(result.fulltext).toBe("# Example\n\nContent here");
    expect(result.archive).toBeDefined();
    expect(result.archive?.data).toBe("MHTML data");
    expect(result.archive?.extension).toBe("mhtml");
    expect(result.warnings).toEqual([]);
  });

  it("should navigate with domcontentloaded then try short networkidle", async () => {
    const { mockPage } = setupMocks();

    await fetchUrl("https://example.com", { urlConfig: defaultUrlConfig });

    expect(mockPage.goto).toHaveBeenCalledWith("https://example.com", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    expect(mockPage.waitForLoadState).toHaveBeenCalledWith("networkidle", { timeout: 2000 });
  });

  it("should succeed even if networkidle wait times out", async () => {
    const { mockPage } = setupMocks();
    mockPage.waitForLoadState.mockRejectedValue(new Error("Timeout 2000ms exceeded"));

    const result = await fetchUrl("https://example.com", { urlConfig: defaultUrlConfig });

    expect(result.item.title).toBe("Example Page");
    expect(result.warnings).toEqual([]);
  });

  it("should close page and browser after completion", async () => {
    const { mockPage, mockBrowser } = setupMocks();

    await fetchUrl("https://example.com", { urlConfig: defaultUrlConfig });

    expect(mockPage.close).toHaveBeenCalled();
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should close page and browser even on error", async () => {
    const { mockPage, mockBrowser } = setupMocks();
    mockExtractMetadata.mockRejectedValue(new Error("extract failed"));

    await expect(fetchUrl("https://example.com", { urlConfig: defaultUrlConfig })).rejects.toThrow(
      "extract failed"
    );

    expect(mockPage.close).toHaveBeenCalled();
    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should skip archive when noArchive is true", async () => {
    setupMocks();

    const result = await fetchUrl("https://example.com", {
      urlConfig: defaultUrlConfig,
      noArchive: true,
    });

    expect(result.archive).toBeUndefined();
    expect(mockCreateArchive).not.toHaveBeenCalled();
  });

  it("should use archiveFormat from options", async () => {
    setupMocks();
    mockCreateArchive.mockResolvedValue({ data: "HTML data", extension: "html" });

    const result = await fetchUrl("https://example.com", {
      urlConfig: defaultUrlConfig,
      archiveFormat: "html",
    });

    expect(mockCreateArchive).toHaveBeenCalledWith(expect.anything(), "html");
    expect(result.archive?.extension).toBe("html");
  });

  it("should warn and continue when archive creation fails", async () => {
    setupMocks();
    mockCreateArchive.mockRejectedValue(new Error("CDP error"));

    const result = await fetchUrl("https://example.com", { urlConfig: defaultUrlConfig });

    expect(result.item.title).toBe("Example Page");
    expect(result.fulltext).toBe("# Example\n\nContent here");
    expect(result.archive).toBeUndefined();
    expect(result.warnings).toContainEqual(expect.stringContaining("Archive creation failed"));
    expect(result.warnings).toContainEqual(expect.stringContaining("CDP error"));
  });

  it("should warn and continue when Readability injection fails", async () => {
    const { mockPage } = setupMocks();
    mockPage.addScriptTag.mockRejectedValue(new Error("injection error"));

    const result = await fetchUrl("https://example.com", { urlConfig: defaultUrlConfig });

    expect(result.item.title).toBe("Example Page");
    expect(result.fulltext).toBe("# Example\n\nContent here");
    expect(result.warnings).toContainEqual(expect.stringContaining("Readability injection failed"));
    expect(result.warnings).toContainEqual(expect.stringContaining("injection error"));
  });

  it("should use timeout from config for navigation", async () => {
    const { mockPage } = setupMocks();
    const config: UrlConfig = { ...defaultUrlConfig, timeout: 60 };

    await fetchUrl("https://example.com", { urlConfig: config });

    expect(mockPage.goto).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ timeout: 60000, waitUntil: "domcontentloaded" })
    );
  });
});

describe("fetchUrls", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty map for empty input", async () => {
    const results = await fetchUrls([], { urlConfig: defaultUrlConfig });
    expect(results.size).toBe(0);
  });

  it("should reuse one browser for multiple URLs", async () => {
    const { mockBrowser } = setupMocks();

    const results = await fetchUrls(["https://a.com", "https://b.com"], {
      urlConfig: defaultUrlConfig,
    });

    // Browser launched only once
    expect(mockLaunchBrowser).toHaveBeenCalledTimes(1);
    // Two pages created
    expect(mockBrowser.newPage).toHaveBeenCalledTimes(2);
    // Browser closed once
    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    // Both results present
    expect(results.size).toBe(2);
    const resultA = results.get("https://a.com");
    expect(resultA).not.toBeInstanceOf(Error);
    if (!(resultA instanceof Error)) {
      expect(resultA?.item.title).toBe("Example Page");
    }
  });

  it("should return Error for individual URL failures", async () => {
    setupMocks();
    let callCount = 0;
    mockExtractMetadata.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        throw new Error("page error");
      }
      return {
        id: "",
        type: "webpage",
        title: "Second Page",
        URL: "https://b.com",
        accessed: { "date-parts": [[2026, 3, 30]] },
      };
    });

    const results = await fetchUrls(["https://a.com", "https://b.com"], {
      urlConfig: defaultUrlConfig,
    });

    expect(results.size).toBe(2);
    expect(results.get("https://a.com")).toBeInstanceOf(Error);
    const resultB = results.get("https://b.com");
    expect(resultB).not.toBeInstanceOf(Error);
    if (!(resultB instanceof Error)) {
      expect(resultB?.item.title).toBe("Second Page");
    }
  });

  it("should read Readability file only once for multiple URLs", async () => {
    setupMocks();
    // Reset call count before this test
    mockReadFileSync.mockClear();

    await fetchUrls(["https://a.com", "https://b.com", "https://c.com"], {
      urlConfig: defaultUrlConfig,
    });

    // readFileSync for Readability should be called at most once (cached)
    const readabilityCalls = mockReadFileSync.mock.calls.filter(
      (call) => typeof call[0] === "string" && call[0].includes("Readability")
    );
    expect(readabilityCalls.length).toBeLessThanOrEqual(1);
  });

  it("should close browser even when all URLs fail", async () => {
    const { mockBrowser } = setupMocks();
    mockExtractMetadata.mockRejectedValue(new Error("fail"));

    const results = await fetchUrls(["https://a.com", "https://b.com"], {
      urlConfig: defaultUrlConfig,
    });

    expect(mockBrowser.close).toHaveBeenCalledTimes(1);
    expect(results.get("https://a.com")).toBeInstanceOf(Error);
    expect(results.get("https://b.com")).toBeInstanceOf(Error);
  });
});
