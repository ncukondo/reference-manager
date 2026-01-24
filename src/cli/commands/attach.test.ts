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
import type { ExecutionContext } from "../execution-context.js";
import {
  type AttachAddOptions,
  type AttachDetachOptions,
  type AttachGetOptions,
  type AttachListOptions,
  type AttachOpenOptions,
  type AttachSyncOptions,
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
  getAttachExitCode,
} from "./attach.js";

// Mock attachment operations
const mockAddAttachment = vi.fn();
const mockListAttachments = vi.fn();
const mockGetAttachment = vi.fn();
const mockDetachAttachment = vi.fn();
const mockSyncAttachments = vi.fn();
const mockOpenAttachment = vi.fn();

vi.mock("../../features/operations/attachments/index.js", () => ({
  addAttachment: (...args: unknown[]) => mockAddAttachment(...args),
  listAttachments: (...args: unknown[]) => mockListAttachments(...args),
  getAttachment: (...args: unknown[]) => mockGetAttachment(...args),
  detachAttachment: (...args: unknown[]) => mockDetachAttachment(...args),
  syncAttachments: (...args: unknown[]) => mockSyncAttachments(...args),
  openAttachment: (...args: unknown[]) => mockOpenAttachment(...args),
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
});
