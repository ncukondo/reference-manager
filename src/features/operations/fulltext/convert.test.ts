import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { Library } from "../../../core/library.js";
import { fulltextConvert } from "./convert.js";

// Mock dependencies
vi.mock("@ncukondo/academic-fulltext", () => ({
  convertPmcXmlToMarkdown: vi.fn(),
}));

vi.mock("./attach.js", () => ({
  fulltextAttach: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
}));

import { access } from "node:fs/promises";
import { convertPmcXmlToMarkdown } from "@ncukondo/academic-fulltext";
import { fulltextAttach } from "./attach.js";

const mockedConvertPmcXml = vi.mocked(convertPmcXmlToMarkdown);
const mockedFulltextAttach = vi.mocked(fulltextAttach);
const mockedAccess = vi.mocked(access);

describe("fulltextConvert", () => {
  let mockLibrary: Library;

  const createItemWithXml = (id: string): CslItem => ({
    id,
    type: "article",
    title: "Test Article",
    custom: {
      uuid: `${id}-uuid`,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
      attachments: {
        directory: "test-dir",
        files: [{ filename: "fulltext.xml", role: "fulltext" }],
      },
    },
  });

  const createItemWithoutXml = (id: string): CslItem => ({
    id,
    type: "article",
    title: "Test Article",
    custom: {
      uuid: `${id}-uuid`,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
      attachments: {
        directory: "test-dir",
        files: [{ filename: "fulltext.pdf", role: "fulltext" }],
      },
    },
  });

  const createItemWithoutAttachments = (id: string): CslItem => ({
    id,
    type: "article",
    title: "Test Article",
    custom: {
      uuid: `${id}-uuid`,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockLibrary = {
      find: vi.fn(),
    } as unknown as Library;
    // Default: file exists
    mockedAccess.mockResolvedValue(undefined);
  });

  it("should return error when reference not found", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(null);

    const result = await fulltextConvert(mockLibrary, {
      identifier: "nonexistent",
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Reference 'nonexistent' not found");
  });

  it("should return error when no attachments exist", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithoutAttachments("test-id"));

    const result = await fulltextConvert(mockLibrary, {
      identifier: "test-id",
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No PMC XML file");
  });

  it("should return error when no XML file attached", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithoutXml("test-id"));

    const result = await fulltextConvert(mockLibrary, {
      identifier: "test-id",
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("No PMC XML file");
  });

  it("should convert XML to Markdown and attach", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithXml("test-id"));
    mockedConvertPmcXml.mockResolvedValue({ success: true, title: "Test", sections: 5 });
    mockedFulltextAttach.mockResolvedValue({
      success: true,
      filename: "fulltext.md",
      type: "markdown",
    });

    const result = await fulltextConvert(mockLibrary, {
      identifier: "test-id",
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(true);
    expect(result.filename).toBe("fulltext.md");
    expect(mockedConvertPmcXml).toHaveBeenCalledWith(
      expect.stringContaining("fulltext.xml"),
      expect.stringContaining("fulltext.md")
    );
    expect(mockedFulltextAttach).toHaveBeenCalledWith(
      mockLibrary,
      expect.objectContaining({
        identifier: "test-id",
        type: "markdown",
        force: true,
      })
    );
  });

  it("should return error when conversion fails", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithXml("test-id"));
    mockedConvertPmcXml.mockResolvedValue({ success: false, error: "Parse error" });

    const result = await fulltextConvert(mockLibrary, {
      identifier: "test-id",
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to convert PMC XML to Markdown");
  });

  it("should support uuid identifier type", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithXml("test-id"));
    mockedConvertPmcXml.mockResolvedValue({ success: true, title: "Test" });
    mockedFulltextAttach.mockResolvedValue({
      success: true,
      filename: "fulltext.md",
      type: "markdown",
    });

    await fulltextConvert(mockLibrary, {
      identifier: "test-uuid",
      idType: "uuid",
      fulltextDirectory: "/fulltext",
    });

    expect(mockLibrary.find).toHaveBeenCalledWith("test-uuid", { idType: "uuid" });
  });

  it("should return error when XML file does not exist on disk", async () => {
    vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithXml("test-id"));
    mockedAccess.mockRejectedValue(new Error("ENOENT"));

    const result = await fulltextConvert(mockLibrary, {
      identifier: "test-id",
      fulltextDirectory: "/fulltext",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("XML file not found");
  });
});
