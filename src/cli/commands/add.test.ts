import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AddReferencesResult } from "../../features/operations/add.js";
import type { ExecutionContext } from "../execution-context.js";
import {
  type AddCommandOptions,
  type AddCommandResult,
  executeAdd,
  formatAddOutput,
  getExitCode,
} from "./add.js";

describe("add command", () => {
  describe("executeAdd", () => {
    const mockImport = vi.fn();

    const createContext = (): ExecutionContext =>
      ({
        mode: "local",
        type: "local",
        library: {
          import: mockImport,
        },
      }) as unknown as ExecutionContext;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should call context.library.import with inputs and force option", async () => {
      const mockResult: AddReferencesResult = {
        added: [{ id: "Smith-2024", title: "Test Paper" }],
        failed: [],
        skipped: [],
      };
      mockImport.mockResolvedValue(mockResult);

      const options: AddCommandOptions = {
        inputs: ["10.1234/test"],
        force: false,
      };
      const context = createContext();

      const result = await executeAdd(options, context);

      expect(mockImport).toHaveBeenCalledWith(["10.1234/test"], {
        force: false,
      });
      expect(result).toEqual(mockResult);
    });

    it("should pass format option", async () => {
      const mockResult: AddReferencesResult = {
        added: [],
        failed: [],
        skipped: [],
      };
      mockImport.mockResolvedValue(mockResult);

      const options: AddCommandOptions = {
        inputs: ["test.bib"],
        force: true,
        format: "bibtex",
      };
      const context = createContext();

      await executeAdd(options, context);

      expect(mockImport).toHaveBeenCalledWith(["test.bib"], {
        force: true,
        format: "bibtex",
      });
    });

    it("should pass isbn format option", async () => {
      const mockResult: AddReferencesResult = {
        added: [],
        failed: [],
        skipped: [],
      };
      mockImport.mockResolvedValue(mockResult);

      const options: AddCommandOptions = {
        inputs: ["ISBN:9784000000000"],
        force: true,
        format: "isbn",
      };
      const context = createContext();

      await executeAdd(options, context);

      expect(mockImport).toHaveBeenCalledWith(["ISBN:9784000000000"], {
        force: true,
        format: "isbn",
      });
    });

    it("should pass pubmedConfig option", async () => {
      const mockResult: AddReferencesResult = {
        added: [],
        failed: [],
        skipped: [],
      };
      mockImport.mockResolvedValue(mockResult);

      const options: AddCommandOptions = {
        inputs: ["12345678"],
        force: true,
        format: "pmid",
        pubmedConfig: { email: "test@example.com" },
      };
      const context = createContext();

      await executeAdd(options, context);

      expect(mockImport).toHaveBeenCalledWith(["12345678"], {
        force: true,
        format: "pmid",
        pubmedConfig: { email: "test@example.com" },
      });
    });

    it("should pass stdinContent option", async () => {
      const mockResult: AddReferencesResult = {
        added: [],
        failed: [],
        skipped: [],
      };
      mockImport.mockResolvedValue(mockResult);

      const options: AddCommandOptions = {
        inputs: ["-"],
        force: false,
        stdinContent: "@article{test, title={Test}}",
      };
      const context = createContext();

      await executeAdd(options, context);

      expect(mockImport).toHaveBeenCalledWith(["-"], {
        force: false,
        stdinContent: "@article{test, title={Test}}",
      });
    });
  });

  describe("formatAddOutput", () => {
    it("should format successful additions", () => {
      const result: AddCommandResult = {
        added: [
          { id: "Smith-2024", title: "Machine Learning Applications" },
          { id: "Jones-2023", title: "Data Science Methods" },
        ],
        failed: [],
        skipped: [],
      };

      const output = formatAddOutput(result, false);

      expect(output).toContain("Added 2 reference(s):");
      expect(output).toContain("Smith-2024");
      expect(output).toContain("Machine Learning Applications");
      expect(output).toContain("Jones-2023");
      expect(output).toContain("Data Science Methods");
    });

    it("should format with ID change indication", () => {
      const result: AddCommandResult = {
        added: [
          { id: "Smith-2024a", title: "New Paper", idChanged: true, originalId: "Smith-2024" },
        ],
        failed: [],
        skipped: [],
      };

      const output = formatAddOutput(result, false);

      expect(output).toContain("Smith-2024a");
      expect(output).toContain("(was: Smith-2024)");
    });

    it("should format failed items", () => {
      const result: AddCommandResult = {
        added: [],
        failed: [{ source: "99999999", error: "Not found" }],
        skipped: [],
      };

      const output = formatAddOutput(result, false);

      expect(output).toContain("Failed to add 1 item(s):");
      expect(output).toContain("99999999");
      expect(output).toContain("Not found");
    });

    it("should format skipped duplicates", () => {
      const result: AddCommandResult = {
        added: [],
        failed: [],
        skipped: [{ source: "10.1234/test", existingId: "Smith-2024" }],
      };

      const output = formatAddOutput(result, false);

      expect(output).toContain("Skipped 1 duplicate(s):");
      expect(output).toContain("10.1234/test");
      expect(output).toContain("Smith-2024");
    });

    it("should format mixed results", () => {
      const result: AddCommandResult = {
        added: [{ id: "Smith-2024", title: "Paper 1" }],
        failed: [{ source: "invalid", error: "Parse error" }],
        skipped: [{ source: "10.1234/dup", existingId: "Jones-2023" }],
      };

      const output = formatAddOutput(result, false);

      expect(output).toContain("Added 1 reference(s):");
      expect(output).toContain("Failed to add 1 item(s):");
      expect(output).toContain("Skipped 1 duplicate(s):");
    });

    it("should show verbose output when requested", () => {
      const result: AddCommandResult = {
        added: [],
        failed: [
          { source: "99999999", error: "HTTP 404 - Not found\nAPI: https://api.example.com" },
        ],
        skipped: [],
      };

      const output = formatAddOutput(result, true);

      expect(output).toContain("HTTP 404 - Not found");
      expect(output).toContain("API: https://api.example.com");
    });

    it("should truncate long errors in non-verbose mode", () => {
      const longError = "A".repeat(200);
      const result: AddCommandResult = {
        added: [],
        failed: [{ source: "test", error: longError }],
        skipped: [],
      };

      const output = formatAddOutput(result, false);

      expect(output.length).toBeLessThan(longError.length);
      expect(output).toContain("...");
    });

    it("should format empty result", () => {
      const result: AddCommandResult = {
        added: [],
        failed: [],
        skipped: [],
      };

      const output = formatAddOutput(result, false);

      expect(output).toContain("Added 0 reference(s).");
    });
  });

  describe("getExitCode", () => {
    it("should return 0 when at least one reference added", () => {
      const result: AddCommandResult = {
        added: [{ id: "Smith-2024", title: "Test" }],
        failed: [],
        skipped: [],
      };

      expect(getExitCode(result)).toBe(0);
    });

    it("should return 0 for partial success (some added, some failed)", () => {
      const result: AddCommandResult = {
        added: [{ id: "Smith-2024", title: "Test" }],
        failed: [{ source: "invalid", error: "Error" }],
        skipped: [],
      };

      expect(getExitCode(result)).toBe(0);
    });

    it("should return 0 when all skipped (no failures)", () => {
      const result: AddCommandResult = {
        added: [],
        failed: [],
        skipped: [{ source: "dup", existingId: "existing" }],
      };

      expect(getExitCode(result)).toBe(0);
    });

    it("should return 1 when complete failure (nothing added, has failures)", () => {
      const result: AddCommandResult = {
        added: [],
        failed: [{ source: "invalid", error: "Error" }],
        skipped: [],
      };

      expect(getExitCode(result)).toBe(1);
    });

    it("should return 0 when empty input (nothing to add)", () => {
      const result: AddCommandResult = {
        added: [],
        failed: [],
        skipped: [],
      };

      expect(getExitCode(result)).toBe(0);
    });
  });
});
