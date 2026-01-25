import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";
import type { AttachResult, DetachResult } from "../../features/fulltext/index.js";
import type { ExecutionContext } from "../execution-context.js";
import type { ServerClient } from "../server-client.js";
import {
  type FulltextAttachOptions,
  type FulltextAttachResult,
  type FulltextDetachOptions,
  type FulltextDetachResult,
  type FulltextGetOptions,
  type FulltextGetResult,
  type FulltextOpenOptions,
  type FulltextOpenResult,
  executeFulltextAttach,
  executeFulltextDetach,
  executeFulltextGet,
  executeFulltextOpen,
  formatFulltextAttachOutput,
  formatFulltextDetachOutput,
  formatFulltextGetOutput,
  formatFulltextOpenOutput,
  getFulltextExitCode,
} from "./fulltext.js";

// Mock FulltextManager methods
const mockAttachFile = vi.fn();
const mockGetFilePath = vi.fn();
const mockDetachFile = vi.fn();
const mockEnsureDirectory = vi.fn();
const mockHasAttachment = vi.fn();
const mockGetAttachedTypes = vi.fn();

vi.mock("../../features/fulltext/index.js", () => ({
  FulltextManager: vi.fn().mockImplementation(() => ({
    attachFile: mockAttachFile,
    getFilePath: mockGetFilePath,
    detachFile: mockDetachFile,
    ensureDirectory: mockEnsureDirectory,
    hasAttachment: mockHasAttachment,
    getAttachedTypes: mockGetAttachedTypes,
  })),
  FulltextIOError: class FulltextIOError extends Error {
    constructor(
      message: string,
      public cause?: Error
    ) {
      super(message);
      this.name = "FulltextIOError";
    }
  },
  FulltextNotAttachedError: class FulltextNotAttachedError extends Error {
    constructor(
      public itemId: string,
      public type: string
    ) {
      super(`No ${type} attached to ${itemId}`);
      this.name = "FulltextNotAttachedError";
    }
  },
}));

// Mock updateReference
const mockUpdateReference = vi.fn();
vi.mock("../../features/operations/update.js", () => ({
  updateReference: (...args: unknown[]) => mockUpdateReference(...args),
}));

// Mock fs/promises for stdout support and temp cleanup
const mockReadFile = vi.fn();
const mockRm = vi.fn().mockResolvedValue(undefined);
const mockStat = vi.fn();
const mockUnlink = vi.fn().mockResolvedValue(undefined);
const mockMkdir = vi.fn().mockResolvedValue(undefined);
const mockReaddir = vi.fn().mockResolvedValue([]);
const mockRmdir = vi.fn().mockResolvedValue(undefined);
const mockCopyFile = vi.fn().mockResolvedValue(undefined);
const mockRename = vi.fn().mockResolvedValue(undefined);
const mockAccess = vi.fn().mockResolvedValue(undefined);
vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...original,
    readFile: (...args: unknown[]) => mockReadFile(...args),
    rm: (...args: unknown[]) => mockRm(...args),
    stat: (...args: unknown[]) => mockStat(...args),
    unlink: (...args: unknown[]) => mockUnlink(...args),
    mkdir: (...args: unknown[]) => mockMkdir(...args),
    readdir: (...args: unknown[]) => mockReaddir(...args),
    rmdir: (...args: unknown[]) => mockRmdir(...args),
    copyFile: (...args: unknown[]) => mockCopyFile(...args),
    rename: (...args: unknown[]) => mockRename(...args),
    access: (...args: unknown[]) => mockAccess(...args),
    default: {
      ...original,
      readFile: (...args: unknown[]) => mockReadFile(...args),
      rm: (...args: unknown[]) => mockRm(...args),
      stat: (...args: unknown[]) => mockStat(...args),
      unlink: (...args: unknown[]) => mockUnlink(...args),
      mkdir: (...args: unknown[]) => mockMkdir(...args),
      readdir: (...args: unknown[]) => mockReaddir(...args),
      rmdir: (...args: unknown[]) => mockRmdir(...args),
      copyFile: (...args: unknown[]) => mockCopyFile(...args),
      rename: (...args: unknown[]) => mockRename(...args),
      access: (...args: unknown[]) => mockAccess(...args),
    },
  };
});

