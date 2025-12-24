import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";
import { type RemoveOperationOptions, removeReference } from "./remove.js";

// Mock Library
vi.mock("../../core/library.js");

describe("removeReference", () => {
  let mockLibrary: Library;
  const mockItem: CslItem = {
    id: "smith-2023",
    type: "article-journal",
    title: "Test Article",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2023]] },
    custom: { uuid: "uuid-1", created_at: "", timestamp: "" },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLibrary = {
      find: vi.fn(),
      findById: vi.fn(),
      findByUuid: vi.fn(),
      removeById: vi.fn(),
      removeByUuid: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as Library;
  });

  describe("remove by ID", () => {
    it("should remove reference by ID successfully", async () => {
      (mockLibrary.find as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);
      (mockLibrary.removeById as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const options: RemoveOperationOptions = { identifier: "smith-2023", byUuid: false };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(result.item).toEqual(mockItem);
      expect(mockLibrary.removeById).toHaveBeenCalledWith("smith-2023");
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should return removed=false when ID not found", async () => {
      (mockLibrary.find as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const options: RemoveOperationOptions = { identifier: "nonexistent", byUuid: false };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(false);
      expect(result.item).toBeUndefined();
      expect(mockLibrary.removeById).not.toHaveBeenCalled();
      expect(mockLibrary.save).not.toHaveBeenCalled();
    });
  });

  describe("remove by UUID", () => {
    it("should remove reference by UUID successfully", async () => {
      (mockLibrary.find as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);
      (mockLibrary.removeByUuid as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const options: RemoveOperationOptions = { identifier: "uuid-1", byUuid: true };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(result.item).toEqual(mockItem);
      expect(mockLibrary.removeByUuid).toHaveBeenCalledWith("uuid-1");
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should return removed=false when UUID not found", async () => {
      (mockLibrary.find as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      const options: RemoveOperationOptions = { identifier: "nonexistent-uuid", byUuid: true };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(false);
      expect(result.item).toBeUndefined();
      expect(mockLibrary.removeByUuid).not.toHaveBeenCalled();
      expect(mockLibrary.save).not.toHaveBeenCalled();
    });
  });

  describe("byUuid default", () => {
    it("should use byUuid=false by default", async () => {
      (mockLibrary.find as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);
      (mockLibrary.removeById as ReturnType<typeof vi.fn>).mockReturnValue(true);

      const options: RemoveOperationOptions = { identifier: "smith-2023" };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(mockLibrary.find).toHaveBeenCalledWith("smith-2023", { byUuid: false });
      expect(mockLibrary.removeById).toHaveBeenCalledWith("smith-2023");
    });
  });
});
