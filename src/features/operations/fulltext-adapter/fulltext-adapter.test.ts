/**
 * Tests for fulltext-to-attachments adapter utilities
 */

import { describe, expect, it } from "vitest";
import type { Attachments } from "../../attachments/types.js";
import {
  FULLTEXT_ROLE,
  extensionToFormat,
  findFulltextFile,
  findFulltextFiles,
  formatToExtension,
  getFulltextFilename,
} from "./fulltext-adapter.js";

describe("fulltext-adapter", () => {
  describe("FULLTEXT_ROLE", () => {
    it("should be 'fulltext'", () => {
      expect(FULLTEXT_ROLE).toBe("fulltext");
    });
  });

  describe("formatToExtension", () => {
    it("should convert pdf format to pdf extension", () => {
      expect(formatToExtension("pdf")).toBe("pdf");
    });

    it("should convert markdown format to md extension", () => {
      expect(formatToExtension("markdown")).toBe("md");
    });
  });

  describe("extensionToFormat", () => {
    it("should convert pdf extension to pdf format", () => {
      expect(extensionToFormat("pdf")).toBe("pdf");
    });

    it("should convert md extension to markdown format", () => {
      expect(extensionToFormat("md")).toBe("markdown");
    });

    it("should return undefined for unknown extension", () => {
      expect(extensionToFormat("txt")).toBeUndefined();
      expect(extensionToFormat("xlsx")).toBeUndefined();
    });
  });

  describe("getFulltextFilename", () => {
    it("should generate fulltext.pdf for pdf format", () => {
      expect(getFulltextFilename("pdf")).toBe("fulltext.pdf");
    });

    it("should generate fulltext.md for markdown format", () => {
      expect(getFulltextFilename("markdown")).toBe("fulltext.md");
    });
  });

  describe("findFulltextFile", () => {
    const attachments: Attachments = {
      directory: "Smith-2024-123e4567",
      files: [
        { filename: "fulltext.pdf", role: "fulltext" },
        { filename: "fulltext.md", role: "fulltext" },
        { filename: "supplement-data.xlsx", role: "supplement", label: "data" },
      ],
    };

    it("should find PDF fulltext file", () => {
      const result = findFulltextFile(attachments, "pdf");
      expect(result).toEqual({ filename: "fulltext.pdf", role: "fulltext" });
    });

    it("should find Markdown fulltext file", () => {
      const result = findFulltextFile(attachments, "markdown");
      expect(result).toEqual({ filename: "fulltext.md", role: "fulltext" });
    });

    it("should return undefined when no matching fulltext exists", () => {
      const noMd: Attachments = {
        directory: "Smith-2024-123e4567",
        files: [{ filename: "fulltext.pdf", role: "fulltext" }],
      };
      expect(findFulltextFile(noMd, "markdown")).toBeUndefined();
    });

    it("should return undefined when attachments is undefined", () => {
      expect(findFulltextFile(undefined, "pdf")).toBeUndefined();
    });

    it("should return undefined when files array is empty", () => {
      const empty: Attachments = {
        directory: "Smith-2024-123e4567",
        files: [],
      };
      expect(findFulltextFile(empty, "pdf")).toBeUndefined();
    });
  });

  describe("findFulltextFiles", () => {
    it("should return all fulltext files", () => {
      const attachments: Attachments = {
        directory: "Smith-2024-123e4567",
        files: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "fulltext.md", role: "fulltext" },
          { filename: "supplement-data.xlsx", role: "supplement" },
        ],
      };

      const result = findFulltextFiles(attachments);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ filename: "fulltext.pdf", role: "fulltext" });
      expect(result).toContainEqual({ filename: "fulltext.md", role: "fulltext" });
    });

    it("should return empty array when no fulltext files", () => {
      const attachments: Attachments = {
        directory: "Smith-2024-123e4567",
        files: [{ filename: "supplement-data.xlsx", role: "supplement" }],
      };

      expect(findFulltextFiles(attachments)).toEqual([]);
    });

    it("should return empty array when attachments is undefined", () => {
      expect(findFulltextFiles(undefined)).toEqual([]);
    });
  });
});
