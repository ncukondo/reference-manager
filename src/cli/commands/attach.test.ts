import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Library } from "../../core/library.js";
import type {
  AddAttachmentResult,
  DetachAttachmentResult,
  GetAttachmentResult,
  ListAttachmentsResult,
  OpenAttachmentResult,
  SyncAttachmentResult,
} from "../../features/operations/attachments/index.js";
import type { InferredFile } from "../../features/operations/attachments/sync.js";
import type { ExecutionContext } from "../execution-context.js";
import {
  type AttachAddOptions,
  type AttachDetachOptions,
  type AttachGetOptions,
  type AttachListOptions,
  type AttachOpenOptions,
  type AttachSyncOptions,
  buildRoleOverridesFromSuggestions,
  executeAttachAdd,
  executeAttachDetach,
  executeAttachGet,
  executeAttachList,
  executeAttachOpen,
  executeAttachSync,
  formatAttachAddOutput,
  formatAttachDetachOutput,
  formatAttachGetOutput,
  formatAttachListOutput,
  formatAttachOpenOutput,
  formatAttachSyncOutput,
  formatSyncPreviewWithSuggestions,
  generateRenameMap,
  getAttachExitCode,
  handleAttachSyncAction,
  syncNewFilesWithRolePrompt,
} from "./attach.js";

// Mock attachment operations
const mockAddAttachment = vi.fn();
const mockListAttachments = vi.fn();
const mockGetAttachment = vi.fn();
const mockDetachAttachment = vi.fn();
const mockSyncAttachments = vi.fn();
const mockOpenAttachment = vi.fn();

const mockSuggestRoleFromContext = vi.fn();

vi.mock("../../features/operations/attachments/index.js", () => ({
  addAttachment: (...args: unknown[]) => mockAddAttachment(...args),
  listAttachments: (...args: unknown[]) => mockListAttachments(...args),
  getAttachment: (...args: unknown[]) => mockGetAttachment(...args),
  detachAttachment: (...args: unknown[]) => mockDetachAttachment(...args),
  syncAttachments: (...args: unknown[]) => mockSyncAttachments(...args),
  openAttachment: (...args: unknown[]) => mockOpenAttachment(...args),
}));

vi.mock("../../features/operations/attachments/sync.js", () => ({
  suggestRoleFromContext: (...args: unknown[]) => mockSuggestRoleFromContext(...args),
}));

// Mocks for action handler tests
const mockLoadConfigWithOverrides = vi.fn();
const mockIsTTY = vi.fn();
const mockSetExitCode = vi.fn();
const mockCreateExecutionContext = vi.fn();
const mockReadChoice = vi.fn();
const mockReadConfirmation = vi.fn();

vi.mock("../helpers.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../helpers.js")>();
  return {
    ...actual,
    loadConfigWithOverrides: (...args: unknown[]) => mockLoadConfigWithOverrides(...args),
    isTTY: () => mockIsTTY(),
    setExitCode: (...args: unknown[]) => mockSetExitCode(...args),
    readChoice: (...args: unknown[]) => mockReadChoice(...args),
    readConfirmation: (...args: unknown[]) => mockReadConfirmation(...args),
  };
});

vi.mock("../execution-context.js", () => ({
  createExecutionContext: (...args: unknown[]) => mockCreateExecutionContext(...args),
}));

vi.mock("../../core/library.js", () => ({
  Library: { load: vi.fn() },
}));

