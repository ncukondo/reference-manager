import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";

// Mock modules before imports
vi.mock("./edit-session.js", () => ({
  createTempFile: vi.fn(),
  openEditor: vi.fn(),
  readTempFile: vi.fn(),
  deleteTempFile: vi.fn(),
}));

import { createTempFile, deleteTempFile, openEditor, readTempFile } from "./edit-session.js";
import { executeEdit } from "./index.js";

describe("edit feature entry point", () => {
  const mockCreateTempFile = vi.mocked(createTempFile);
  const mockOpenEditor = vi.mocked(openEditor);
  const mockReadTempFile = vi.mocked(readTempFile);
  const mockDeleteTempFile = vi.mocked(deleteTempFile);

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

  const sampleItem2: CslItem = {
    id: "Doe-2023",
    type: "book",
    title: "Test Book",
    custom: {
      uuid: "660e8400-e29b-41d4-a716-446655440001",
      created_at: "2023-01-01T00:00:00.000Z",
      timestamp: "2023-06-15T10:30:00.000Z",
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateTempFile.mockReturnValue("/tmp/ref-edit-123.yaml");
    mockOpenEditor.mockReturnValue(0);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("executeEdit", () => {
    it("executes full edit flow with YAML format", async () => {
      const editedYaml = `# === Protected Fields (do not edit) ===
# uuid: 550e8400-e29b-41d4-a716-446655440000
# ========================================

- id: Smith-2024
  type: article-journal
  title: "Updated Title"
`;
      mockReadTempFile.mockReturnValue(editedYaml);

      const result = await executeEdit([sampleItem], {
        format: "yaml",
        editor: "vim",
      });

      expect(mockCreateTempFile).toHaveBeenCalledTimes(1);
      expect(mockOpenEditor).toHaveBeenCalledWith("vim", "/tmp/ref-edit-123.yaml");
      expect(mockReadTempFile).toHaveBeenCalledWith("/tmp/ref-edit-123.yaml");
      expect(mockDeleteTempFile).toHaveBeenCalledWith("/tmp/ref-edit-123.yaml");
      expect(result.success).toBe(true);
      expect(result.editedItems).toHaveLength(1);
      expect(result.editedItems[0].title).toBe("Updated Title");
    });

    it("executes full edit flow with JSON format", async () => {
      mockCreateTempFile.mockReturnValue("/tmp/ref-edit-123.json");
      const editedJson = `[
  {
    "_protected": {
      "uuid": "550e8400-e29b-41d4-a716-446655440000"
    },
    "id": "Smith-2024",
    "type": "article-journal",
    "title": "Updated JSON Title"
  }
]`;
      mockReadTempFile.mockReturnValue(editedJson);

      const result = await executeEdit([sampleItem], {
        format: "json",
        editor: "vim",
      });

      expect(mockCreateTempFile).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
      expect(result.editedItems).toHaveLength(1);
      expect(result.editedItems[0].title).toBe("Updated JSON Title");
    });

    it("handles multiple references", async () => {
      const editedYaml = `# === Protected Fields (do not edit) ===
# uuid: 550e8400-e29b-41d4-a716-446655440000
# ========================================

- id: Smith-2024
  type: article-journal
  title: "Updated Smith"

---

# === Protected Fields (do not edit) ===
# uuid: 660e8400-e29b-41d4-a716-446655440001
# ========================================

- id: Doe-2023
  type: book
  title: "Updated Doe"
`;
      mockReadTempFile.mockReturnValue(editedYaml);

      const result = await executeEdit([sampleItem, sampleItem2], {
        format: "yaml",
        editor: "vim",
      });

      expect(result.success).toBe(true);
      expect(result.editedItems).toHaveLength(2);
    });

    it("returns error result when editor exits with non-zero code", async () => {
      mockOpenEditor.mockReturnValue(1);

      const result = await executeEdit([sampleItem], {
        format: "yaml",
        editor: "vim",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Editor exited with code 1");
      expect(mockDeleteTempFile).toHaveBeenCalled();
    });

    it("returns parse error for invalid YAML", async () => {
      mockReadTempFile.mockReturnValue("invalid: yaml: :");

      const result = await executeEdit([sampleItem], {
        format: "yaml",
        editor: "vim",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockDeleteTempFile).toHaveBeenCalled();
    });

    it("returns parse error for invalid JSON", async () => {
      mockCreateTempFile.mockReturnValue("/tmp/ref-edit-123.json");
      mockReadTempFile.mockReturnValue("{ invalid json");

      const result = await executeEdit([sampleItem], {
        format: "json",
        editor: "vim",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockDeleteTempFile).toHaveBeenCalled();
    });

    it("cleans up temp file even on error", async () => {
      mockOpenEditor.mockReturnValue(1);

      await executeEdit([sampleItem], {
        format: "yaml",
        editor: "vim",
      });

      expect(mockDeleteTempFile).toHaveBeenCalledWith("/tmp/ref-edit-123.yaml");
    });

    it("matches edited items by UUID", async () => {
      const editedYaml = `# === Protected Fields (do not edit) ===
# uuid: 550e8400-e29b-41d4-a716-446655440000
# ========================================

- id: Smith-2024-renamed
  type: article-journal
  title: "Updated Title"
`;
      mockReadTempFile.mockReturnValue(editedYaml);

      const result = await executeEdit([sampleItem], {
        format: "yaml",
        editor: "vim",
      });

      expect(result.success).toBe(true);
      expect(result.editedItems).toHaveLength(1);
      // UUID should be preserved from comment
      expect(result.editedItems[0]._extractedUuid).toBe("550e8400-e29b-41d4-a716-446655440000");
    });
  });
});
