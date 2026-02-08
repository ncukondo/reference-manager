import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FulltextConfig } from "../../../config/schema.js";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { Library } from "../../../core/library.js";
import { fulltextFetch } from "./fetch.js";

// Mock dependencies
vi.mock("@ncukondo/academic-fulltext", () => ({
  discoverOA: vi.fn(),
  downloadPdf: vi.fn(),
  downloadPmcXml: vi.fn(),
  convertPmcXmlToMarkdown: vi.fn(),
}));

vi.mock("./attach.js", () => ({
  fulltextAttach: vi.fn(),
}));

vi.mock("./get.js", () => ({
  fulltextGet: vi.fn(),
}));

import {
  convertPmcXmlToMarkdown,
  discoverOA,
  downloadPdf,
  downloadPmcXml,
} from "@ncukondo/academic-fulltext";
import { fulltextAttach } from "./attach.js";
import { fulltextGet } from "./get.js";

const mockedDiscoverOA = vi.mocked(discoverOA);
const mockedDownloadPdf = vi.mocked(downloadPdf);
const mockedDownloadPmcXml = vi.mocked(downloadPmcXml);
const mockedConvertPmcXml = vi.mocked(convertPmcXmlToMarkdown);
const mockedFulltextAttach = vi.mocked(fulltextAttach);
const mockedFulltextGet = vi.mocked(fulltextGet);

