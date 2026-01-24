/**
 * Tests for attachment list operation
 */

import { describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary } from "../../../core/library-interface.js";
import { type ListAttachmentsOptions, listAttachments } from "./list.js";

describe("listAttachments", () => {
  const createMockLibrary = (reference: CslItem | null): ILibrary => {
    return {
      find: vi.fn().mockResolvedValue(reference),
      update: vi.fn(),
      getPath: vi.fn(),
      list: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      reload: vi.fn(),
      getReferences: vi.fn(),
      getOptions: vi.fn(),
    } as unknown as ILibrary;
  };

  const baseReference: CslItem = {
    id: "Smith-2024",
    type: "article-journal",
    title: "Test Article",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2024]] },
    custom: {
      uuid: "123e4567-e89b-12d3-a456-426614174000",
    },
  };

  describe("list all attachments", () => {
    it("should list all attachments for a reference", async () => {
      const reference: CslItem = {
        ...baseReference,
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          attachments: {
            directory: "Smith-2024-123e4567",
            files: [
              { filename: "fulltext.pdf", role: "fulltext" },
              { filename: "supplement-table-s1.xlsx", role: "supplement", label: "Table S1" },
              { filename: "notes.md", role: "notes" },
            ],
          },
        },
      };

      const mockLibrary = createMockLibrary(reference);
      const options: ListAttachmentsOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: "/tmp/attachments",
      };

      const result = await listAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.directory).toBe("Smith-2024-123e4567");
      expect(result.files).toHaveLength(3);
      expect(result.files).toEqual([
        { filename: "fulltext.pdf", role: "fulltext" },
        { filename: "supplement-table-s1.xlsx", role: "supplement", label: "Table S1" },
        { filename: "notes.md", role: "notes" },
      ]);
    });

    it("should return empty list when no attachments", async () => {
      const mockLibrary = createMockLibrary(baseReference);
      const options: ListAttachmentsOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: "/tmp/attachments",
      };

      const result = await listAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.files).toEqual([]);
      expect(result.directory).toBeUndefined();
    });
  });

  describe("filter by role", () => {
    it("should filter attachments by role", async () => {
      const reference: CslItem = {
        ...baseReference,
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          attachments: {
            directory: "Smith-2024-123e4567",
            files: [
              { filename: "fulltext.pdf", role: "fulltext" },
              { filename: "supplement-table-s1.xlsx", role: "supplement", label: "Table S1" },
              { filename: "supplement-figure-s1.png", role: "supplement", label: "Figure S1" },
              { filename: "notes.md", role: "notes" },
            ],
          },
        },
      };

      const mockLibrary = createMockLibrary(reference);
      const options: ListAttachmentsOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: "/tmp/attachments",
        role: "supplement",
      };

      const result = await listAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.files).toHaveLength(2);
      expect(result.files).toEqual([
        { filename: "supplement-table-s1.xlsx", role: "supplement", label: "Table S1" },
        { filename: "supplement-figure-s1.png", role: "supplement", label: "Figure S1" },
      ]);
    });

    it("should return empty list when no files match role", async () => {
      const reference: CslItem = {
        ...baseReference,
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          attachments: {
            directory: "Smith-2024-123e4567",
            files: [{ filename: "fulltext.pdf", role: "fulltext" }],
          },
        },
      };

      const mockLibrary = createMockLibrary(reference);
      const options: ListAttachmentsOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory: "/tmp/attachments",
        role: "notes",
      };

      const result = await listAttachments(mockLibrary, options);

      expect(result.success).toBe(true);
      expect(result.files).toEqual([]);
    });
  });

  describe("error handling", () => {
    it("should return error when reference not found", async () => {
      const mockLibrary = createMockLibrary(null);
      const options: ListAttachmentsOptions = {
        identifier: "NonExistent",
        attachmentsDirectory: "/tmp/attachments",
      };

      const result = await listAttachments(mockLibrary, options);

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/not found/i);
    });
  });
});
