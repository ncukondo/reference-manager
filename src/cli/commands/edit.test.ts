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
  });

  describe("formatEditOutput", () => {
    it("formats successful single edit", () => {
      const result: EditCommandResult = {
        success: true,
        updatedCount: 1,
        updatedIds: ["Smith-2024"],
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
      };

      const output = formatEditOutput(result);
      expect(output).toContain("Updated 3 references");
    });

    it("formats error result", () => {
      const result: EditCommandResult = {
        success: false,
        updatedCount: 0,
        updatedIds: [],
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
        aborted: true,
      };

      const output = formatEditOutput(result);
      expect(output).toContain("aborted");
    });
  });
});
