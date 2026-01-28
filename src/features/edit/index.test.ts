import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";

// Mock modules before imports
vi.mock("./edit-session.js", () => ({
  createTempFile: vi.fn(),
  openEditor: vi.fn(),
  readTempFile: vi.fn(),
  writeTempFile: vi.fn(),
  deleteTempFile: vi.fn(),
}));

vi.mock("./validation-prompt.js", () => ({
  runValidationPrompt: vi.fn(),
}));

import {
  createTempFile,
  deleteTempFile,
  openEditor,
  readTempFile,
  writeTempFile,
} from "./edit-session.js";
import { executeEdit } from "./index.js";
import { runValidationPrompt } from "./validation-prompt.js";

describe("edit feature entry point", () => {
  const mockCreateTempFile = vi.mocked(createTempFile);
  const mockOpenEditor = vi.mocked(openEditor);
  const mockReadTempFile = vi.mocked(readTempFile);
  const mockWriteTempFile = vi.mocked(writeTempFile);
  const mockDeleteTempFile = vi.mocked(deleteTempFile);
  const mockRunValidationPrompt = vi.mocked(runValidationPrompt);

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

  describe("validation retry loop", () => {
    it("validation passes on first try - no prompt shown", async () => {
      const validYaml = `- id: Smith-2024
  type: article-journal
  title: Updated Title
`;
      mockReadTempFile.mockReturnValue(validYaml);

      const result = await executeEdit([sampleItem], {
        format: "yaml",
        editor: "vim",
      });

      expect(result.success).toBe(true);
      expect(result.editedItems).toHaveLength(1);
      expect(result.editedItems[0].title).toBe("Updated Title");
      expect(mockRunValidationPrompt).not.toHaveBeenCalled();
    });

    it("validation fails → re-edit → passes on second try", async () => {
      // First read: invalid date format
      const invalidYaml = `- id: Smith-2024
  type: article-journal
  issued: "invalid-date"
`;
      // Second read: valid date format
      const validYaml = `- id: Smith-2024
  type: article-journal
  issued: "2024-03-15"
`;
      mockReadTempFile.mockReturnValueOnce(invalidYaml).mockReturnValueOnce(validYaml);
      mockRunValidationPrompt.mockResolvedValue("re-edit");

      const result = await executeEdit([sampleItem], {
        format: "yaml",
        editor: "vim",
      });

      expect(result.success).toBe(true);
      expect(mockRunValidationPrompt).toHaveBeenCalledTimes(1);
      expect(mockWriteTempFile).toHaveBeenCalled();
      expect(mockOpenEditor).toHaveBeenCalledTimes(2);
    });

    it("validation fails → restore original → passes", async () => {
      // First read: invalid
      const invalidYaml = `- id: Smith-2024
  type: article-journal
  issued: "bad"
`;
      // Second read: valid (after restore)
      const validYaml = `- id: Smith-2024
  type: article-journal
  title: Test Article
`;
      mockReadTempFile.mockReturnValueOnce(invalidYaml).mockReturnValueOnce(validYaml);
      mockRunValidationPrompt.mockResolvedValue("restore");

      const result = await executeEdit([sampleItem], {
        format: "yaml",
        editor: "vim",
      });

      expect(result.success).toBe(true);
      expect(mockRunValidationPrompt).toHaveBeenCalledTimes(1);
      expect(mockWriteTempFile).toHaveBeenCalled();
      // Should have re-serialized original items (without error annotations)
      const writeCall = mockWriteTempFile.mock.calls[0];
      expect(writeCall[1]).not.toContain("⚠");
    });

    it("validation fails → abort → returns aborted result", async () => {
      const invalidYaml = `- id: Smith-2024
  type: article-journal
  issued: "invalid"
`;
      mockReadTempFile.mockReturnValue(invalidYaml);
      mockRunValidationPrompt.mockResolvedValue("abort");

      const result = await executeEdit([sampleItem], {
        format: "yaml",
        editor: "vim",
      });

      expect(result.success).toBe(false);
      expect(result.aborted).toBe(true);
      expect(result.editedItems).toHaveLength(0);
      expect(mockOpenEditor).toHaveBeenCalledTimes(1);
    });

    it("multiple validation failures → loop until abort", async () => {
      const invalidYaml = `- id: Smith-2024
  type: article-journal
  issued: "bad"
`;
      mockReadTempFile.mockReturnValue(invalidYaml);
      mockRunValidationPrompt
        .mockResolvedValueOnce("re-edit")
        .mockResolvedValueOnce("re-edit")
        .mockResolvedValueOnce("abort");

      const result = await executeEdit([sampleItem], {
        format: "yaml",
        editor: "vim",
      });

      expect(result.aborted).toBe(true);
      expect(mockRunValidationPrompt).toHaveBeenCalledTimes(3);
      expect(mockOpenEditor).toHaveBeenCalledTimes(3);
    });

    it("multiple validation failures → loop until passes", async () => {
      const invalidYaml = `- id: Smith-2024
  type: article-journal
  issued: "bad"
`;
      const validYaml = `- id: Smith-2024
  type: article-journal
  issued: "2024"
`;
      mockReadTempFile
        .mockReturnValueOnce(invalidYaml)
        .mockReturnValueOnce(invalidYaml)
        .mockReturnValueOnce(validYaml);
      mockRunValidationPrompt.mockResolvedValueOnce("re-edit").mockResolvedValueOnce("re-edit");

      const result = await executeEdit([sampleItem], {
        format: "yaml",
        editor: "vim",
      });

      expect(result.success).toBe(true);
      expect(result.aborted).toBeUndefined();
      expect(mockRunValidationPrompt).toHaveBeenCalledTimes(2);
      expect(mockOpenEditor).toHaveBeenCalledTimes(3);
    });

    it("JSON format - validates and handles errors", async () => {
      const invalidJson = `[{"id": "Smith-2024", "type": "article-journal", "issued": "bad"}]`;
      const validJson = `[{"id": "Smith-2024", "type": "article-journal", "issued": "2024"}]`;

      mockCreateTempFile.mockReturnValue("/tmp/ref-edit-123.json");
      mockReadTempFile.mockReturnValueOnce(invalidJson).mockReturnValueOnce(validJson);
      mockRunValidationPrompt.mockResolvedValue("re-edit");

      const result = await executeEdit([sampleItem], {
        format: "json",
        editor: "vim",
      });

      expect(result.success).toBe(true);
      expect(mockRunValidationPrompt).toHaveBeenCalledTimes(1);
      // Check that JSON error annotation was used
      const writeCall = mockWriteTempFile.mock.calls[0];
      expect(writeCall[1]).toContain("_errors");
    });

    it("YAML re-edit includes error annotations", async () => {
      const invalidYaml = `- id: Smith-2024
  type: article-journal
  issued: "bad-date"
`;
      const validYaml = `- id: Smith-2024
  type: article-journal
  issued: "2024"
`;
      mockReadTempFile.mockReturnValueOnce(invalidYaml).mockReturnValueOnce(validYaml);
      mockRunValidationPrompt.mockResolvedValue("re-edit");

      await executeEdit([sampleItem], { format: "yaml", editor: "vim" });

      const writeCall = mockWriteTempFile.mock.calls[0];
      const content = writeCall[1];
      expect(content).toContain("⚠ Validation Errors");
      expect(content).toContain("issued");
      expect(content).toContain("Invalid date format");
    });

    it("passes validation errors to prompt", async () => {
      const invalidYaml = `- id: Smith-2024
  type: article-journal
  issued: "bad"
`;
      mockReadTempFile.mockReturnValue(invalidYaml);
      mockRunValidationPrompt.mockResolvedValue("abort");

      await executeEdit([sampleItem], { format: "yaml", editor: "vim" });

      expect(mockRunValidationPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          valid: false,
        }),
        expect.any(Array)
      );
    });
  });
});
