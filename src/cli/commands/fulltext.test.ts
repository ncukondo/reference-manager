import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";
import type { AttachResult, DetachResult } from "../../features/fulltext/index.js";
import type { LocalExecutionContext, ServerExecutionContext } from "../execution-context.js";
import type { ServerClient } from "../server-client.js";
import {
  type FulltextAttachOptions,
  type FulltextAttachResult,
  type FulltextDetachOptions,
  type FulltextDetachResult,
  type FulltextGetOptions,
  type FulltextGetResult,
  executeFulltextAttach,
  executeFulltextDetach,
  executeFulltextGet,
  formatFulltextAttachOutput,
  formatFulltextDetachOutput,
  formatFulltextGetOutput,
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
vi.mock("node:fs/promises", () => ({
  readFile: (...args: unknown[]) => mockReadFile(...args),
  rm: (...args: unknown[]) => mockRm(...args),
}));

describe("fulltext command", () => {
  // Mock reference object
  const mockReference = {
    getItem: vi.fn(),
  };

  const mockLibrary = {
    findById: vi.fn(),
    findByUuid: vi.fn(),
  } as unknown as Library;

  const mockServerClient = {
    findById: vi.fn(),
    findByUuid: vi.fn(),
    update: vi.fn(),
  } as unknown as ServerClient;

  const serverContext: ServerExecutionContext = {
    type: "server",
    client: mockServerClient,
  };

  const localContext: LocalExecutionContext = {
    type: "local",
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
  });

  describe("executeFulltextAttach", () => {
    describe("via local context", () => {
      it("should attach a PDF file by extension detection", async () => {
        vi.mocked(mockLibrary.findById).mockReturnValue(mockReference as never);
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
        expect(result.filename).toBe("Smith-2024-123e4567-e89b-12d3-a456-426614174000.pdf");
        expect(result.type).toBe("pdf");
      });

      it("should attach a Markdown file by extension detection", async () => {
        vi.mocked(mockLibrary.findById).mockReturnValue(mockReference as never);
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
        vi.mocked(mockLibrary.findById).mockReturnValue(mockReference as never);
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
        vi.mocked(mockLibrary.findById).mockReturnValue(undefined as never);

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
        vi.mocked(mockLibrary.findById).mockReturnValue(mockReference as never);

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
        vi.mocked(mockLibrary.findById).mockReturnValue(mockReference as never);
        mockAttachFile.mockResolvedValue({
          filename: "test.pdf",
          overwritten: false,
        });
        mockUpdateReference.mockResolvedValue({ updated: true, item: mockItem });

        const options: FulltextAttachOptions = {
          identifier: "Smith-2024",
          filePath: "/path/to/paper.pdf",
          move: true,
          fulltextDirectory,
        };

        await executeFulltextAttach(options, localContext);

        expect(mockAttachFile).toHaveBeenCalledWith(
          expect.any(Object),
          "/path/to/paper.pdf",
          "pdf",
          expect.objectContaining({ move: true })
        );
      });

      it("should return existing file info when not forced", async () => {
        vi.mocked(mockLibrary.findById).mockReturnValue(mockReference as never);
        const mockAttachResult: AttachResult = {
          filename: "new-file.pdf",
          existingFile: "existing-file.pdf",
          overwritten: false,
        };
        mockAttachFile.mockResolvedValue(mockAttachResult);

        const options: FulltextAttachOptions = {
          identifier: "Smith-2024",
          filePath: "/path/to/paper.pdf",
          fulltextDirectory,
        };

        const result = await executeFulltextAttach(options, localContext);

        expect(result.success).toBe(false);
        expect(result.existingFile).toBe("existing-file.pdf");
        expect(result.requiresConfirmation).toBe(true);
      });

      it("should attach from stdin content with explicit type", async () => {
        vi.mocked(mockLibrary.findById).mockReturnValue(mockReference as never);
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
        vi.mocked(mockLibrary.findById).mockReturnValue(mockReference as never);

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
        vi.mocked(mockLibrary.findById).mockReturnValue(mockReference as never);

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
        vi.mocked(mockServerClient.findById).mockResolvedValue(mockItem);
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

        expect(mockServerClient.findById).toHaveBeenCalledWith("Smith-2024");
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
        fulltext: {
          pdf: "Smith-2024-uuid.pdf",
          markdown: "Smith-2024-uuid.md",
        },
      },
    };

    describe("via local context", () => {
      it("should return both paths when no type specified", async () => {
        const refWithFulltext = { getItem: () => itemWithFulltext };
        vi.mocked(mockLibrary.findById).mockReturnValue(refWithFulltext as never);
        mockGetAttachedTypes.mockReturnValue(["pdf", "markdown"]);
        mockGetFilePath
          .mockReturnValueOnce("/path/to/fulltext/Smith-2024-uuid.pdf")
          .mockReturnValueOnce("/path/to/fulltext/Smith-2024-uuid.md");

        const options: FulltextGetOptions = {
          identifier: "Smith-2024",
          fulltextDirectory,
        };

        const result = await executeFulltextGet(options, localContext);

        expect(result.success).toBe(true);
        expect(result.paths?.pdf).toBe("/path/to/fulltext/Smith-2024-uuid.pdf");
        expect(result.paths?.markdown).toBe("/path/to/fulltext/Smith-2024-uuid.md");
      });

      it("should return only PDF path when pdf type specified", async () => {
        const refWithFulltext = { getItem: () => itemWithFulltext };
        vi.mocked(mockLibrary.findById).mockReturnValue(refWithFulltext as never);
        mockGetFilePath.mockReturnValue("/path/to/fulltext/Smith-2024-uuid.pdf");

        const options: FulltextGetOptions = {
          identifier: "Smith-2024",
          type: "pdf",
          fulltextDirectory,
        };

        const result = await executeFulltextGet(options, localContext);

        expect(result.success).toBe(true);
        expect(result.paths?.pdf).toBe("/path/to/fulltext/Smith-2024-uuid.pdf");
        expect(result.paths?.markdown).toBeUndefined();
      });

      it("should return error when reference not found", async () => {
        vi.mocked(mockLibrary.findById).mockReturnValue(undefined as never);

        const options: FulltextGetOptions = {
          identifier: "NonExistent",
          fulltextDirectory,
        };

        const result = await executeFulltextGet(options, localContext);

        expect(result.success).toBe(false);
        expect(result.error).toContain("not found");
      });

      it("should return error when no fulltext attached", async () => {
        vi.mocked(mockLibrary.findById).mockReturnValue(mockReference as never);
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
        const refWithFulltext = { getItem: () => itemWithFulltext };
        vi.mocked(mockLibrary.findById).mockReturnValue(refWithFulltext as never);
        mockGetFilePath.mockReturnValue("/path/to/fulltext/Smith-2024-uuid.md");
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
        fulltext: {
          pdf: "Smith-2024-uuid.pdf",
        },
      },
    };

    describe("via local context", () => {
      it("should detach PDF file", async () => {
        const refWithFulltext = { getItem: () => itemWithFulltext };
        vi.mocked(mockLibrary.findById).mockReturnValue(refWithFulltext as never);
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

      it("should detach and delete file with delete option", async () => {
        const refWithFulltext = { getItem: () => itemWithFulltext };
        vi.mocked(mockLibrary.findById).mockReturnValue(refWithFulltext as never);
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
          delete: true,
          fulltextDirectory,
        };

        const result = await executeFulltextDetach(options, localContext);

        expect(result.success).toBe(true);
        expect(result.deleted).toContain("pdf");
      });

      it("should return error when reference not found", async () => {
        vi.mocked(mockLibrary.findById).mockReturnValue(undefined as never);

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
});