// Mock node:fs for existsSync (partial mock to preserve other functions)
const mockExistsSync = vi.fn();
vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return {
    ...original,
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
  };
});

// Mock opener for fulltext open
const mockOpenWithSystemApp = vi.fn();
vi.mock("../../utils/opener.js", () => ({
  openWithSystemApp: (...args: unknown[]) => mockOpenWithSystemApp(...args),
}));

describe("fulltext command", () => {
  // Mock reference object
  const mockReference = {
    getItem: vi.fn(),
  };

  const mockLibrary = {
    find: vi.fn(),
    findById: vi.fn(),
    findByUuid: vi.fn(),
    update: vi.fn(),
    save: vi.fn(),
  } as unknown as Library;

  const mockServerClient = {
    find: vi.fn(),
    findById: vi.fn(),
    findByUuid: vi.fn(),
    update: vi.fn(),
    save: vi.fn(),
  } as unknown as ServerClient;

  const serverContext: ExecutionContext = {
    mode: "server",
    library: mockServerClient,
  };

  const localContext: ExecutionContext = {
    mode: "local",
    library: mockLibrary,
  };

  const mockItem: CslItem = {
    id: "Smith-2024",
    type: "article-journal",
    title: "Test Article",
    custom: {
      uuid: "123e4567-e89b-12d3-a456-426614174000",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  };

  const fulltextDirectory = "/home/user/.reference-manager/fulltext";

  beforeEach(() => {
    vi.clearAllMocks();
    mockReference.getItem.mockReturnValue(mockItem);
    // Setup default mock behavior for library methods
    vi.mocked(mockLibrary.update).mockResolvedValue(undefined);
    vi.mocked(mockLibrary.save).mockResolvedValue(undefined);
    // Setup default mock behavior for fs operations
    mockStat.mockResolvedValue({ isFile: () => true });
    mockReaddir.mockResolvedValue([]);
  });

  describe("executeFulltextAttach", () => {
    describe("via local context", () => {
      it("should attach a PDF file by extension detection", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(mockItem);
        const mockAttachResult: AttachResult = {
          filename: "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf",
          overwritten: false,
        };
        mockAttachFile.mockResolvedValue(mockAttachResult);
        mockUpdateReference.mockResolvedValue({ updated: true, item: mockItem });

        const options: FulltextAttachOptions = {
          identifier: "Smith-2024",
          filePath: "/path/to/paper.pdf",
          fulltextDirectory,
        };

        const result = await executeFulltextAttach(options, localContext);

        expect(result.success).toBe(true);
        // New attachments format uses fulltext.{ext}
        expect(result.filename).toBe("fulltext.pdf");
        expect(result.type).toBe("pdf");
      });

      it("should attach a Markdown file by extension detection", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(mockItem);
        const mockAttachResult: AttachResult = {
          filename: "Smith-2024-123e4567-e89b-12d3-a456-426614174000.md",
          overwritten: false,
        };
        mockAttachFile.mockResolvedValue(mockAttachResult);
        mockUpdateReference.mockResolvedValue({ updated: true, item: mockItem });

        const options: FulltextAttachOptions = {
          identifier: "Smith-2024",
          filePath: "/path/to/notes.md",
          fulltextDirectory,
        };

        const result = await executeFulltextAttach(options, localContext);

        expect(result.success).toBe(true);
        expect(result.type).toBe("markdown");
      });

      it("should use explicit type over extension detection", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(mockItem);
        const mockAttachResult: AttachResult = {
          filename: "Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf",
          overwritten: false,
        };
        mockAttachFile.mockResolvedValue(mockAttachResult);
        mockUpdateReference.mockResolvedValue({ updated: true, item: mockItem });

        const options: FulltextAttachOptions = {
          identifier: "Smith-2024",
          filePath: "/path/to/document.txt",
          type: "pdf",
          fulltextDirectory,
        };

        const result = await executeFulltextAttach(options, localContext);

        expect(result.success).toBe(true);
        expect(result.type).toBe("pdf");
      });

      it("should return error when reference not found", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(undefined);

        const options: FulltextAttachOptions = {
          identifier: "NonExistent",
          filePath: "/path/to/paper.pdf",
          fulltextDirectory,
        };

        const result = await executeFulltextAttach(options, localContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain("not found");
      });

      it("should return error when file type cannot be detected", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(mockItem);

        const options: FulltextAttachOptions = {
          identifier: "Smith-2024",
          filePath: "/path/to/document.txt",
          fulltextDirectory,
        };

        const result = await executeFulltextAttach(options, localContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain("Cannot detect file type");
      });

      it("should use move option when specified", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(mockItem);
        mockStat.mockResolvedValue({ isFile: () => true });

        const options: FulltextAttachOptions = {
          identifier: "Smith-2024",
          filePath: "/path/to/paper.pdf",
          move: true,
          fulltextDirectory,
        };

        const result = await executeFulltextAttach(options, localContext);

        // With move=true, rename should be called instead of copyFile
        expect(result.success).toBe(true);
        expect(mockRename).toHaveBeenCalled();
        expect(mockCopyFile).not.toHaveBeenCalled();
      });

      it("should return existing file info when not forced", async () => {
        // Create item with existing fulltext attachment
        const itemWithExistingFulltext: CslItem = {
          ...mockItem,
          custom: {
            uuid: "123e4567-e89b-12d3-a456-426614174000",
            created_at: "2024-01-01T00:00:00.000Z",
            timestamp: "2024-01-01T00:00:00.000Z",
            attachments: {
              directory: "Smith-2024-123e4567",
              files: [{ filename: "fulltext.pdf", role: "fulltext", format: "pdf" }],
            },
          },
        };
        vi.mocked(mockLibrary.find).mockResolvedValue(itemWithExistingFulltext);
        mockStat.mockResolvedValue({ isFile: () => true });

        const options: FulltextAttachOptions = {
          identifier: "Smith-2024",
          filePath: "/path/to/paper.pdf",
          // force: false (default)
          fulltextDirectory,
        };

        const result = await executeFulltextAttach(options, localContext);

        expect(result.success).toBe(false);
        // New implementation returns error message instead of existingFile for fulltext conflicts
        expect(result.error).toContain("fulltext PDF already exists");
      });

      it("should attach from stdin content with explicit type", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(mockItem);
        const mockAttachResult: AttachResult = {
          filename: "Smith-2024-uuid.pdf",
          overwritten: false,
        };
        mockAttachFile.mockResolvedValue(mockAttachResult);
        mockUpdateReference.mockResolvedValue({ updated: true, item: mockItem });

        const options: FulltextAttachOptions = {
          identifier: "Smith-2024",
          stdinContent: Buffer.from("PDF content"),
          type: "pdf",
          fulltextDirectory,
        };

        const result = await executeFulltextAttach(options, localContext);

        expect(result.success).toBe(true);
        expect(result.type).toBe("pdf");
      });

      it("should return error when stdin provided without type", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(mockItem);

        const options: FulltextAttachOptions = {
          identifier: "Smith-2024",
          stdinContent: Buffer.from("content"),
          fulltextDirectory,
        };

        const result = await executeFulltextAttach(options, localContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain("stdin");
      });

      it("should return error when no file path or stdin provided", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(mockItem);

        const options: FulltextAttachOptions = {
          identifier: "Smith-2024",
          type: "pdf",
          fulltextDirectory,
        };

        const result = await executeFulltextAttach(options, localContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain("No file path");
      });
    });

    describe("via server context", () => {
      it("should find reference via server client", async () => {
        vi.mocked(mockServerClient.find).mockResolvedValue(mockItem);
        mockAttachFile.mockResolvedValue({
          filename: "test.pdf",
          overwritten: false,
        });
        vi.mocked(mockServerClient.update).mockResolvedValue({ updated: true, item: mockItem });

        const options: FulltextAttachOptions = {
          identifier: "Smith-2024",
          filePath: "/path/to/paper.pdf",
          fulltextDirectory,
        };

        const result = await executeFulltextAttach(options, serverContext);

        expect(mockServerClient.find).toHaveBeenCalledWith("Smith-2024", { idType: "id" });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("executeFulltextGet", () => {
    const itemWithFulltext: CslItem = {
      ...mockItem,
      custom: {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [
            { filename: "fulltext.pdf", role: "fulltext", format: "pdf" },
            { filename: "fulltext.md", role: "fulltext", format: "markdown" },
          ],
        },
      },
    };

    describe("via local context", () => {
      it("should return both paths when no type specified", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(itemWithFulltext);

        const options: FulltextGetOptions = {
          identifier: "Smith-2024",
          fulltextDirectory,
        };

        const result = await executeFulltextGet(options, localContext);

        expect(result.success).toBe(true);
        // New attachments format uses {fulltextDirectory}/{directory}/{filename}
        expect(result.paths?.pdf).toBe(`${fulltextDirectory}/Smith-2024-123e4567/fulltext.pdf`);
        expect(result.paths?.markdown).toBe(`${fulltextDirectory}/Smith-2024-123e4567/fulltext.md`);
      });

      it("should return only PDF path when pdf type specified", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(itemWithFulltext);

        const options: FulltextGetOptions = {
          identifier: "Smith-2024",
          type: "pdf",
          fulltextDirectory,
        };

        const result = await executeFulltextGet(options, localContext);

        expect(result.success).toBe(true);
        expect(result.paths?.pdf).toBe(`${fulltextDirectory}/Smith-2024-123e4567/fulltext.pdf`);
        expect(result.paths?.markdown).toBeUndefined();
      });

      it("should return error when reference not found", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(undefined);

        const options: FulltextGetOptions = {
          identifier: "NonExistent",
          fulltextDirectory,
        };

        const result = await executeFulltextGet(options, localContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain("not found");
      });

      it("should return error when no fulltext attached", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(mockItem);
        mockGetAttachedTypes.mockReturnValue([]);
        mockGetFilePath.mockReturnValue(null);

        const options: FulltextGetOptions = {
          identifier: "Smith-2024",
          fulltextDirectory,
        };

        const result = await executeFulltextGet(options, localContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain("No fulltext");
      });

      it("should return file content with stdout option", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(itemWithFulltext);
        // Mock readFile for the actual file path that will be used
        mockReadFile.mockResolvedValue(Buffer.from("# Test Content"));

        const options: FulltextGetOptions = {
          identifier: "Smith-2024",
          type: "markdown",
          stdout: true,
          fulltextDirectory,
        };

        const result = await executeFulltextGet(options, localContext);

        expect(result.success).toBe(true);
        expect(result.content).toBeDefined();
      });
    });
  });

  describe("executeFulltextDetach", () => {
    const itemWithFulltext: CslItem = {
      ...mockItem,
      custom: {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [{ filename: "fulltext.pdf", role: "fulltext", format: "pdf" }],
        },
      },
    };

    describe("via local context", () => {
      it("should detach PDF file", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(itemWithFulltext);
        const mockDetachResult: DetachResult = {
          filename: "Smith-2024-uuid.pdf",
          deleted: false,
        };
        mockDetachFile.mockResolvedValue(mockDetachResult);
        mockGetAttachedTypes.mockReturnValue(["pdf"]);
        mockUpdateReference.mockResolvedValue({ updated: true, item: mockItem });

        const options: FulltextDetachOptions = {
          identifier: "Smith-2024",
          type: "pdf",
          fulltextDirectory,
        };

        const result = await executeFulltextDetach(options, localContext);

        expect(result.success).toBe(true);
        expect(result.detached).toContain("pdf");
      });

      it("should detach and delete file with removeFiles option", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(itemWithFulltext);
        const mockDetachResult: DetachResult = {
          filename: "Smith-2024-uuid.pdf",
          deleted: true,
        };
        mockDetachFile.mockResolvedValue(mockDetachResult);
        mockGetAttachedTypes.mockReturnValue(["pdf"]);
        mockUpdateReference.mockResolvedValue({ updated: true, item: mockItem });

        const options: FulltextDetachOptions = {
          identifier: "Smith-2024",
          type: "pdf",
          removeFiles: true,
          fulltextDirectory,
        };

        const result = await executeFulltextDetach(options, localContext);

        expect(result.success).toBe(true);
        expect(result.deleted).toContain("pdf");
      });

      it("should return error when reference not found", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(undefined);

        const options: FulltextDetachOptions = {
          identifier: "NonExistent",
          fulltextDirectory,
        };

        const result = await executeFulltextDetach(options, localContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain("not found");
      });
    });
  });

  describe("formatFulltextAttachOutput", () => {
    it("should format successful attach", () => {
      const result: FulltextAttachResult = {
        success: true,
        filename: "Smith-2024-uuid.pdf",
        type: "pdf",
      };

      const output = formatFulltextAttachOutput(result);

      expect(output).toContain("Attached");
      expect(output).toContain("Smith-2024-uuid.pdf");
    });

    it("should format attach with overwrite", () => {
      const result: FulltextAttachResult = {
        success: true,
        filename: "Smith-2024-uuid.pdf",
        type: "pdf",
        overwritten: true,
      };

      const output = formatFulltextAttachOutput(result);

      expect(output).toContain("overwritten");
    });

    it("should format confirmation required message", () => {
      const result: FulltextAttachResult = {
        success: false,
        existingFile: "existing.pdf",
        requiresConfirmation: true,
      };

      const output = formatFulltextAttachOutput(result);

      expect(output).toContain("already attached");
      expect(output).toContain("--force");
    });

    it("should format error message", () => {
      const result: FulltextAttachResult = {
        success: false,
        error: "File not found",
      };

      const output = formatFulltextAttachOutput(result);

      expect(output).toContain("Error");
      expect(output).toContain("File not found");
    });
  });

  describe("formatFulltextGetOutput", () => {
    it("should format single path output", () => {
      const result: FulltextGetResult = {
        success: true,
        paths: {
          pdf: "/path/to/file.pdf",
        },
      };

      const output = formatFulltextGetOutput(result);

      expect(output).toContain("pdf:");
      expect(output).toContain("/path/to/file.pdf");
    });

    it("should format multiple paths output", () => {
      const result: FulltextGetResult = {
        success: true,
        paths: {
          pdf: "/path/to/file.pdf",
          markdown: "/path/to/file.md",
        },
      };

      const output = formatFulltextGetOutput(result);

      expect(output).toContain("pdf:");
      expect(output).toContain("markdown:");
    });

    it("should format error message", () => {
      const result: FulltextGetResult = {
        success: false,
        error: "Reference not found",
      };

      const output = formatFulltextGetOutput(result);

      expect(output).toContain("Error");
    });
  });

  describe("formatFulltextDetachOutput", () => {
    it("should format successful detach", () => {
      const result: FulltextDetachResult = {
        success: true,
        detached: ["pdf"],
      };

      const output = formatFulltextDetachOutput(result);

      expect(output).toContain("Detached");
      expect(output).toContain("pdf");
    });

    it("should format detach with delete", () => {
      const result: FulltextDetachResult = {
        success: true,
        detached: ["pdf"],
        deleted: ["pdf"],
      };

      const output = formatFulltextDetachOutput(result);

      expect(output).toContain("deleted");
    });
  });

  describe("executeFulltextOpen", () => {
    const itemWithFulltext: CslItem = {
      ...mockItem,
      custom: {
        uuid: "123e4567-e89b-12d3-a456-426614174000",
        created_at: "2024-01-01T00:00:00.000Z",
        timestamp: "2024-01-01T00:00:00.000Z",
        attachments: {
          directory: "Smith-2024-123e4567",
          files: [
            { filename: "fulltext.pdf", role: "fulltext", format: "pdf" },
            { filename: "fulltext.md", role: "fulltext", format: "markdown" },
          ],
        },
      },
    };

    describe("via local context", () => {
      it("should open PDF by default when both exist", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(itemWithFulltext);
        mockExistsSync.mockReturnValue(true);
        mockOpenWithSystemApp.mockResolvedValue(undefined);

        const options: FulltextOpenOptions = {
          identifier: "Smith-2024",
          fulltextDirectory,
        };

        const result = await executeFulltextOpen(options, localContext);

        expect(result.success).toBe(true);
        expect(result.openedType).toBe("pdf");
        expect(mockOpenWithSystemApp).toHaveBeenCalled();
      });

      it("should open Markdown when specified", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(itemWithFulltext);
        mockExistsSync.mockReturnValue(true);
        mockOpenWithSystemApp.mockResolvedValue(undefined);

        const options: FulltextOpenOptions = {
          identifier: "Smith-2024",
          type: "markdown",
          fulltextDirectory,
        };

        const result = await executeFulltextOpen(options, localContext);

        expect(result.success).toBe(true);
        expect(result.openedType).toBe("markdown");
      });

      it("should return error when reference not found", async () => {
        vi.mocked(mockLibrary.find).mockResolvedValue(undefined);

        const options: FulltextOpenOptions = {
          identifier: "NonExistent",
          fulltextDirectory,
        };

        const result = await executeFulltextOpen(options, localContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain("not found");
      });
    });
  });

  describe("formatFulltextOpenOutput", () => {
    it("should format successful open", () => {
      const result: FulltextOpenResult = {
        success: true,
        openedType: "pdf",
        openedPath: "/path/to/file.pdf",
      };

      const output = formatFulltextOpenOutput(result);

      expect(output).toContain("Opened");
      expect(output).toContain("pdf");
      expect(output).toContain("/path/to/file.pdf");
    });

    it("should format error message", () => {
      const result: FulltextOpenResult = {
        success: false,
        error: "Reference not found",
      };

      const output = formatFulltextOpenOutput(result);

      expect(output).toContain("Error");
      expect(output).toContain("Reference not found");
    });
  });

  describe("getFulltextExitCode", () => {
    it("should return 0 for successful result", () => {
      const result: FulltextAttachResult = { success: true, filename: "test.pdf", type: "pdf" };
      expect(getFulltextExitCode(result)).toBe(0);
    });

    it("should return 1 for failed result", () => {
      const result: FulltextAttachResult = { success: false, error: "Error" };
      expect(getFulltextExitCode(result)).toBe(1);
    });

    it("should return 1 for confirmation required", () => {
      const result: FulltextAttachResult = {
        success: false,
        existingFile: "test.pdf",
        requiresConfirmation: true,
      };
      expect(getFulltextExitCode(result)).toBe(1);
    });
  });

  describe("interactive fulltext commands", () => {
    // Note: Interactive fulltext functionality is tested via E2E tests
    // because it requires mocking multiple interactive modules
    // See src/cli/interactive-id-selection.e2e.test.ts
    it.todo("attach should be tested via E2E tests");
    it.todo("get should be tested via E2E tests");
    it.todo("detach should be tested via E2E tests");
    it.todo("open should be tested via E2E tests");
  });
});
