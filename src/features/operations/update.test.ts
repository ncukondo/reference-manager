import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary, UpdateResult } from "../../core/library-interface.js";
import { type UpdateOperationOptions, updateReference } from "./update.js";

describe("updateReference", () => {
  let mockLibrary: ILibrary;
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
      update: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as ILibrary;
  });

  describe("update by ID", () => {
    it("should update reference by ID successfully", async () => {
      const updateResult: UpdateResult = { updated: true, item: updatedMockItem };
      (mockLibrary.update as ReturnType<typeof vi.fn>).mockResolvedValue(updateResult);

      const options: UpdateOperationOptions = {
        identifier: "smith-2023",
        idType: "id",
        updates: { title: "Updated Title" },
      };
      const result = await updateReference(mockLibrary, options);

      expect(result.updated).toBe(true);
      expect(result.item?.title).toBe("Updated Title");
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "smith-2023",
        { title: "Updated Title" },
        { idType: "id", onIdCollision: "fail" }
      );
      expect(mockLibrary.save).toHaveBeenCalled();
    });

    it("should return updated=false when ID not found", async () => {
      const updateResult: UpdateResult = { updated: false };
      (mockLibrary.update as ReturnType<typeof vi.fn>).mockResolvedValue(updateResult);

      const options: UpdateOperationOptions = {
        identifier: "nonexistent",
        idType: "id",
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
      const updateResult: UpdateResult = { updated: true, item: updatedMockItem };
      (mockLibrary.update as ReturnType<typeof vi.fn>).mockResolvedValue(updateResult);

      const options: UpdateOperationOptions = {
        identifier: "uuid-1",
        idType: "uuid",
        updates: { title: "Updated Title" },
      };
      const result = await updateReference(mockLibrary, options);

      expect(result.updated).toBe(true);
      expect(result.item?.title).toBe("Updated Title");
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "uuid-1",
        { title: "Updated Title" },
        { idType: "uuid", onIdCollision: "fail" }
      );
      expect(mockLibrary.save).toHaveBeenCalled();
    });
  });

  describe("ID collision handling", () => {
    it("should return idCollision when collision occurs with fail option", async () => {
      const updateResult: UpdateResult = { updated: false, idCollision: true };
      (mockLibrary.update as ReturnType<typeof vi.fn>).mockResolvedValue(updateResult);

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
      const updateResult: UpdateResult = {
        updated: true,
        item: updatedMockItem,
        idChanged: true,
        newId: "existing-ida",
      };
      (mockLibrary.update as ReturnType<typeof vi.fn>).mockResolvedValue(updateResult);

      const options: UpdateOperationOptions = {
        identifier: "smith-2023",
        updates: { id: "existing-id" },
        onIdCollision: "suffix",
      };
      const result = await updateReference(mockLibrary, options);

      expect(result.updated).toBe(true);
      expect(result.idChanged).toBe(true);
      expect(result.newId).toBe("existing-ida");
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "smith-2023",
        { id: "existing-id" },
        { idType: "id", onIdCollision: "suffix" }
      );
    });
  });

  describe("idType default", () => {
    it("should use idType='id' by default", async () => {
      const updateResult: UpdateResult = { updated: true, item: updatedMockItem };
      (mockLibrary.update as ReturnType<typeof vi.fn>).mockResolvedValue(updateResult);

      const options: UpdateOperationOptions = {
        identifier: "smith-2023",
        updates: { title: "Updated Title" },
      };
      const result = await updateReference(mockLibrary, options);

      expect(result.updated).toBe(true);
      expect(mockLibrary.update).toHaveBeenCalledWith(
        "smith-2023",
        { title: "Updated Title" },
        { idType: "id", onIdCollision: "fail" }
      );
    });
  });
});