describe("fulltextFetch", () => {
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

    // Default: no existing fulltext
    mockedFulltextGet.mockResolvedValue({ success: false, error: "No fulltext" });
  });

  it("should return error when reference not found", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(null);

    const result = await fulltextFetch(mockLibrary, {
      identifier: "nonexistent",
      fulltextConfig: defaultConfig,
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Reference 'nonexistent' not found");
  });

  it("should return error when reference has no DOI or PMID", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id"));

    const result = await fulltextFetch(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No DOI or PMID found for test-id. Cannot discover OA sources.");
  });

  it("should return error when fulltext already attached without force", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id", { DOI: "10.1234/test" }));
    mockedFulltextGet.mockResolvedValue({
      success: true,
      paths: { pdf: "/fulltext/test-id/fulltext.pdf" },
    });

    const result = await fulltextFetch(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Fulltext already attached to test-id. Use --force to overwrite.");
  });

  it("should proceed when fulltext already attached with force", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id", { DOI: "10.1234/test" }));
    mockedFulltextGet.mockResolvedValue({
      success: true,
      paths: { pdf: "/fulltext/test-id/fulltext.pdf" },
    });
    mockedDiscoverOA.mockResolvedValue({
      oaStatus: "open",
      locations: [
        {
          source: "unpaywall",
          url: "https://example.com/paper.pdf",
          urlType: "pdf",
          version: "published",
        },
      ],
      errors: [],
    });
    mockedDownloadPdf.mockResolvedValue({ success: true, size: 1024 });
    mockedFulltextAttach.mockResolvedValue({
      success: true,
      filename: "fulltext.pdf",
      type: "pdf",
      overwritten: true,
    });

    const result = await fulltextFetch(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
      fulltextDirectory: "/fulltext",
      force: true,
    });

    expect(result.success).toBe(true);
  });

  it("should return error when no OA sources found", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id", { DOI: "10.1234/test" }));
    mockedDiscoverOA.mockResolvedValue({
      oaStatus: "closed",
      locations: [],
      errors: [],
    });

    const result = await fulltextFetch(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No OA sources found for test-id");
  });

  it("should download PDF and attach when source available", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id", { DOI: "10.1234/test" }));
    mockedDiscoverOA.mockResolvedValue({
      oaStatus: "open",
      locations: [
        {
          source: "unpaywall",
          url: "https://example.com/paper.pdf",
          urlType: "pdf",
          version: "published",
        },
      ],
      errors: [],
    });
    mockedDownloadPdf.mockResolvedValue({ success: true, size: 1024 });
    mockedFulltextAttach.mockResolvedValue({
      success: true,
      filename: "fulltext.pdf",
      type: "pdf",
    });

    const result = await fulltextFetch(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(true);
    expect(result.attachedFiles).toContain("pdf");
    expect(result.source).toBe("unpaywall");
    expect(mockedDownloadPdf).toHaveBeenCalledWith(
      "https://example.com/paper.pdf",
      expect.stringContaining("fulltext.pdf")
    );
  });

  it("should download PMC XML and convert to markdown when PMCID available", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(
      createItem("test-id", { DOI: "10.1234/test", PMCID: "PMC1234567" })
    );
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
    mockedDownloadPdf.mockResolvedValue({ success: false, error: "No PDF URL" });
    mockedDownloadPmcXml.mockResolvedValue({ success: true, size: 5000 });
    mockedConvertPmcXml.mockResolvedValue({ success: true, title: "Test", sections: 5 });
    mockedFulltextAttach.mockResolvedValue({
      success: true,
      filename: "fulltext.md",
      type: "markdown",
    });

    const result = await fulltextFetch(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(true);
    expect(result.attachedFiles).toContain("markdown");
    expect(mockedDownloadPmcXml).toHaveBeenCalledWith(
      "PMC1234567",
      expect.stringContaining("fulltext.xml")
    );
    expect(mockedConvertPmcXml).toHaveBeenCalled();
  });

  it("should filter by --source option", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id", { DOI: "10.1234/test" }));
    mockedDiscoverOA.mockResolvedValue({
      oaStatus: "open",
      locations: [
        {
          source: "unpaywall",
          url: "https://example.com/paper.pdf",
          urlType: "pdf",
          version: "published",
        },
        {
          source: "arxiv",
          url: "https://arxiv.org/pdf/2401.12345",
          urlType: "pdf",
          version: "submitted",
        },
      ],
      errors: [],
    });
    mockedDownloadPdf.mockResolvedValue({ success: true, size: 1024 });
    mockedFulltextAttach.mockResolvedValue({
      success: true,
      filename: "fulltext.pdf",
      type: "pdf",
    });

    const result = await fulltextFetch(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
      fulltextDirectory: "/fulltext",
      source: "arxiv",
    });

    expect(result.success).toBe(true);
    expect(result.source).toBe("arxiv");
    expect(mockedDownloadPdf).toHaveBeenCalledWith(
      "https://arxiv.org/pdf/2401.12345",
      expect.any(String)
    );
  });

  it("should return error when download fails", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id", { DOI: "10.1234/test" }));
    mockedDiscoverOA.mockResolvedValue({
      oaStatus: "open",
      locations: [
        {
          source: "unpaywall",
          url: "https://example.com/paper.pdf",
          urlType: "pdf",
          version: "published",
        },
      ],
      errors: [],
    });
    mockedDownloadPdf.mockResolvedValue({ success: false, error: "403 Forbidden" });

    const result = await fulltextFetch(mockLibrary, {
      identifier: "test-id",
      fulltextConfig: defaultConfig,
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to download");
  });

  it("should support uuid identifier type", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItem("test-id", { DOI: "10.1234/test" }));
    mockedDiscoverOA.mockResolvedValue({
      oaStatus: "open",
      locations: [
        {
          source: "unpaywall",
          url: "https://example.com/paper.pdf",
          urlType: "pdf",
          version: "published",
        },
      ],
      errors: [],
    });
    mockedDownloadPdf.mockResolvedValue({ success: true, size: 1024 });
    mockedFulltextAttach.mockResolvedValue({
      success: true,
      filename: "fulltext.pdf",
      type: "pdf",
    });

    await fulltextFetch(mockLibrary, {
      identifier: "test-uuid",
      idType: "uuid",
      fulltextConfig: defaultConfig,
      fulltextDirectory: "/fulltext",
    });

    expect(mockLibrary.find).toHaveBeenCalledWith("test-uuid", { idType: "uuid" });
  });
});