describe("attach command", () => {
  const mockLibrary = {
    find: vi.fn(),
  } as unknown as Library;

  const localContext: ExecutionContext = {
    mode: "local",
    library: mockLibrary,
  };

  const attachmentsDirectory = "/home/user/.reference-manager/attachments";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("executeAttachOpen", () => {
    it("should open attachment directory", async () => {
      const result: OpenAttachmentResult = {
        success: true,
        path: "/home/user/.reference-manager/attachments/Smith-2024-123e4567",
        directoryCreated: false,
      };
      mockOpenAttachment.mockResolvedValue(result);

      const options: AttachOpenOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory,
      };

      const actual = await executeAttachOpen(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.path).toBe(result.path);
      expect(mockOpenAttachment).toHaveBeenCalledWith(localContext.library, {
        identifier: "Smith-2024",
        attachmentsDirectory,
        print: undefined,
        filename: undefined,
        role: undefined,
        idType: undefined,
      });
    });

    it("should open specific file", async () => {
      const result: OpenAttachmentResult = {
        success: true,
        path: "/home/user/.reference-manager/attachments/Smith-2024-123e4567/fulltext.pdf",
      };
      mockOpenAttachment.mockResolvedValue(result);

      const options: AttachOpenOptions = {
        identifier: "Smith-2024",
        filename: "fulltext.pdf",
        attachmentsDirectory,
      };

      const actual = await executeAttachOpen(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.path).toContain("fulltext.pdf");
    });

    it("should open file by role", async () => {
      const result: OpenAttachmentResult = {
        success: true,
        path: "/home/user/.reference-manager/attachments/Smith-2024-123e4567/notes.md",
      };
      mockOpenAttachment.mockResolvedValue(result);

      const options: AttachOpenOptions = {
        identifier: "Smith-2024",
        role: "notes",
        attachmentsDirectory,
      };

      const actual = await executeAttachOpen(options, localContext);

      expect(actual.success).toBe(true);
    });

    it("should print path instead of opening", async () => {
      const result: OpenAttachmentResult = {
        success: true,
        path: "/home/user/.reference-manager/attachments/Smith-2024-123e4567",
      };
      mockOpenAttachment.mockResolvedValue(result);

      const options: AttachOpenOptions = {
        identifier: "Smith-2024",
        print: true,
        attachmentsDirectory,
      };

      const actual = await executeAttachOpen(options, localContext);

      expect(actual.success).toBe(true);
      expect(mockOpenAttachment).toHaveBeenCalledWith(localContext.library, {
        identifier: "Smith-2024",
        attachmentsDirectory,
        print: true,
        filename: undefined,
        role: undefined,
        idType: undefined,
      });
    });

    it("should create directory if not exists", async () => {
      const result: OpenAttachmentResult = {
        success: true,
        path: "/home/user/.reference-manager/attachments/Smith-2024-123e4567",
        directoryCreated: true,
      };
      mockOpenAttachment.mockResolvedValue(result);

      const options: AttachOpenOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory,
      };

      const actual = await executeAttachOpen(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.directoryCreated).toBe(true);
    });
  });

  describe("executeAttachAdd", () => {
    it("should add attachment with role", async () => {
      const result: AddAttachmentResult = {
        success: true,
        filename: "supplement-table-s1.xlsx",
        directory: "Smith-2024-123e4567",
      };
      mockAddAttachment.mockResolvedValue(result);

      const options: AttachAddOptions = {
        identifier: "Smith-2024",
        filePath: "/path/to/table.xlsx",
        role: "supplement",
        label: "Table S1",
        attachmentsDirectory,
      };

      const actual = await executeAttachAdd(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.filename).toBe("supplement-table-s1.xlsx");
      expect(mockAddAttachment).toHaveBeenCalledWith(localContext.library, {
        identifier: "Smith-2024",
        filePath: "/path/to/table.xlsx",
        role: "supplement",
        label: "Table S1",
        attachmentsDirectory,
        move: undefined,
        force: undefined,
        idType: undefined,
      });
    });

    it("should move file instead of copy", async () => {
      const result: AddAttachmentResult = {
        success: true,
        filename: "notes.md",
        directory: "Smith-2024-123e4567",
      };
      mockAddAttachment.mockResolvedValue(result);

      const options: AttachAddOptions = {
        identifier: "Smith-2024",
        filePath: "/path/to/notes.md",
        role: "notes",
        move: true,
        attachmentsDirectory,
      };

      const actual = await executeAttachAdd(options, localContext);

      expect(actual.success).toBe(true);
      expect(mockAddAttachment).toHaveBeenCalledWith(
        localContext.library,
        expect.objectContaining({ move: true })
      );
    });

    it("should force overwrite existing file", async () => {
      const result: AddAttachmentResult = {
        success: true,
        filename: "fulltext.pdf",
        directory: "Smith-2024-123e4567",
        overwritten: true,
      };
      mockAddAttachment.mockResolvedValue(result);

      const options: AttachAddOptions = {
        identifier: "Smith-2024",
        filePath: "/path/to/new-paper.pdf",
        role: "fulltext",
        force: true,
        attachmentsDirectory,
      };

      const actual = await executeAttachAdd(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.overwritten).toBe(true);
    });

    it("should return error when file exists without force", async () => {
      const result: AddAttachmentResult = {
        success: false,
        existingFile: "fulltext.pdf",
        requiresConfirmation: true,
      };
      mockAddAttachment.mockResolvedValue(result);

      const options: AttachAddOptions = {
        identifier: "Smith-2024",
        filePath: "/path/to/paper.pdf",
        role: "fulltext",
        attachmentsDirectory,
      };

      const actual = await executeAttachAdd(options, localContext);

      expect(actual.success).toBe(false);
      expect(actual.requiresConfirmation).toBe(true);
    });
  });

  describe("executeAttachList", () => {
    it("should list all attachments", async () => {
      const result: ListAttachmentsResult = {
        success: true,
        directory: "Smith-2024-123e4567",
        files: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "supplement-table-s1.xlsx", role: "supplement", label: "Table S1" },
          { filename: "notes.md", role: "notes" },
        ],
      };
      mockListAttachments.mockResolvedValue(result);

      const options: AttachListOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory,
      };

      const actual = await executeAttachList(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.files).toHaveLength(3);
    });

    it("should filter by role", async () => {
      const result: ListAttachmentsResult = {
        success: true,
        directory: "Smith-2024-123e4567",
        files: [{ filename: "supplement-table-s1.xlsx", role: "supplement", label: "Table S1" }],
      };
      mockListAttachments.mockResolvedValue(result);

      const options: AttachListOptions = {
        identifier: "Smith-2024",
        role: "supplement",
        attachmentsDirectory,
      };

      const actual = await executeAttachList(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.files).toHaveLength(1);
      expect(actual.files[0].role).toBe("supplement");
    });
  });

  describe("executeAttachGet", () => {
    it("should get file path", async () => {
      const result: GetAttachmentResult = {
        success: true,
        path: "/home/user/.reference-manager/attachments/Smith-2024-123e4567/fulltext.pdf",
      };
      mockGetAttachment.mockResolvedValue(result);

      const options: AttachGetOptions = {
        identifier: "Smith-2024",
        filename: "fulltext.pdf",
        attachmentsDirectory,
      };

      const actual = await executeAttachGet(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.path).toContain("fulltext.pdf");
    });

    it("should get file content to stdout", async () => {
      const result: GetAttachmentResult = {
        success: true,
        path: "/home/user/.reference-manager/attachments/Smith-2024-123e4567/notes.md",
        content: Buffer.from("# Notes\n\nSome notes here."),
      };
      mockGetAttachment.mockResolvedValue(result);

      const options: AttachGetOptions = {
        identifier: "Smith-2024",
        filename: "notes.md",
        stdout: true,
        attachmentsDirectory,
      };

      const actual = await executeAttachGet(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.content).toBeDefined();
    });
  });

  describe("executeAttachDetach", () => {
    it("should detach specific file", async () => {
      const result: DetachAttachmentResult = {
        success: true,
        detached: ["supplement-table-s1.xlsx"],
        deleted: [],
      };
      mockDetachAttachment.mockResolvedValue(result);

      const options: AttachDetachOptions = {
        identifier: "Smith-2024",
        filename: "supplement-table-s1.xlsx",
        attachmentsDirectory,
      };

      const actual = await executeAttachDetach(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.detached).toContain("supplement-table-s1.xlsx");
    });

    it("should detach and delete file", async () => {
      const result: DetachAttachmentResult = {
        success: true,
        detached: ["notes.md"],
        deleted: ["notes.md"],
      };
      mockDetachAttachment.mockResolvedValue(result);

      const options: AttachDetachOptions = {
        identifier: "Smith-2024",
        filename: "notes.md",
        delete: true,
        attachmentsDirectory,
      };

      const actual = await executeAttachDetach(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.deleted).toContain("notes.md");
    });

    it("should detach all files of role", async () => {
      const result: DetachAttachmentResult = {
        success: true,
        detached: ["draft-v1.pdf", "draft-v2.pdf"],
        deleted: [],
      };
      mockDetachAttachment.mockResolvedValue(result);

      const options: AttachDetachOptions = {
        identifier: "Smith-2024",
        role: "draft",
        all: true,
        attachmentsDirectory,
      };

      const actual = await executeAttachDetach(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.detached).toHaveLength(2);
    });

    it("should delete directory when last file removed", async () => {
      const result: DetachAttachmentResult = {
        success: true,
        detached: ["fulltext.pdf"],
        deleted: ["fulltext.pdf"],
        directoryDeleted: true,
      };
      mockDetachAttachment.mockResolvedValue(result);

      const options: AttachDetachOptions = {
        identifier: "Smith-2024",
        filename: "fulltext.pdf",
        delete: true,
        attachmentsDirectory,
      };

      const actual = await executeAttachDetach(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.directoryDeleted).toBe(true);
    });
  });

  describe("executeAttachSync", () => {
    it("should detect new files (dry-run)", async () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [
          { filename: "supplement-data.csv", role: "supplement", label: "data" },
          { filename: "notes.md", role: "notes" },
        ],
        missingFiles: [],
        applied: false,
      };
      mockSyncAttachments.mockResolvedValue(result);

      const options: AttachSyncOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory,
      };

      const actual = await executeAttachSync(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.newFiles).toHaveLength(2);
      expect(actual.applied).toBe(false);
    });

    it("should apply changes with --yes", async () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "supplement-data.csv", role: "supplement", label: "data" }],
        missingFiles: [],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValue(result);

      const options: AttachSyncOptions = {
        identifier: "Smith-2024",
        yes: true,
        attachmentsDirectory,
      };

      const actual = await executeAttachSync(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.applied).toBe(true);
    });

    it("should detect missing files", async () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [],
        missingFiles: ["old-file.pdf"],
        applied: false,
      };
      mockSyncAttachments.mockResolvedValue(result);

      const options: AttachSyncOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory,
      };

      const actual = await executeAttachSync(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.missingFiles).toContain("old-file.pdf");
    });

    it("should remove missing files with --fix", async () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [],
        missingFiles: ["old-file.pdf"],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValue(result);

      const options: AttachSyncOptions = {
        identifier: "Smith-2024",
        fix: true,
        attachmentsDirectory,
      };

      const actual = await executeAttachSync(options, localContext);

      expect(actual.success).toBe(true);
      expect(actual.applied).toBe(true);
    });
  });

  describe("formatAttachOpenOutput", () => {
    it("should format successful open", () => {
      const result: OpenAttachmentResult = {
        success: true,
        path: "/path/to/dir",
      };
      expect(formatAttachOpenOutput(result)).toBe("Opened: /path/to/dir");
    });

    it("should format created directory", () => {
      const result: OpenAttachmentResult = {
        success: true,
        path: "/path/to/dir",
        directoryCreated: true,
      };
      expect(formatAttachOpenOutput(result)).toBe("Created and opened: /path/to/dir");
    });

    it("should format error", () => {
      const result: OpenAttachmentResult = {
        success: false,
        error: "Reference not found",
      };
      expect(formatAttachOpenOutput(result)).toBe("Error: Reference not found");
    });
  });

  describe("formatAttachAddOutput", () => {
    it("should format successful add", () => {
      const result: AddAttachmentResult = {
        success: true,
        filename: "supplement-data.xlsx",
        directory: "Smith-2024-123e4567",
      };
      expect(formatAttachAddOutput(result)).toBe("Added: supplement-data.xlsx");
    });

    it("should format overwritten", () => {
      const result: AddAttachmentResult = {
        success: true,
        filename: "fulltext.pdf",
        directory: "Smith-2024-123e4567",
        overwritten: true,
      };
      expect(formatAttachAddOutput(result)).toBe("Added (overwritten): fulltext.pdf");
    });

    it("should format requires confirmation", () => {
      const result: AddAttachmentResult = {
        success: false,
        existingFile: "fulltext.pdf",
        requiresConfirmation: true,
      };
      expect(formatAttachAddOutput(result)).toBe(
        "File already exists: fulltext.pdf\nUse --force to overwrite."
      );
    });
  });

  describe("formatAttachListOutput", () => {
    it("should format grouped by role", () => {
      const result: ListAttachmentsResult = {
        success: true,
        directory: "Smith-2024-123e4567",
        files: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "fulltext.md", role: "fulltext" },
          { filename: "supplement-table-s1.xlsx", role: "supplement", label: "Table S1" },
          { filename: "notes.md", role: "notes" },
        ],
      };
      const output = formatAttachListOutput(result, "Smith-2024");

      expect(output).toContain("Smith-2024");
      expect(output).toContain("fulltext:");
      expect(output).toContain("fulltext.pdf");
      expect(output).toContain("fulltext.md");
      expect(output).toContain("supplement:");
      expect(output).toContain("supplement-table-s1.xlsx");
      expect(output).toContain('"Table S1"');
      expect(output).toContain("notes:");
      expect(output).toContain("notes.md");
    });

    it("should format empty list", () => {
      const result: ListAttachmentsResult = {
        success: true,
        files: [],
      };
      expect(formatAttachListOutput(result, "Smith-2024")).toBe(
        "No attachments for reference: Smith-2024"
      );
    });
  });

  describe("formatAttachGetOutput", () => {
    it("should format path", () => {
      const result: GetAttachmentResult = {
        success: true,
        path: "/path/to/file.pdf",
      };
      expect(formatAttachGetOutput(result)).toBe("/path/to/file.pdf");
    });

    it("should format content", () => {
      const result: GetAttachmentResult = {
        success: true,
        path: "/path/to/file.md",
        content: Buffer.from("# Hello"),
      };
      expect(formatAttachGetOutput(result)).toBe("# Hello");
    });
  });

  describe("formatAttachDetachOutput", () => {
    it("should format detached files", () => {
      const result: DetachAttachmentResult = {
        success: true,
        detached: ["file1.pdf", "file2.pdf"],
        deleted: [],
      };
      const output = formatAttachDetachOutput(result);
      expect(output).toContain("Detached: file1.pdf");
      expect(output).toContain("Detached: file2.pdf");
    });

    it("should format deleted files", () => {
      const result: DetachAttachmentResult = {
        success: true,
        detached: ["file.pdf"],
        deleted: ["file.pdf"],
      };
      const output = formatAttachDetachOutput(result);
      expect(output).toContain("Detached and deleted: file.pdf");
    });

    it("should format directory deleted", () => {
      const result: DetachAttachmentResult = {
        success: true,
        detached: ["file.pdf"],
        deleted: ["file.pdf"],
        directoryDeleted: true,
      };
      const output = formatAttachDetachOutput(result);
      expect(output).toContain("Directory removed");
    });
  });

  describe("formatAttachSyncOutput", () => {
    it("should format new files found", () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "new-file.pdf", role: "supplement", label: "Data" }],
        missingFiles: [],
        applied: false,
      };
      const output = formatAttachSyncOutput(result);
      expect(output).toContain("Found 1 new file");
      expect(output).toContain("new-file.pdf");
      expect(output).toContain('role: supplement, label: "Data"');
      expect(output).toContain("Run with --yes to add new files");
    });

    it("should format missing files found", () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [],
        missingFiles: ["old-file.pdf"],
        applied: false,
      };
      const output = formatAttachSyncOutput(result);
      expect(output).toContain("Missing 1 file");
      expect(output).toContain("old-file.pdf");
      expect(output).toContain("Run with --fix to remove missing files");
    });

    it("should format applied changes", () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "new-file.pdf", role: "supplement" }],
        missingFiles: [],
        applied: true,
      };
      const output = formatAttachSyncOutput(result);
      expect(output).toContain("Added 1 file");
    });

    it("should format already in sync", () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [],
        missingFiles: [],
        applied: false,
      };
      expect(formatAttachSyncOutput(result)).toBe("Already in sync.");
    });
  });

  describe("getAttachExitCode", () => {
    it("should return 0 for success", () => {
      expect(getAttachExitCode({ success: true } as OpenAttachmentResult)).toBe(0);
    });

    it("should return 1 for failure", () => {
      expect(getAttachExitCode({ success: false, error: "Error" } as OpenAttachmentResult)).toBe(1);
    });
  });

  describe("Interactive mode helpers", () => {
    // Note: Full interactive mode testing requires E2E tests with TTY simulation
    // These tests cover the format output functions used in interactive mode

    it("should format sync result with new files for interactive display", () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [
          { filename: "supplement-data.csv", role: "supplement", label: "data" },
          { filename: "notes.md", role: "notes" },
        ],
        missingFiles: [],
        applied: true,
      };
      const output = formatAttachSyncOutput(result);

      expect(output).toContain("Added 2 files:");
      expect(output).toContain("supplement-data.csv");
      expect(output).toContain("notes.md");
    });

    it("should handle directory mode without interactive sync", () => {
      // When --no-sync is used, only open result is shown
      const result: OpenAttachmentResult = {
        success: true,
        path: "/path/to/dir",
        directoryCreated: true,
      };
      const output = formatAttachOpenOutput(result);
      expect(output).toBe("Created and opened: /path/to/dir");
    });
  });

  describe("buildRoleOverridesFromSuggestions", () => {
    beforeEach(() => {
      mockSuggestRoleFromContext.mockReset();
    });

    it("should build overrides for 'other' role files with suggestions", () => {
      const newFiles: InferredFile[] = [
        { filename: "mmc1.pdf", role: "other" },
        { filename: "supplement-data.csv", role: "supplement", label: "data" },
      ];
      mockSuggestRoleFromContext.mockReturnValueOnce("fulltext");

      const overrides = buildRoleOverridesFromSuggestions(newFiles);

      expect(overrides).toEqual({
        "mmc1.pdf": { role: "fulltext" },
      });
      expect(mockSuggestRoleFromContext).toHaveBeenCalledOnce();
    });

    it("should skip files that already have a known role", () => {
      const newFiles: InferredFile[] = [
        { filename: "fulltext.pdf", role: "fulltext" },
        { filename: "notes.md", role: "notes" },
      ];

      const overrides = buildRoleOverridesFromSuggestions(newFiles);

      expect(overrides).toEqual({});
      expect(mockSuggestRoleFromContext).not.toHaveBeenCalled();
    });

    it("should skip 'other' files when suggestion returns null", () => {
      const newFiles: InferredFile[] = [{ filename: "readme.xyz", role: "other" }];
      mockSuggestRoleFromContext.mockReturnValueOnce(null);

      const overrides = buildRoleOverridesFromSuggestions(newFiles);

      expect(overrides).toEqual({});
    });

    it("should use all newFiles as context for suggestions", () => {
      const newFiles: InferredFile[] = [
        { filename: "mmc1.pdf", role: "other" },
        { filename: "fulltext.pdf", role: "fulltext" },
      ];
      mockSuggestRoleFromContext.mockReturnValueOnce("supplement");

      const overrides = buildRoleOverridesFromSuggestions(newFiles);

      expect(overrides).toEqual({
        "mmc1.pdf": { role: "supplement" },
      });
      // suggestRoleFromContext should receive all files as context
      expect(mockSuggestRoleFromContext).toHaveBeenCalledWith("mmc1.pdf", newFiles);
    });
  });

  describe("generateRenameMap", () => {
    it("should generate renames for files with overridden roles", () => {
      const newFiles: InferredFile[] = [{ filename: "mmc1.pdf", role: "other" }];
      const overrides: Record<string, { role: string; label?: string }> = {
        "mmc1.pdf": { role: "supplement" },
      };

      const renames = generateRenameMap(newFiles, overrides);

      expect(renames).toEqual({ "mmc1.pdf": "supplement-mmc1.pdf" });
    });

    it("should generate renames with label", () => {
      const newFiles: InferredFile[] = [{ filename: "data.csv", role: "other" }];
      const overrides: Record<string, { role: string; label?: string }> = {
        "data.csv": { role: "supplement", label: "raw-data" },
      };

      const renames = generateRenameMap(newFiles, overrides);

      expect(renames).toEqual({ "data.csv": "supplement-raw-data.csv" });
    });

    it("should not rename files that already match convention", () => {
      const newFiles: InferredFile[] = [{ filename: "fulltext.pdf", role: "fulltext" }];
      const overrides: Record<string, { role: string }> = {};

      const renames = generateRenameMap(newFiles, overrides);

      expect(renames).toEqual({});
    });

    it("should not rename files without overrides", () => {
      const newFiles: InferredFile[] = [{ filename: "notes.md", role: "notes" }];
      const overrides: Record<string, { role: string }> = {};

      const renames = generateRenameMap(newFiles, overrides);

      expect(renames).toEqual({});
    });

    it("should handle files without extension (no trailing dot)", () => {
      const newFiles: InferredFile[] = [{ filename: "Makefile", role: "other" }];
      const overrides: Record<string, { role: string; label?: string }> = {
        Makefile: { role: "supplement" },
      };

      const renames = generateRenameMap(newFiles, overrides);

      expect(renames).toEqual({ Makefile: "supplement-Makefile" });
    });

    it("should handle multiple files with some overridden", () => {
      const newFiles: InferredFile[] = [
        { filename: "mmc1.pdf", role: "other" },
        { filename: "supplement-data.csv", role: "supplement", label: "data" },
        { filename: "PIIS123.pdf", role: "other" },
      ];
      const overrides: Record<string, { role: string; label?: string }> = {
        "mmc1.pdf": { role: "supplement" },
        "PIIS123.pdf": { role: "fulltext" },
      };

      const renames = generateRenameMap(newFiles, overrides);

      expect(renames).toEqual({
        "mmc1.pdf": "supplement-mmc1.pdf",
        "PIIS123.pdf": "fulltext-PIIS123.pdf",
      });
    });
  });

  describe("formatSyncPreviewWithSuggestions", () => {
    it("should show suggestions for 'other' files in preview", () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [
          { filename: "supplement-data.csv", role: "supplement", label: "data" },
          { filename: "mmc1.pdf", role: "other" },
        ],
        missingFiles: [],
        applied: false,
      };
      const suggestions: Record<string, { role: string }> = {
        "mmc1.pdf": { role: "supplement" },
      };
      const renames: Record<string, string> = {
        "mmc1.pdf": "supplement-mmc1.pdf",
      };

      const output = formatSyncPreviewWithSuggestions(result, suggestions, renames, "Smith-2024");

      expect(output).toContain("Sync preview for Smith-2024");
      expect(output).toContain("supplement-data.csv");
      expect(output).toContain('role: supplement, label: "data"');
      expect(output).toContain("mmc1.pdf");
      expect(output).toContain("role: supplement (suggested, inferred: other)");
      expect(output).toContain("rename: supplement-mmc1.pdf");
    });

    it("should show apply commands in preview", () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "mmc1.pdf", role: "other" }],
        missingFiles: [],
        applied: false,
      };
      const suggestions: Record<string, { role: string }> = {
        "mmc1.pdf": { role: "fulltext" },
      };
      const renames: Record<string, string> = {
        "mmc1.pdf": "fulltext-mmc1.pdf",
      };

      const output = formatSyncPreviewWithSuggestions(result, suggestions, renames, "Smith-2024");

      expect(output).toContain("ref attach sync Smith-2024 --yes");
      expect(output).toContain("ref attach sync Smith-2024 --yes --no-rename");
    });

    it("should not show rename line when no renames", () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "fulltext.pdf", role: "fulltext" }],
        missingFiles: [],
        applied: false,
      };

      const output = formatSyncPreviewWithSuggestions(result, {}, {}, "Smith-2024");

      expect(output).not.toContain("rename:");
      expect(output).not.toContain("--no-rename");
    });

    it("should handle missing files section", () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [],
        missingFiles: ["old-file.pdf"],
        applied: false,
      };

      const output = formatSyncPreviewWithSuggestions(result, {}, {}, "Smith-2024");

      expect(output).toContain("Missing 1 file");
      expect(output).toContain("old-file.pdf");
    });
  });

  describe("executeAttachSync with roleOverrides", () => {
    it("should pass roleOverrides to sync operation", async () => {
      const result: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "mmc1.pdf", role: "supplement" }],
        missingFiles: [],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValue(result);

      const overrides = { "mmc1.pdf": { role: "supplement" } };
      const options: AttachSyncOptions = {
        identifier: "Smith-2024",
        attachmentsDirectory,
        yes: true,
        roleOverrides: overrides,
      };

      await executeAttachSync(options, localContext);

      expect(mockSyncAttachments).toHaveBeenCalledWith(
        localContext.library,
        expect.objectContaining({ roleOverrides: overrides })
      );
    });
  });

  describe("handleAttachSyncAction", () => {
    const mockConfig = {
      attachments: { directory: attachmentsDirectory },
    };

    beforeEach(() => {
      mockLoadConfigWithOverrides.mockResolvedValue(mockConfig);
      mockCreateExecutionContext.mockResolvedValue(localContext);
      mockIsTTY.mockReturnValue(false);
      vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    });

    it("should apply suggestions when --yes --fix is used", async () => {
      const dryRunResult: SyncAttachmentResult = {
        success: true,
        newFiles: [
          { filename: "mmc1.pdf", role: "other" },
          { filename: "fulltext.pdf", role: "fulltext" },
        ],
        missingFiles: ["old-file.pdf"],
        applied: false,
      };
      const applyResult: SyncAttachmentResult = {
        success: true,
        newFiles: [
          { filename: "mmc1.pdf", role: "supplement" },
          { filename: "fulltext.pdf", role: "fulltext" },
        ],
        missingFiles: ["old-file.pdf"],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValueOnce(dryRunResult).mockResolvedValueOnce(applyResult);
      mockSuggestRoleFromContext.mockReturnValueOnce("supplement");

      await handleAttachSyncAction("Smith-2024", { yes: true, fix: true }, {});

      // First call: dry-run (no yes/fix)
      expect(mockSyncAttachments).toHaveBeenCalledTimes(2);
      expect(mockSyncAttachments.mock.calls[0][1]).toEqual(
        expect.objectContaining({
          identifier: "Smith-2024",
          attachmentsDirectory,
        })
      );
      expect(mockSyncAttachments.mock.calls[0][1]).not.toHaveProperty("yes");
      expect(mockSyncAttachments.mock.calls[0][1]).not.toHaveProperty("fix");

      // Second call: apply with yes, fix, and roleOverrides
      expect(mockSyncAttachments.mock.calls[1][1]).toEqual(
        expect.objectContaining({
          identifier: "Smith-2024",
          attachmentsDirectory,
          yes: true,
          fix: true,
          roleOverrides: { "mmc1.pdf": { role: "supplement" } },
        })
      );
    });

    it("should pass renames when --yes is used (auto rename)", async () => {
      const dryRunResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "mmc1.pdf", role: "other" }],
        missingFiles: [],
        applied: false,
      };
      const applyResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "supplement-mmc1.pdf", role: "supplement" }],
        missingFiles: [],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValueOnce(dryRunResult).mockResolvedValueOnce(applyResult);
      mockSuggestRoleFromContext.mockReturnValueOnce("supplement");

      await handleAttachSyncAction("Smith-2024", { yes: true }, {});

      expect(mockSyncAttachments).toHaveBeenCalledTimes(2);
      // Second call should include renames
      expect(mockSyncAttachments.mock.calls[1][1]).toEqual(
        expect.objectContaining({
          yes: true,
          roleOverrides: { "mmc1.pdf": { role: "supplement" } },
          renames: { "mmc1.pdf": "supplement-mmc1.pdf" },
        })
      );
    });

    it("should NOT pass renames when --yes --no-rename is used", async () => {
      const dryRunResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "mmc1.pdf", role: "other" }],
        missingFiles: [],
        applied: false,
      };
      const applyResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "mmc1.pdf", role: "supplement" }],
        missingFiles: [],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValueOnce(dryRunResult).mockResolvedValueOnce(applyResult);
      mockSuggestRoleFromContext.mockReturnValueOnce("supplement");

      await handleAttachSyncAction("Smith-2024", { yes: true, noRename: true }, {});

      expect(mockSyncAttachments).toHaveBeenCalledTimes(2);
      // Second call should NOT include renames
      expect(mockSyncAttachments.mock.calls[1][1]).not.toHaveProperty("renames");
      // But should still include roleOverrides
      expect(mockSyncAttachments.mock.calls[1][1]).toEqual(
        expect.objectContaining({
          yes: true,
          roleOverrides: { "mmc1.pdf": { role: "supplement" } },
        })
      );
    });

    it("should apply suggestions when --yes without --fix is used", async () => {
      const dryRunResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "mmc1.pdf", role: "other" }],
        missingFiles: [],
        applied: false,
      };
      const applyResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "mmc1.pdf", role: "supplement" }],
        missingFiles: [],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValueOnce(dryRunResult).mockResolvedValueOnce(applyResult);
      mockSuggestRoleFromContext.mockReturnValueOnce("supplement");

      await handleAttachSyncAction("Smith-2024", { yes: true }, {});

      expect(mockSyncAttachments).toHaveBeenCalledTimes(2);
      // Second call: apply with yes but NOT fix
      expect(mockSyncAttachments.mock.calls[1][1]).toEqual(
        expect.objectContaining({
          yes: true,
          roleOverrides: { "mmc1.pdf": { role: "supplement" } },
        })
      );
      expect(mockSyncAttachments.mock.calls[1][1]).not.toHaveProperty("fix");
    });
  });

  describe("syncNewFilesWithRolePrompt", () => {
    beforeEach(() => {
      vi.spyOn(process.stderr, "write").mockImplementation(() => true);
    });

    it("should prompt for unknown roles when files have role 'other'", async () => {
      // Dry-run returns files with "other" role
      const dryRunResult: SyncAttachmentResult = {
        success: true,
        newFiles: [
          { filename: "mmc1.pdf", role: "other" },
          { filename: "fulltext.pdf", role: "fulltext" },
        ],
        missingFiles: [],
        applied: false,
      };
      const applyResult: SyncAttachmentResult = {
        success: true,
        newFiles: [
          { filename: "mmc1.pdf", role: "supplement" },
          { filename: "fulltext.pdf", role: "fulltext" },
        ],
        missingFiles: [],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValueOnce(dryRunResult).mockResolvedValueOnce(applyResult);
      mockSuggestRoleFromContext.mockReturnValueOnce("supplement");
      mockReadChoice.mockResolvedValueOnce("supplement");
      // readConfirmation calls: 1) rename prompt, 2) apply confirmation
      mockReadConfirmation.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      await syncNewFilesWithRolePrompt("Smith-2024", attachmentsDirectory, undefined, localContext);

      // Should call readChoice for the "other" file
      expect(mockReadChoice).toHaveBeenCalledOnce();
      expect(mockReadChoice.mock.calls[0][0]).toContain("mmc1.pdf");

      // Second sync call should include roleOverrides and renames
      expect(mockSyncAttachments).toHaveBeenCalledTimes(2);
      expect(mockSyncAttachments.mock.calls[1][1]).toEqual(
        expect.objectContaining({
          yes: true,
          roleOverrides: { "mmc1.pdf": { role: "supplement" } },
          renames: { "mmc1.pdf": "supplement-mmc1.pdf" },
        })
      );
    });

    it("should skip prompts when all files have known roles", async () => {
      const dryRunResult: SyncAttachmentResult = {
        success: true,
        newFiles: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "supplement-data.csv", role: "supplement", label: "data" },
        ],
        missingFiles: [],
        applied: false,
      };
      const applyResult: SyncAttachmentResult = {
        success: true,
        newFiles: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "supplement-data.csv", role: "supplement", label: "data" },
        ],
        missingFiles: [],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValueOnce(dryRunResult).mockResolvedValueOnce(applyResult);
      mockReadConfirmation.mockResolvedValueOnce(true);

      await syncNewFilesWithRolePrompt("Smith-2024", attachmentsDirectory, undefined, localContext);

      // No role prompt needed
      expect(mockReadChoice).not.toHaveBeenCalled();

      // Apply should happen without roleOverrides
      expect(mockSyncAttachments).toHaveBeenCalledTimes(2);
      expect(mockSyncAttachments.mock.calls[1][1]).not.toHaveProperty("roleOverrides");
    });

    it("should not apply changes when user declines confirmation", async () => {
      const dryRunResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "fulltext.pdf", role: "fulltext" }],
        missingFiles: [],
        applied: false,
      };
      mockSyncAttachments.mockResolvedValueOnce(dryRunResult);
      mockReadConfirmation.mockResolvedValueOnce(false);

      await syncNewFilesWithRolePrompt("Smith-2024", attachmentsDirectory, undefined, localContext);

      // Only dry-run call, no apply call
      expect(mockSyncAttachments).toHaveBeenCalledTimes(1);
    });

    it("should handle no new files detected", async () => {
      const dryRunResult: SyncAttachmentResult = {
        success: true,
        newFiles: [],
        missingFiles: [],
        applied: false,
      };
      mockSyncAttachments.mockResolvedValueOnce(dryRunResult);

      await syncNewFilesWithRolePrompt("Smith-2024", attachmentsDirectory, undefined, localContext);

      expect(mockReadChoice).not.toHaveBeenCalled();
      expect(mockReadConfirmation).not.toHaveBeenCalled();
      // Only dry-run call
      expect(mockSyncAttachments).toHaveBeenCalledTimes(1);
    });

    it("should prompt for rename and pass renames when accepted (TTY)", async () => {
      const dryRunResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "mmc1.pdf", role: "other" }],
        missingFiles: [],
        applied: false,
      };
      const applyResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "supplement-mmc1.pdf", role: "supplement" }],
        missingFiles: [],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValueOnce(dryRunResult).mockResolvedValueOnce(applyResult);
      mockSuggestRoleFromContext.mockReturnValueOnce("supplement");
      mockReadChoice.mockResolvedValueOnce("supplement");
      // First readConfirmation: rename prompt (accept rename)
      // Second readConfirmation: apply confirmation
      mockReadConfirmation.mockResolvedValueOnce(true).mockResolvedValueOnce(true);

      await syncNewFilesWithRolePrompt("Smith-2024", attachmentsDirectory, undefined, localContext);

      // Should have prompted for rename
      expect(mockReadConfirmation).toHaveBeenCalledTimes(2);

      // Second sync call should include renames
      expect(mockSyncAttachments).toHaveBeenCalledTimes(2);
      expect(mockSyncAttachments.mock.calls[1][1]).toEqual(
        expect.objectContaining({
          yes: true,
          roleOverrides: { "mmc1.pdf": { role: "supplement" } },
          renames: { "mmc1.pdf": "supplement-mmc1.pdf" },
        })
      );
    });

    it("should not pass renames when rename is declined (TTY)", async () => {
      const dryRunResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "mmc1.pdf", role: "other" }],
        missingFiles: [],
        applied: false,
      };
      const applyResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "mmc1.pdf", role: "supplement" }],
        missingFiles: [],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValueOnce(dryRunResult).mockResolvedValueOnce(applyResult);
      mockSuggestRoleFromContext.mockReturnValueOnce("supplement");
      mockReadChoice.mockResolvedValueOnce("supplement");
      // First readConfirmation: rename prompt (decline rename)
      // Second readConfirmation: apply confirmation
      mockReadConfirmation.mockResolvedValueOnce(false).mockResolvedValueOnce(true);

      await syncNewFilesWithRolePrompt("Smith-2024", attachmentsDirectory, undefined, localContext);

      // Second sync call should NOT include renames
      expect(mockSyncAttachments).toHaveBeenCalledTimes(2);
      expect(mockSyncAttachments.mock.calls[1][1]).not.toHaveProperty("renames");
    });

    it("should not prompt for rename when filename already matches convention", async () => {
      // fulltext.pdf already matches the convention for role=fulltext
      const dryRunResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "fulltext.pdf", role: "fulltext" }],
        missingFiles: [],
        applied: false,
      };
      const applyResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "fulltext.pdf", role: "fulltext" }],
        missingFiles: [],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValueOnce(dryRunResult).mockResolvedValueOnce(applyResult);
      // Only one readConfirmation for the apply confirmation (no rename prompt)
      mockReadConfirmation.mockResolvedValueOnce(true);

      await syncNewFilesWithRolePrompt("Smith-2024", attachmentsDirectory, undefined, localContext);

      // Only 1 confirmation (for apply), no rename prompt
      expect(mockReadConfirmation).toHaveBeenCalledTimes(1);
      // No renames in sync call
      expect(mockSyncAttachments.mock.calls[1][1]).not.toHaveProperty("renames");
    });

    it("should not include 'other' selections in overrides", async () => {
      // User keeps file as "other"
      const dryRunResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "unknown.xyz", role: "other" }],
        missingFiles: [],
        applied: false,
      };
      const applyResult: SyncAttachmentResult = {
        success: true,
        newFiles: [{ filename: "unknown.xyz", role: "other" }],
        missingFiles: [],
        applied: true,
      };
      mockSyncAttachments.mockResolvedValueOnce(dryRunResult).mockResolvedValueOnce(applyResult);
      mockSuggestRoleFromContext.mockReturnValueOnce(null);
      mockReadChoice.mockResolvedValueOnce("other");
      mockReadConfirmation.mockResolvedValueOnce(true);

      await syncNewFilesWithRolePrompt("Smith-2024", attachmentsDirectory, undefined, localContext);

      // Apply should happen without roleOverrides since user kept "other"
      expect(mockSyncAttachments.mock.calls[1][1]).not.toHaveProperty("roleOverrides");
    });
  });
});
