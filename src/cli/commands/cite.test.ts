import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Library } from "../../core/library.js";
import type { CiteResult } from "../../features/operations/cite.js";
import type { LocalExecutionContext, ServerExecutionContext } from "../execution-context.js";
import type { ServerClient } from "../server-client.js";
import {
  type CiteCommandOptions,
  type CiteCommandResult,
  executeCite,
  formatCiteErrors,
  formatCiteOutput,
  getCiteExitCode,
} from "./cite.js";

// Mock dependencies
vi.mock("../../features/operations/cite.js", () => ({
  citeReferences: vi.fn(),
}));

// Mock fs for CSL file validation
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

describe("cite command", () => {
  describe("executeCite", () => {
    const mockLibrary = {} as Library;
    const mockServerClient = {
      cite: vi.fn(),
    } as unknown as ServerClient;

    const serverContext: ServerExecutionContext = {
      type: "server",
      client: mockServerClient,
    };

    const localContext: LocalExecutionContext = {
      type: "local",
      library: mockLibrary,
    };

    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe("via server", () => {
      it("should call server cite when context is server", async () => {
        const mockResult: CiteResult = {
          results: [{ identifier: "Smith-2023", success: true, citation: "Smith (2023)" }],
        };
        vi.mocked(mockServerClient.cite).mockResolvedValue(mockResult);

        const options: CiteCommandOptions = { identifiers: ["Smith-2023"] };

        const result = await executeCite(options, serverContext);

        expect(mockServerClient.cite).toHaveBeenCalledWith({
          identifiers: ["Smith-2023"],
        });
        expect(result).toEqual(mockResult);
      });

      it("should pass all options to server", async () => {
        const mockResult: CiteResult = {
          results: [{ identifier: "Smith-2023", success: true, citation: "Smith (2023)" }],
        };
        vi.mocked(mockServerClient.cite).mockResolvedValue(mockResult);

        const options: CiteCommandOptions = {
          identifiers: ["abc-123"],
          uuid: true,
          style: "vancouver",
          locale: "ja-JP",
          format: "html",
          inText: true,
        };

        await executeCite(options, serverContext);

        expect(mockServerClient.cite).toHaveBeenCalledWith({
          identifiers: ["abc-123"],
          byUuid: true,
          style: "vancouver",
          locale: "ja-JP",
          format: "html",
          inText: true,
        });
      });
    });

    describe("via library", () => {
      it("should call citeReferences when context is local", async () => {
        const { citeReferences } = await import("../../features/operations/cite.js");
        const mockResult: CiteResult = {
          results: [{ identifier: "Smith-2023", success: true, citation: "Smith (2023)" }],
        };
        vi.mocked(citeReferences).mockResolvedValue(mockResult);

        const options: CiteCommandOptions = { identifiers: ["Smith-2023"] };

        const result = await executeCite(options, localContext);

        expect(citeReferences).toHaveBeenCalledWith(mockLibrary, {
          identifiers: ["Smith-2023"],
        });
        expect(result).toEqual(mockResult);
      });

      it("should pass all options to citeReferences", async () => {
        const { citeReferences } = await import("../../features/operations/cite.js");
        const mockResult: CiteResult = {
          results: [{ identifier: "abc-123", success: true, citation: "Smith (2023)" }],
        };
        vi.mocked(citeReferences).mockResolvedValue(mockResult);

        const options: CiteCommandOptions = {
          identifiers: ["abc-123"],
          uuid: true,
          style: "vancouver",
          locale: "ja-JP",
          format: "html",
          inText: true,
        };

        await executeCite(options, localContext);

        expect(citeReferences).toHaveBeenCalledWith(mockLibrary, {
          identifiers: ["abc-123"],
          byUuid: true,
          style: "vancouver",
          locale: "ja-JP",
          format: "html",
          inText: true,
        });
      });
    });

    describe("option validation", () => {
      it("should throw error for invalid format", async () => {
        const options: CiteCommandOptions = {
          identifiers: ["Smith-2023"],
          // @ts-expect-error - testing invalid format
          format: "invalid",
        };

        await expect(executeCite(options, localContext)).rejects.toThrow(
          "Invalid format 'invalid'"
        );
      });

      it("should throw error when CSL file does not exist", async () => {
        const fs = await import("node:fs");
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const options: CiteCommandOptions = {
          identifiers: ["Smith-2023"],
          cslFile: "/nonexistent/style.csl",
        };

        await expect(executeCite(options, localContext)).rejects.toThrow(
          "CSL file '/nonexistent/style.csl' not found"
        );
      });
    });
  });

  describe("formatCiteOutput", () => {
    it("should join successful citations with newlines", () => {
      const result: CiteCommandResult = {
        results: [
          { identifier: "ref1", success: true, citation: "Smith (2023)" },
          { identifier: "ref2", success: true, citation: "Jones (2024)" },
        ],
      };

      const output = formatCiteOutput(result);

      expect(output).toBe("Smith (2023)\nJones (2024)");
    });

    it("should skip failed citations", () => {
      const result: CiteCommandResult = {
        results: [
          { identifier: "ref1", success: true, citation: "Smith (2023)" },
          { identifier: "ref2", success: false, error: "Not found" },
        ],
      };

      const output = formatCiteOutput(result);

      expect(output).toBe("Smith (2023)");
    });

    it("should return empty string when all citations failed", () => {
      const result: CiteCommandResult = {
        results: [{ identifier: "ref1", success: false, error: "Not found" }],
      };

      const output = formatCiteOutput(result);

      expect(output).toBe("");
    });
  });

  describe("formatCiteErrors", () => {
    it("should format failed citations as error messages", () => {
      const result: CiteCommandResult = {
        results: [
          { identifier: "ref1", success: false, error: "Not found" },
          { identifier: "ref2", success: false, error: "Invalid ID" },
        ],
      };

      const output = formatCiteErrors(result);

      expect(output).toContain("Error for 'ref1': Not found");
      expect(output).toContain("Error for 'ref2': Invalid ID");
    });

    it("should skip successful citations", () => {
      const result: CiteCommandResult = {
        results: [
          { identifier: "ref1", success: true, citation: "Smith (2023)" },
          { identifier: "ref2", success: false, error: "Not found" },
        ],
      };

      const output = formatCiteErrors(result);

      expect(output).not.toContain("ref1");
      expect(output).toContain("Error for 'ref2': Not found");
    });

    it("should return empty string when no errors", () => {
      const result: CiteCommandResult = {
        results: [{ identifier: "ref1", success: true, citation: "Smith (2023)" }],
      };

      const output = formatCiteErrors(result);

      expect(output).toBe("");
    });
  });

  describe("getCiteExitCode", () => {
    it("should return 0 when at least one citation succeeded", () => {
      const result: CiteCommandResult = {
        results: [
          { identifier: "ref1", success: true, citation: "Smith (2023)" },
          { identifier: "ref2", success: false, error: "Not found" },
        ],
      };

      expect(getCiteExitCode(result)).toBe(0);
    });

    it("should return 0 when all citations succeeded", () => {
      const result: CiteCommandResult = {
        results: [
          { identifier: "ref1", success: true, citation: "Smith (2023)" },
          { identifier: "ref2", success: true, citation: "Jones (2024)" },
        ],
      };

      expect(getCiteExitCode(result)).toBe(0);
    });

    it("should return 1 when all citations failed", () => {
      const result: CiteCommandResult = {
        results: [
          { identifier: "ref1", success: false, error: "Not found" },
          { identifier: "ref2", success: false, error: "Invalid ID" },
        ],
      };

      expect(getCiteExitCode(result)).toBe(1);
    });

    it("should return 0 when empty results", () => {
      const result: CiteCommandResult = {
        results: [],
      };

      expect(getCiteExitCode(result)).toBe(0);
    });
  });
});
