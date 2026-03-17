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

vi.mock("./converter-resolver.js", () => ({
  resolveConverter: vi.fn(),
}));

import { access } from "node:fs/promises";
import { convertPmcXmlToMarkdown } from "@ncukondo/academic-fulltext";
import { fulltextAttach } from "./attach.js";
import { resolveConverter } from "./converter-resolver.js";

const mockedConvertPmcXml = vi.mocked(convertPmcXmlToMarkdown);
const mockedFulltextAttach = vi.mocked(fulltextAttach);
const mockedAccess = vi.mocked(access);
const mockedResolveConverter = vi.mocked(resolveConverter);

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

  const createItemWithPdf = (id: string): CslItem => ({
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

  const createItemWithBoth = (id: string): CslItem => ({
    id,
    type: "article",
    title: "Test Article",
    custom: {
      uuid: `${id}-uuid`,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
      attachments: {
        directory: "test-dir",
        files: [
          { filename: "fulltext.xml", role: "fulltext" },
          { filename: "fulltext.pdf", role: "fulltext" },
        ],
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

  describe("XML conversion (existing behavior)", () => {
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
  });

  describe("auto-detect format", () => {
    it("should use XML when XML exists (no --from)", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithXml("test-id"));
      mockedConvertPmcXml.mockResolvedValue({ success: true, title: "Test" });
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
      expect(mockedConvertPmcXml).toHaveBeenCalled();
    });

    it("should use PDF when only PDF exists (no --from)", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithPdf("test-id"));
      mockedResolveConverter.mockResolvedValue({
        success: true,
        converter: {
          name: "marker",
          isAvailable: vi.fn().mockResolvedValue(true),
          convert: vi.fn().mockResolvedValue({ success: true, outputPath: "/output.md" }),
        },
      });
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
      expect(mockedResolveConverter).toHaveBeenCalled();
    });

    it("should prefer XML when both XML and PDF exist", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithBoth("test-id"));
      mockedConvertPmcXml.mockResolvedValue({ success: true, title: "Test" });
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
      expect(mockedConvertPmcXml).toHaveBeenCalled();
      expect(mockedResolveConverter).not.toHaveBeenCalled();
    });
  });

  describe("--from pdf", () => {
    it("should force PDF conversion even when XML exists", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithBoth("test-id"));
      mockedResolveConverter.mockResolvedValue({
        success: true,
        converter: {
          name: "marker",
          isAvailable: vi.fn().mockResolvedValue(true),
          convert: vi.fn().mockResolvedValue({ success: true, outputPath: "/output.md" }),
        },
      });
      mockedFulltextAttach.mockResolvedValue({
        success: true,
        filename: "fulltext.md",
        type: "markdown",
      });

      const result = await fulltextConvert(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
        from: "pdf",
      });

      expect(result.success).toBe(true);
      expect(mockedResolveConverter).toHaveBeenCalled();
      expect(mockedConvertPmcXml).not.toHaveBeenCalled();
    });

    it("should return error when no PDF attached with --from pdf", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithXml("test-id"));

      const result = await fulltextConvert(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
        from: "pdf",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No PDF file");
      expect(result.code).toBe("no-pdf");
      expect(result.hints).toContain("ref fulltext fetch");
    });
  });

  describe("--from xml", () => {
    it("should force XML conversion", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithBoth("test-id"));
      mockedConvertPmcXml.mockResolvedValue({ success: true, title: "Test" });
      mockedFulltextAttach.mockResolvedValue({
        success: true,
        filename: "fulltext.md",
        type: "markdown",
      });

      const result = await fulltextConvert(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
        from: "xml",
      });

      expect(result.success).toBe(true);
      expect(mockedConvertPmcXml).toHaveBeenCalled();
    });
  });

  describe("--converter", () => {
    it("should use specific converter", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithPdf("test-id"));
      mockedResolveConverter.mockResolvedValue({
        success: true,
        converter: {
          name: "docling",
          isAvailable: vi.fn().mockResolvedValue(true),
          convert: vi.fn().mockResolvedValue({ success: true, outputPath: "/output.md" }),
        },
      });
      mockedFulltextAttach.mockResolvedValue({
        success: true,
        filename: "fulltext.md",
        type: "markdown",
      });

      const result = await fulltextConvert(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
        converter: "docling",
      });

      expect(result.success).toBe(true);
      expect(mockedResolveConverter).toHaveBeenCalledWith("docling", expect.any(Object));
    });
  });

  describe("error handling (PDF conversion)", () => {
    it("should return error when no converter available", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithPdf("test-id"));
      mockedResolveConverter.mockResolvedValue({
        success: false,
        code: "no-converter",
        error: "No PDF converter found",
        hints: "Install marker: pip install marker-pdf",
      });

      const result = await fulltextConvert(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("no-converter");
      expect(result.hints).toContain("marker");
    });

    it("should return error when converter fails with stderr", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithPdf("test-id"));
      mockedResolveConverter.mockResolvedValue({
        success: true,
        converter: {
          name: "marker",
          isAvailable: vi.fn().mockResolvedValue(true),
          convert: vi.fn().mockResolvedValue({
            success: false,
            error: "CUDA out of memory",
            code: "conversion-failed",
            stderr: "RuntimeError: CUDA out of memory",
          }),
        },
      });

      const result = await fulltextConvert(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to convert PDF");
      expect(result.stderr).toContain("CUDA out of memory");
    });

    it("should return error on timeout", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(createItemWithPdf("test-id"));
      mockedResolveConverter.mockResolvedValue({
        success: true,
        converter: {
          name: "marker",
          isAvailable: vi.fn().mockResolvedValue(true),
          convert: vi.fn().mockResolvedValue({
            success: false,
            error: "Timed out",
            code: "timeout",
          }),
        },
      });

      const result = await fulltextConvert(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.code).toBe("timeout");
    });
  });
});
