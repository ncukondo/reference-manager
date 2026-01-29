import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ExecutionContext } from "../execution-context.js";
import {
  type EditCommandOptions,
  type EditCommandResult,
  executeEditCommand,
  formatEditOutput,
} from "./edit.js";

// Mock the edit feature
vi.mock("../../features/edit/index.js", () => ({
  executeEdit: vi.fn(),
  resolveEditor: vi.fn(),
}));

import { executeEdit, resolveEditor } from "../../features/edit/index.js";

describe("edit command", () => {
  const mockFind = vi.fn();
  const mockUpdate = vi.fn();
  const mockSave = vi.fn();

  const createContext = (): ExecutionContext =>
    ({
      mode: "local",
      library: {
        find: mockFind,
        update: mockUpdate,
        save: mockSave,
      },
    }) as unknown as ExecutionContext;

  const sampleItem: CslItem = {
    id: "Smith-2024",
    type: "article-journal",
    title: "Test Article",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440000",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-03-15T10:30:00.000Z",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFind.mockResolvedValue(sampleItem);
    mockUpdate.mockResolvedValue({ updated: true, item: sampleItem });
    mockSave.mockResolvedValue(undefined);
    vi.mocked(resolveEditor).mockReturnValue("vim");
  });

  describe("executeEditCommand", () => {
    it("resolves identifiers and executes edit flow", async () => {
      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [
          {
            id: "Smith-2024",
            type: "article-journal",
            title: "Updated Title",
            _extractedUuid: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
      });

      const options: EditCommandOptions = {
        identifiers: ["Smith-2024"],
        format: "yaml",
      };

      const result = await executeEditCommand(options, createContext());

      expect(mockFind).toHaveBeenCalledWith("Smith-2024", { idType: "id" });
      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
    });

    it("uses uuid idType when --uuid flag is set", async () => {
      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [
          {
            id: "Smith-2024",
            _extractedUuid: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
      });

      const options: EditCommandOptions = {
        identifiers: ["550e8400-e29b-41d4-a716-446655440000"],
        format: "yaml",
        useUuid: true,
      };

      const result = await executeEditCommand(options, createContext());

      expect(mockFind).toHaveBeenCalledWith("550e8400-e29b-41d4-a716-446655440000", {
        idType: "uuid",
      });
      expect(result.success).toBe(true);
    });

    it("handles json format option", async () => {
      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [{ id: "Smith-2024", _extractedUuid: "550e8400-e29b-41d4-a716-446655440000" }],
      });

      const options: EditCommandOptions = {
        identifiers: ["Smith-2024"],
        format: "json",
      };

      await executeEditCommand(options, createContext());

      expect(executeEdit).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({ format: "json" })
      );
    });

    it("handles multiple references", async () => {
      const item2: CslItem = {
        id: "Doe-2023",
        type: "book",
        title: "Test Book",
        custom: {
          uuid: "660e8400-e29b-41d4-a716-446655440001",
        },
      };

      mockFind.mockResolvedValueOnce(sampleItem).mockResolvedValueOnce(item2);

      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [
          { id: "Smith-2024", _extractedUuid: "550e8400-e29b-41d4-a716-446655440000" },
          { id: "Doe-2023", _extractedUuid: "660e8400-e29b-41d4-a716-446655440001" },
        ],
      });

      const options: EditCommandOptions = {
        identifiers: ["Smith-2024", "Doe-2023"],
        format: "yaml",
      };

      const result = await executeEditCommand(options, createContext());

      expect(mockFind).toHaveBeenCalledTimes(2);
      expect(result.updatedCount).toBe(2);
    });

    it("returns error when reference not found", async () => {
      mockFind.mockResolvedValue(undefined);

      const options: EditCommandOptions = {
        identifiers: ["Unknown-2024"],
        format: "yaml",
      };

      const result = await executeEditCommand(options, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("returns error when edit fails", async () => {
      vi.mocked(executeEdit).mockResolvedValue({
        success: false,
        editedItems: [],
        error: "Editor exited with code 1",
      });

      const options: EditCommandOptions = {
        identifiers: ["Smith-2024"],
        format: "yaml",
      };

      const result = await executeEditCommand(options, createContext());

      expect(result.success).toBe(false);
      expect(result.error).toContain("Editor exited");
    });

    it("updates references after successful edit", async () => {
      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [
          {
            id: "Smith-2024",
            title: "Updated Title",
            _extractedUuid: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
      });

      const options: EditCommandOptions = {
        identifiers: ["Smith-2024"],
        format: "yaml",
      };

      await executeEditCommand(options, createContext());

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSave).toHaveBeenCalled();
    });

    it("returns unchanged state when no changes detected", async () => {
      const unchangedItem = { ...sampleItem, title: "Same Title" };
      mockFind.mockResolvedValue(unchangedItem);
      mockUpdate.mockResolvedValue({ updated: false, item: unchangedItem });

      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [
          {
            id: "Smith-2024",
            type: "article-journal",
            title: "Same Title",
            _extractedUuid: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
      });

      const options: EditCommandOptions = {
        identifiers: ["Smith-2024"],
        format: "yaml",
      };

      const result = await executeEditCommand(options, createContext());

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(0);
      expect(result.results.length).toBe(1);
      expect(result.results[0].state).toBe("unchanged");
      expect(result.results[0].item).toBeDefined();
      expect(result.results[0].oldItem).toBeDefined();
      expect(mockSave).not.toHaveBeenCalled();
    });

    it("falls back to ID-based update when item has no UUID", async () => {
      const itemWithoutUuid: CslItem = {
        id: "Smith-2024",
        type: "article-journal",
        title: "Test Article",
      };

      mockFind.mockResolvedValue(itemWithoutUuid);
      mockUpdate.mockResolvedValue({
        updated: true,
        item: { ...itemWithoutUuid, title: "Updated Title" },
      });

      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [
          {
            id: "Smith-2024",
            type: "article-journal",
            title: "Updated Title",
          },
        ],
      });

      const options: EditCommandOptions = {
        identifiers: ["Smith-2024"],
        format: "yaml",
      };

      const result = await executeEditCommand(options, createContext());

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
      expect(mockUpdate).toHaveBeenCalledWith(
        "Smith-2024",
        expect.any(Object),
        expect.objectContaining({ idType: "id" })
      );
    });

    it("propagates idChanged/newId from UpdateResult", async () => {
      const resolvedItem = { ...sampleItem, id: "Smith-2024a" };
      mockUpdate.mockResolvedValue({
        updated: true,
        item: resolvedItem,
        idChanged: true,
        newId: "Smith-2024a",
      });

      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [
          {
            id: "Smith-2024",
            type: "article-journal",
            title: "Test Article",
            _extractedUuid: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
      });

      const options: EditCommandOptions = {
        identifiers: ["Smith-2024"],
        format: "yaml",
      };

      const result = await executeEditCommand(options, createContext());

      expect(result.results[0].state).toBe("updated");
      expect(result.results[0].idChanged).toBe(true);
      expect(result.results[0].newId).toBe("Smith-2024a");
    });

    it("uses newId for updatedIds when ID was auto-resolved", async () => {
      const resolvedItem = { ...sampleItem, id: "Smith-2024a" };
      mockUpdate.mockResolvedValue({
        updated: true,
        item: resolvedItem,
        idChanged: true,
        newId: "Smith-2024a",
      });

      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [
          {
            id: "Smith-2024",
            type: "article-journal",
            title: "Test Article",
            _extractedUuid: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
      });

      const options: EditCommandOptions = {
        identifiers: ["Smith-2024"],
        format: "yaml",
      };

      const result = await executeEditCommand(options, createContext());

      expect(result.updatedIds).toEqual(["Smith-2024a"]);
    });

    it("passes onIdCollision: suffix to library.update", async () => {
      const resolvedItem = { ...sampleItem, id: "Smith-2024a" };
      mockUpdate.mockResolvedValue({
        updated: true,
        item: resolvedItem,
        idChanged: true,
        newId: "Smith-2024a",
      });

      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [
          {
            id: "Smith-2024",
            type: "article-journal",
            title: "Test Article",
            _extractedUuid: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
      });

      const options: EditCommandOptions = {
        identifiers: ["Smith-2024"],
        format: "yaml",
      };

      const result = await executeEditCommand(options, createContext());

      // Verify onIdCollision: "suffix" is passed
      expect(mockUpdate).toHaveBeenCalledWith(
        "550e8400-e29b-41d4-a716-446655440000",
        expect.any(Object),
        expect.objectContaining({ idType: "uuid", onIdCollision: "suffix" })
      );
      // ID collision is resolved, not failed
      expect(result.results[0].state).toBe("updated");
      expect(result.results[0].idChanged).toBe(true);
    });

    it("does not include idChanged/newId when not present in UpdateResult", async () => {
      mockUpdate.mockResolvedValue({
        updated: true,
        item: sampleItem,
      });

      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [
          {
            id: "Smith-2024",
            type: "article-journal",
            title: "Updated Title",
            _extractedUuid: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
      });

      const options: EditCommandOptions = {
        identifiers: ["Smith-2024"],
        format: "yaml",
      };

      const result = await executeEditCommand(options, createContext());

      expect(result.results[0].state).toBe("updated");
      expect(result.results[0].idChanged).toBeUndefined();
      expect(result.results[0].newId).toBeUndefined();
    });

    it("includes oldItem in id_collision result", async () => {
      mockUpdate.mockResolvedValue({ updated: false, errorType: "id_collision" });

      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [
          {
            id: "Smith-2024",
            type: "article-journal",
            title: "Updated Title",
            _extractedUuid: "550e8400-e29b-41d4-a716-446655440000",
          },
        ],
      });

      const options: EditCommandOptions = {
        identifiers: ["Smith-2024"],
        format: "yaml",
      };

      const result = await executeEditCommand(options, createContext());

      expect(result.results[0].state).toBe("id_collision");
      expect(result.results[0].oldItem).toBeDefined();
      expect(result.results[0].oldItem?.id).toBe("Smith-2024");
    });

    it("returns detailed results for each edited item", async () => {
      const item1 = {
        ...sampleItem,
        id: "Item-1",
        custom: { ...sampleItem.custom, uuid: "uuid-1" },
      };
      const item2 = {
        ...sampleItem,
        id: "Item-2",
        custom: { ...sampleItem.custom, uuid: "uuid-2" },
      };

      mockFind.mockImplementation((id) => {
        if (id === "Item-1") return Promise.resolve(item1);
        if (id === "Item-2") return Promise.resolve(item2);
        return Promise.resolve(undefined);
      });

      mockUpdate.mockImplementation((uuid) => {
        if (uuid === "uuid-1")
          return Promise.resolve({ updated: true, item: { ...item1, title: "Updated 1" } });
        if (uuid === "uuid-2") return Promise.resolve({ updated: false, item: item2 }); // No changes
        return Promise.resolve({ updated: false });
      });

      vi.mocked(executeEdit).mockResolvedValue({
        success: true,
        editedItems: [
          { id: "Item-1", title: "Updated 1", _extractedUuid: "uuid-1" },
          { id: "Item-2", title: item2.title, _extractedUuid: "uuid-2" },
        ],
      });

      const options: EditCommandOptions = {
        identifiers: ["Item-1", "Item-2"],
        format: "yaml",
      };

      const result = await executeEditCommand(options, createContext());

      expect(result.success).toBe(true);
      expect(result.updatedCount).toBe(1);
      expect(result.updatedIds).toEqual(["Item-1"]);
      expect(result.results.length).toBe(2);
      expect(result.results[0].state).toBe("updated");
      expect(result.results[1].state).toBe("unchanged");
    });
  });

  describe("formatEditOutput", () => {
    it("formats successful single edit", () => {
      const result: EditCommandResult = {
        success: true,
        updatedCount: 1,
        updatedIds: ["Smith-2024"],
        results: [],
      };

      const output = formatEditOutput(result);
      expect(output).toContain("Updated 1 reference");
      expect(output).toContain("Smith-2024");
    });

    it("formats successful multiple edits", () => {
      const result: EditCommandResult = {
        success: true,
        updatedCount: 3,
        updatedIds: ["Smith-2024", "Doe-2023", "Johnson-2022"],
        results: [],
      };

      const output = formatEditOutput(result);
      expect(output).toContain("Updated 3 references");
    });

    it("formats error result", () => {
      const result: EditCommandResult = {
        success: false,
        updatedCount: 0,
        updatedIds: [],
        results: [],
        error: "Reference not found: Unknown-2024",
      };

      const output = formatEditOutput(result);
      expect(output).toContain("Error");
      expect(output).toContain("not found");
    });

    it("formats aborted edit", () => {
      const result: EditCommandResult = {
        success: false,
        updatedCount: 0,
        updatedIds: [],
        results: [],
        aborted: true,
      };

      const output = formatEditOutput(result);
      expect(output).toContain("aborted");
    });

    it("formats output with unchanged items", () => {
      const result: EditCommandResult = {
        success: true,
        updatedCount: 1,
        updatedIds: ["Smith-2024"],
        results: [
          { id: "Smith-2024", state: "updated" },
          { id: "Doe-2023", state: "unchanged" },
        ],
      };

      const output = formatEditOutput(result);
      expect(output).toContain("Updated 1 of 2 references");
      expect(output).toContain("Smith-2024");
      expect(output).toContain("No changes: 1");
      expect(output).toContain("Doe-2023");
    });

    it("formats output with failed items", () => {
      const result: EditCommandResult = {
        success: true,
        updatedCount: 1,
        updatedIds: ["Smith-2024"],
        results: [
          { id: "Smith-2024", state: "updated" },
          { id: "NotFound", state: "not_found" },
          { id: "Collision", state: "id_collision" },
        ],
      };

      const output = formatEditOutput(result);
      expect(output).toContain("Updated 1 of 3 references");
      expect(output).toContain("Failed: 2");
      expect(output).toContain("NotFound (Not found)");
      expect(output).toContain("Collision (ID collision)");
    });

    it("formats output when all items unchanged", () => {
      const result: EditCommandResult = {
        success: true,
        updatedCount: 0,
        updatedIds: [],
        results: [
          { id: "Smith-2024", state: "unchanged" },
          { id: "Doe-2023", state: "unchanged" },
        ],
      };

      const output = formatEditOutput(result);
      expect(output).toContain("Updated 0 of 2 references");
      expect(output).toContain("No changes: 2");
    });

    it("shows changed fields for updated items", () => {
      const oldItem: CslItem = {
        id: "Smith-2024",
        type: "article",
        title: "Old Title",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };
      const newItem: CslItem = {
        id: "Smith-2024",
        type: "article",
        title: "New Title",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-02T00:00:00.000Z",
        },
      };
      const result: EditCommandResult = {
        success: true,
        updatedCount: 1,
        updatedIds: ["Smith-2024"],
        results: [{ id: "Smith-2024", state: "updated", oldItem, item: newItem }],
      };

      const output = formatEditOutput(result);
      expect(output).toContain("Smith-2024");
      expect(output).toContain('title: "Old Title" → "New Title"');
    });

    it("shows changed fields for multiple updated items", () => {
      const oldItem1: CslItem = {
        id: "Smith-2024",
        type: "article",
        title: "Old Title",
        custom: {
          uuid: "uuid-1",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };
      const newItem1: CslItem = {
        ...oldItem1,
        title: "New Title",
        custom: { ...oldItem1.custom, timestamp: "2024-01-02T00:00:00.000Z" },
      };
      const oldItem2: CslItem = {
        id: "Doe-2023",
        type: "article",
        title: "Another Article",
        volume: "1",
        custom: {
          uuid: "uuid-2",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };
      const newItem2: CslItem = {
        ...oldItem2,
        volume: "2",
        custom: { ...oldItem2.custom, timestamp: "2024-01-02T00:00:00.000Z" },
      };
      const result: EditCommandResult = {
        success: true,
        updatedCount: 2,
        updatedIds: ["Smith-2024", "Doe-2023"],
        results: [
          { id: "Smith-2024", state: "updated", oldItem: oldItem1, item: newItem1 },
          { id: "Doe-2023", state: "updated", oldItem: oldItem2, item: newItem2 },
        ],
      };

      const output = formatEditOutput(result);
      expect(output).toContain('title: "Old Title" → "New Title"');
      expect(output).toContain('volume: "1" → "2"');
    });

    it("shows (was: original) for items with idChanged", () => {
      const oldItem: CslItem = {
        id: "Smith-2024",
        type: "article",
        title: "Test Title",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };
      const newItem: CslItem = {
        id: "Smith-2024a",
        type: "article",
        title: "Test Title",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-02T00:00:00.000Z",
        },
      };
      const result: EditCommandResult = {
        success: true,
        updatedCount: 1,
        updatedIds: ["Smith-2024a"],
        results: [
          {
            id: "Smith-2024",
            state: "updated",
            oldItem,
            item: newItem,
            idChanged: true,
            newId: "Smith-2024a",
          },
        ],
      };

      const output = formatEditOutput(result);
      expect(output).toContain("Smith-2024a (ID collision resolved: Smith-2024 → Smith-2024a)");
    });

    it("does not show (was:) when id is not changed", () => {
      const oldItem: CslItem = {
        id: "Smith-2024",
        type: "article",
        title: "Old Title",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      };
      const newItem: CslItem = {
        id: "Smith-2024",
        type: "article",
        title: "New Title",
        custom: {
          uuid: "test-uuid",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-02T00:00:00.000Z",
        },
      };
      const result: EditCommandResult = {
        success: true,
        updatedCount: 1,
        updatedIds: ["Smith-2024"],
        results: [{ id: "Smith-2024", state: "updated", oldItem, item: newItem }],
      };

      const output = formatEditOutput(result);
      expect(output).toContain("  - Smith-2024");
      expect(output).not.toContain("(ID collision resolved:");
    });

    it("does not show change details for items without oldItem", () => {
      const result: EditCommandResult = {
        success: true,
        updatedCount: 1,
        updatedIds: ["Smith-2024"],
        results: [{ id: "Smith-2024", state: "updated" }],
      };

      const output = formatEditOutput(result);
      expect(output).toContain("Smith-2024");
      expect(output).not.toContain("→");
    });
  });

  describe("executeInteractiveEdit", () => {
    // Note: Interactive edit functionality is tested via E2E tests
    // because it requires mocking multiple interactive modules
    // See src/cli/interactive-id-selection.e2e.test.ts
    it.todo("should be tested via E2E tests");
  });
});
