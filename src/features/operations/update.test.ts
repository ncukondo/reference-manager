import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { Library, UpdateResult } from "../../core/library.js";
import { type UpdateOperationOptions, updateReference } from "./update.js";

// Mock Library
vi.mock("../../core/library.js");

describe("updateReference", () => {
  let mockLibrary: Library;
  const mockItem: CslItem = {
    id: "smith-2023",
    type: "article-journal",
    title: "Test Article",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2023]] },
    custom: {
      uuid: "uuid-1",
      created_at: "2023-01-01T00:00:00Z",
      timestamp: "2023-01-01T00:00:00Z",
    },
  };
  const updatedMockItem: CslItem = {
    ...mockItem,
    title: "Updated Title",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLibrary = {
      findById: vi.fn(),
      findByUuid: vi.fn(),
      updateById: vi.fn(),
      updateByUuid: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as Library;
  });

  describe("update by ID", () => {
    it("should update reference by ID successfully", async () => {
      const updateResult: UpdateResult = { updated: true };
      (mockLibrary.updateById as ReturnType<typeof vi.fn>).mockReturnValue(updateResult);
      (mockLibrary.findById as ReturnType<typeof vi.fn>).mockReturnValue(updatedMockItem);

      const options: UpdateOperationOptions = {
        identifier: "smith-2023",
        byUuid: false,
        updates: { title: "Updated Title" },
      };
      const result = await updateReference(mockLibrary, options);

      expect(result.updated).toBe(true);
      expect(result.item?.title).toBe("Updated Title");
      expect(mockLibrary.updateById).toHaveBeenCalledWith(
        "smith-2023",
        { title: "Updated Title" },
        { onIdCollision: "fail" }
      );
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should return updated=false when ID not found", async () => {
      const updateResult: UpdateResult = { updated: false };
      (mockLibrary.updateById as ReturnType<typeof vi.fn>).mockReturnValue(updateResult);

      const options: UpdateOperationOptions = {
        identifier: "nonexistent",
        byUuid: false,
        updates: { title: "Updated Title" },
      };
      const result = await updateReference(mockLibrary, options);

      expect(result.updated).toBe(false);
      expect(result.item).toBeUndefined();
      expect(mockLibrary.save).not.toHaveBeenCalled();
    });
  });

  describe("update by UUID", () => {
    it("should update reference by UUID successfully", async () => {
      const updateResult: UpdateResult = { updated: true };
      (mockLibrary.updateByUuid as ReturnType<typeof vi.fn>).mockReturnValue(updateResult);
      (mockLibrary.findByUuid as ReturnType<typeof vi.fn>).mockReturnValue(updatedMockItem);

      const options: UpdateOperationOptions = {
        identifier: "uuid-1",
        byUuid: true,
        updates: { title: "Updated Title" },
      };
      const result = await updateReference(mockLibrary, options);

      expect(result.updated).toBe(true);
      expect(result.item?.title).toBe("Updated Title");
      expect(mockLibrary.updateByUuid).toHaveBeenCalledWith(
        "uuid-1",
        { title: "Updated Title" },
        { onIdCollision: "fail" }
      );
      expect(mockLibrary.save).toHaveBeenCalled();
    });
  });

  describe("ID collision handling", () => {
    it("should return idCollision when collision occurs with fail option", async () => {
      const updateResult: UpdateResult = { updated: false, idCollision: true };
      (mockLibrary.updateById as ReturnType<typeof vi.fn>).mockReturnValue(updateResult);

      const options: UpdateOperationOptions = {
        identifier: "smith-2023",
        updates: { id: "existing-id" },
        onIdCollision: "fail",
      };
      const result = await updateReference(mockLibrary, options);

      expect(result.updated).toBe(false);
      expect(result.idCollision).toBe(true);
      expect(mockLibrary.save).not.toHaveBeenCalled();
    });

    it("should add suffix when collision occurs with suffix option", async () => {
      const updateResult: UpdateResult = { updated: true, idChanged: true, newId: "existing-ida" };
      (mockLibrary.updateById as ReturnType<typeof vi.fn>).mockReturnValue(updateResult);
      (mockLibrary.findById as ReturnType<typeof vi.fn>).mockReturnValue(updatedMockItem);

      const options: UpdateOperationOptions = {
        identifier: "smith-2023",
        updates: { id: "existing-id" },
        onIdCollision: "suffix",
      };
      const result = await updateReference(mockLibrary, options);

      expect(result.updated).toBe(true);
      expect(result.idChanged).toBe(true);
      expect(result.newId).toBe("existing-ida");
      expect(mockLibrary.updateById).toHaveBeenCalledWith(
        "smith-2023",
        { id: "existing-id" },
        { onIdCollision: "suffix" }
      );
    });
  });

  describe("byUuid default", () => {
    it("should use byUuid=false by default", async () => {
      const updateResult: UpdateResult = { updated: true };
      (mockLibrary.updateById as ReturnType<typeof vi.fn>).mockReturnValue(updateResult);
      (mockLibrary.findById as ReturnType<typeof vi.fn>).mockReturnValue(updatedMockItem);

      const options: UpdateOperationOptions = {
        identifier: "smith-2023",
        updates: { title: "Updated Title" },
      };
      const result = await updateReference(mockLibrary, options);

      expect(result.updated).toBe(true);
      expect(mockLibrary.updateById).toHaveBeenCalled();
      expect(mockLibrary.updateByUuid).not.toHaveBeenCalled();
    });
  });
});
