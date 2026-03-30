import { afterEach, describe, expect, it, vi } from "vitest";
import type { UrlConfig } from "../../config/schema.js";

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
import { fetchUrl } from "./url-fetcher.js";
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

  it("should return item, fulltext, and archive", async () => {
    setupMocks();

    const result = await fetchUrl("https://example.com", { urlConfig: defaultUrlConfig });

    expect(result.item.title).toBe("Example Page");
    expect(result.item.URL).toBe("https://example.com");
    expect(result.item.type).toBe("webpage");
    expect(result.fulltext).toBe("# Example\n\nContent here");
    expect(result.archive).toBeDefined();
    expect(result.archive?.data).toBe("MHTML data");
    expect(result.archive?.extension).toBe("mhtml");
  });

  it("should navigate to URL with networkidle", async () => {
    const { mockPage } = setupMocks();

    await fetchUrl("https://example.com", { urlConfig: defaultUrlConfig });

    expect(mockPage.goto).toHaveBeenCalledWith("https://example.com", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
  });

  it("should close browser after completion", async () => {
    const { mockBrowser } = setupMocks();

    await fetchUrl("https://example.com", { urlConfig: defaultUrlConfig });

    expect(mockBrowser.close).toHaveBeenCalled();
  });

  it("should close browser even on error", async () => {
    const { mockBrowser } = setupMocks();
    mockExtractMetadata.mockRejectedValue(new Error("extract failed"));

    await expect(fetchUrl("https://example.com", { urlConfig: defaultUrlConfig })).rejects.toThrow(
      "extract failed"
    );

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

  it("should warn but continue when archive creation fails", async () => {
    setupMocks();
    mockCreateArchive.mockRejectedValue(new Error("CDP error"));

    const result = await fetchUrl("https://example.com", { urlConfig: defaultUrlConfig });

    expect(result.item.title).toBe("Example Page");
    expect(result.fulltext).toBe("# Example\n\nContent here");
    expect(result.archive).toBeUndefined();
  });

  it("should use timeout from config", async () => {
    const { mockPage } = setupMocks();
    const config: UrlConfig = { ...defaultUrlConfig, timeout: 60 };

    await fetchUrl("https://example.com", { urlConfig: config });

    expect(mockPage.goto).toHaveBeenCalledWith(
      "https://example.com",
      expect.objectContaining({ timeout: 60000 })
    );
  });
});
