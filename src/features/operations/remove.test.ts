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
      remove: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as Library;
  });

  describe("remove by ID", () => {
    it("should remove reference by ID successfully", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        removed: true,
        removedItem: mockItem,
      });

      const options: RemoveOperationOptions = { identifier: "smith-2023", idType: "id" };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(result.removedItem).toEqual(mockItem);
      expect(mockLibrary.remove).toHaveBeenCalledWith("smith-2023", { idType: "id" });
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should return removed=false when ID not found", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({ removed: false });

      const options: RemoveOperationOptions = { identifier: "nonexistent", idType: "id" };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(false);
      expect(result.removedItem).toBeUndefined();
      expect(mockLibrary.remove).toHaveBeenCalledWith("nonexistent", { idType: "id" });
      expect(mockLibrary.save).not.toHaveBeenCalled();
    });
  });

  describe("remove by UUID", () => {
    it("should remove reference by UUID successfully", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        removed: true,
        removedItem: mockItem,
      });

      const options: RemoveOperationOptions = { identifier: "uuid-1", idType: "uuid" };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(result.removedItem).toEqual(mockItem);
      expect(mockLibrary.remove).toHaveBeenCalledWith("uuid-1", { idType: "uuid" });
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should return removed=false when UUID not found", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({ removed: false });

      const options: RemoveOperationOptions = { identifier: "nonexistent-uuid", idType: "uuid" };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(false);
      expect(result.removedItem).toBeUndefined();
      expect(mockLibrary.remove).toHaveBeenCalledWith("nonexistent-uuid", { idType: "uuid" });
      expect(mockLibrary.save).not.toHaveBeenCalled();
    });
  });

  describe("idType default", () => {
    it("should use idType='id' by default", async () => {
      (mockLibrary.remove as ReturnType<typeof vi.fn>).mockResolvedValue({
        removed: true,
        removedItem: mockItem,
      });

      const options: RemoveOperationOptions = { identifier: "smith-2023" };
      const result = await removeReference(mockLibrary, options);

      expect(result.removed).toBe(true);
      expect(mockLibrary.remove).toHaveBeenCalledWith("smith-2023", { idType: "id" });
    });
  });
});
