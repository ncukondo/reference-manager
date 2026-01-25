import fs from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteDirectoryIfEmpty,
  ensureDirectory,
  getDirectoryPath,
  renameDirectory,
} from "./directory-manager.js";

vi.mock("node:fs/promises");

describe("directory-manager", () => {
  const mockBaseDir = "/data/attachments";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getDirectoryPath", () => {
    it("should return full path with directory name", () => {
      const ref = {
        id: "Smith-2024",
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          attachments: { directory: "Smith-2024-123e4567", files: [] },
        },
      };
      const result = getDirectoryPath(ref, mockBaseDir);
      expect(result).toBe("/data/attachments/Smith-2024-123e4567");
    });

    it("should generate directory name if not in attachments metadata", () => {
      const ref = {
        id: "Smith-2024",
        PMID: "12345678",
        custom: { uuid: "123e4567-e89b-12d3-a456-426614174000" },
      };
      const result = getDirectoryPath(ref, mockBaseDir);
      expect(result).toBe("/data/attachments/Smith-2024-PMID12345678-123e4567");
    });
  });

  describe("ensureDirectory", () => {
    it("should create directory if it does not exist", async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      const ref = {
        id: "Smith-2024",
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          attachments: { directory: "Smith-2024-123e4567", files: [] },
        },
      };

      const result = await ensureDirectory(ref, mockBaseDir);

      expect(result).toBe("/data/attachments/Smith-2024-123e4567");
      expect(fs.mkdir).toHaveBeenCalledWith("/data/attachments/Smith-2024-123e4567", {
        recursive: true,
      });
    });

    it("should not throw if directory already exists", async () => {
      const error = new Error("EEXIST") as NodeJS.ErrnoException;
      error.code = "EEXIST";
      vi.mocked(fs.mkdir).mockRejectedValue(error);

      const ref = {
        id: "Smith-2024",
        custom: {
          uuid: "123e4567-e89b-12d3-a456-426614174000",
          attachments: { directory: "Smith-2024-123e4567", files: [] },
        },
      };

      const result = await ensureDirectory(ref, mockBaseDir);
      expect(result).toBe("/data/attachments/Smith-2024-123e4567");
    });
  });

  describe("deleteDirectoryIfEmpty", () => {
    it("should delete empty directory", async () => {
      vi.mocked(fs.readdir).mockResolvedValue([]);
      vi.mocked(fs.rmdir).mockResolvedValue(undefined);

      const dirPath = "/data/attachments/Smith-2024-123e4567";
      await deleteDirectoryIfEmpty(dirPath);

      expect(fs.rmdir).toHaveBeenCalledWith(dirPath);
    });

    it("should not delete non-empty directory", async () => {
      vi.mocked(fs.readdir).mockResolvedValue(["file.pdf"] as unknown as []);

      const dirPath = "/data/attachments/Smith-2024-123e4567";
      await deleteDirectoryIfEmpty(dirPath);

      expect(fs.rmdir).not.toHaveBeenCalled();
    });

    it("should not throw if directory does not exist", async () => {
      const error = new Error("ENOENT") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      vi.mocked(fs.readdir).mockRejectedValue(error);

      const dirPath = "/data/attachments/Smith-2024-123e4567";
      await expect(deleteDirectoryIfEmpty(dirPath)).resolves.toBeUndefined();
    });
  });

  describe("renameDirectory", () => {
    it("should rename directory when path changes", async () => {
      vi.mocked(fs.rename).mockResolvedValue(undefined);

      const oldPath = "/data/attachments/Smith-2024-123e4567";
      const newPath = "/data/attachments/Smith-2024-PMID12345678-123e4567";

      await renameDirectory(oldPath, newPath);

      expect(fs.rename).toHaveBeenCalledWith(oldPath, newPath);
    });

    it("should do nothing if paths are the same", async () => {
      const samePath = "/data/attachments/Smith-2024-123e4567";

      await renameDirectory(samePath, samePath);

      expect(fs.rename).not.toHaveBeenCalled();
    });

    it("should not throw if old directory does not exist", async () => {
      const error = new Error("ENOENT") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      vi.mocked(fs.rename).mockRejectedValue(error);

      const oldPath = "/data/attachments/old-123e4567";
      const newPath = "/data/attachments/new-123e4567";

      await expect(renameDirectory(oldPath, newPath)).resolves.toBeUndefined();
    });
  });
});
