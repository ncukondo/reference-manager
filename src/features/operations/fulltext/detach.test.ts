import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { Library } from "../../../core/library.js";
import { fulltextDetach } from "./detach.js";

// Mock the detachAttachment operation
vi.mock("../attachments/detach.js", () => ({
  detachAttachment: vi.fn(),
}));

import { detachAttachment } from "../attachments/detach.js";

const mockedDetachAttachment = vi.mocked(detachAttachment);

describe("fulltextDetach", () => {
  let mockLibrary: Library;

  const createItem = (
    id: string,
    attachments?: {
      directory?: string;
      files?: Array<{ filename: string; role: string; label?: string }>;
    }
  ): CslItem => ({
    id,
    type: "article",
    title: "Test Article",
    custom: {
      uuid: `${id}-uuid`,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
      ...(attachments && { attachments }),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();

    mockLibrary = {
      find: vi.fn(),
      findById: vi.fn(),
      findByUuid: vi.fn(),
    } as unknown as Library;
  });

  describe("reference lookup", () => {
    it("should find reference by id when idType is 'id'", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.pdf", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedDetachAttachment.mockResolvedValue({
        success: true,
        detached: ["fulltext.pdf"],
        deleted: [],
      });

      await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(mockLibrary.find).toHaveBeenCalledWith("test-id", { idType: "id" });
    });

    it("should find reference by uuid when idType is 'uuid'", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.pdf", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedDetachAttachment.mockResolvedValue({
        success: true,
        detached: ["fulltext.pdf"],
        deleted: [],
      });

      await fulltextDetach(mockLibrary, {
        identifier: "test-uuid",
        fulltextDirectory: "/fulltext",
        idType: "uuid",
      });

      expect(mockLibrary.find).toHaveBeenCalledWith("test-uuid", { idType: "uuid" });
    });

    it("should return error when reference not found", async () => {
      vi.mocked(mockLibrary.find).mockResolvedValue(undefined);

      const result = await fulltextDetach(mockLibrary, {
        identifier: "nonexistent",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Reference 'nonexistent' not found");
    });
  });

  describe("detach operations", () => {
    it("should detach pdf successfully", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.pdf", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedDetachAttachment.mockResolvedValue({
        success: true,
        detached: ["fulltext.pdf"],
        deleted: [],
      });

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.detached).toEqual(["pdf"]);
      expect(result.deleted).toBeUndefined();
    });

    it("should detach specific type when type option is provided", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "fulltext.md", role: "fulltext" },
        ],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedDetachAttachment.mockResolvedValue({
        success: true,
        detached: ["fulltext.pdf"],
        deleted: [],
      });

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        type: "pdf",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.detached).toEqual(["pdf"]);
      expect(mockedDetachAttachment).toHaveBeenCalledTimes(1);
      expect(mockedDetachAttachment).toHaveBeenCalledWith(
        mockLibrary,
        expect.objectContaining({
          filename: "fulltext.pdf",
        })
      );
    });

    it("should detach all types when no type specified", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "fulltext.md", role: "fulltext" },
        ],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedDetachAttachment.mockResolvedValue({
        success: true,
        detached: ["fulltext.pdf"],
        deleted: [],
      });

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.detached).toEqual(["pdf", "markdown"]);
      expect(mockedDetachAttachment).toHaveBeenCalledTimes(2);
    });

    it("should delete files when delete option is true", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.pdf", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedDetachAttachment.mockResolvedValue({
        success: true,
        detached: ["fulltext.pdf"],
        deleted: ["fulltext.pdf"],
      });

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        delete: true,
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(true);
      expect(result.detached).toEqual(["pdf"]);
      expect(result.deleted).toEqual(["pdf"]);
      expect(mockedDetachAttachment).toHaveBeenCalledWith(
        mockLibrary,
        expect.objectContaining({
          delete: true,
        })
      );
    });

    it("should return error when no fulltext attached", async () => {
      const item = createItem("test-id");
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No fulltext attached");
    });

    it("should return error when only non-fulltext attachments exist", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "supplement.pdf", role: "supplement" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No fulltext attached");
    });

    it("should return error when specified type is not attached", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.pdf", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);

      const result = await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        type: "markdown",
        fulltextDirectory: "/fulltext",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No markdown fulltext attached");
    });
  });

  describe("attachments system integration", () => {
    it("should call detachAttachment with correct parameters", async () => {
      const item = createItem("test-id", {
        directory: "test-id-12345678",
        files: [{ filename: "fulltext.pdf", role: "fulltext" }],
      });
      vi.mocked(mockLibrary.find).mockResolvedValue(item);
      mockedDetachAttachment.mockResolvedValue({
        success: true,
        detached: ["fulltext.pdf"],
        deleted: [],
      });

      await fulltextDetach(mockLibrary, {
        identifier: "test-id",
        delete: true,
        fulltextDirectory: "/attachments",
        idType: "id",
      });

      expect(mockedDetachAttachment).toHaveBeenCalledWith(mockLibrary, {
        identifier: "test-id",
        filename: "fulltext.pdf",
        delete: true,
        idType: "id",
        attachmentsDirectory: "/attachments",
      });
    });
  });
});
