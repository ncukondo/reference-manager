import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CiteResult } from "../../features/operations/cite.js";
import type { ExecutionContext } from "../execution-context.js";
import {
  type CiteCommandOptions,
  type CiteCommandResult,
  executeCite,
  formatCiteErrors,
  formatCiteOutput,
  getCiteExitCode,
} from "./cite.js";

// Mock fs for CSL file validation
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
}));

describe("cite command", () => {
  describe("executeCite", () => {
    const mockCite = vi.fn();

    const createContext = (): ExecutionContext =>
      ({
        mode: "local",
        type: "local",
        library: {
          cite: mockCite,
        },
      }) as unknown as ExecutionContext;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should call context.library.cite with identifiers", async () => {
      const mockResult: CiteResult = {
        results: [{ identifier: "Smith-2023", success: true, citation: "Smith (2023)" }],
      };
      mockCite.mockResolvedValue(mockResult);

      const options: CiteCommandOptions = { identifiers: ["Smith-2023"] };
      const context = createContext();

      const result = await executeCite(options, context);

      expect(mockCite).toHaveBeenCalledWith({
        identifiers: ["Smith-2023"],
      });
      expect(result).toEqual(mockResult);
    });

    it("should pass all options to context.library.cite", async () => {
      const mockResult: CiteResult = {
        results: [{ identifier: "abc-123", success: true, citation: "Smith (2023)" }],
      };
      mockCite.mockResolvedValue(mockResult);

      const options: CiteCommandOptions = {
        identifiers: ["abc-123"],
        uuid: true,
        style: "vancouver",
        locale: "ja-JP",
        output: "html",
        inText: true,
      };
      const context = createContext();

      await executeCite(options, context);

      expect(mockCite).toHaveBeenCalledWith({
        identifiers: ["abc-123"],
        idType: "uuid",
        style: "vancouver",
        locale: "ja-JP",
        format: "html",
        inText: true,
      });
    });

    it("should support rtf format", async () => {
      const mockResult: CiteResult = {
        results: [{ identifier: "Smith-2023", success: true, citation: "{\\rtf1 Smith (2023)}" }],
      };
      mockCite.mockResolvedValue(mockResult);

      const options: CiteCommandOptions = {
        identifiers: ["Smith-2023"],
        output: "rtf",
      };
      const context = createContext();

      await executeCite(options, context);

      expect(mockCite).toHaveBeenCalledWith({
        identifiers: ["Smith-2023"],
        format: "rtf",
      });
    });

    describe("option validation", () => {
      it("should throw error for invalid output format", async () => {
        const options: CiteCommandOptions = {
          identifiers: ["Smith-2023"],
          // @ts-expect-error - testing invalid output format
          output: "invalid",
        };
        const context = createContext();

        await expect(executeCite(options, context)).rejects.toThrow(
          "Invalid output format 'invalid'"
        );
      });

      it("should throw error when CSL file does not exist", async () => {
        const fs = await import("node:fs");
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const options: CiteCommandOptions = {
          identifiers: ["Smith-2023"],
          cslFile: "/nonexistent/style.csl",
        };
        const context = createContext();

        await expect(executeCite(options, context)).rejects.toThrow(
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

  describe("executeInteractiveCite", () => {
    // Note: Interactive cite functionality is tested via E2E tests
    // because it requires mocking multiple interactive modules
    // See src/cli/interactive-id-selection.e2e.test.ts
    it.todo("should be tested via E2E tests");
  });
});
