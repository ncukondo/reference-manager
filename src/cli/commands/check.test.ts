import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckOperationResult } from "../../features/operations/check.js";
import type { ExecutionContext } from "../execution-context.js";
import {
  type CheckCommandOptions,
  executeCheck,
  formatCheckJsonOutput,
  formatCheckTextOutput,
  handleCheckAction,
} from "./check.js";

describe("check command", () => {
  describe("executeCheck", () => {
    const mockCheck = vi.fn();

    const createContext = (): ExecutionContext =>
      ({
        mode: "local",
        type: "local",
        library: {
          check: mockCheck,
        },
      }) as unknown as ExecutionContext;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should call context.library.check with identifiers", async () => {
      const mockResult: CheckOperationResult = {
        results: [
          {
            id: "smith-2024",
            uuid: "uuid-1",
            status: "ok",
            findings: [],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 1, warnings: 0, skipped: 0 },
      };
      mockCheck.mockResolvedValue(mockResult);

      const options: CheckCommandOptions = { identifiers: ["smith-2024"] };
      const context = createContext();
      const result = await executeCheck(options, context);

      expect(mockCheck).toHaveBeenCalledWith({
        identifiers: ["smith-2024"],
      });
      expect(result).toEqual(mockResult);
    });

    it("should pass --all option", async () => {
      const mockResult: CheckOperationResult = {
        results: [],
        summary: { total: 0, ok: 0, warnings: 0, skipped: 0 },
      };
      mockCheck.mockResolvedValue(mockResult);

      const options: CheckCommandOptions = { identifiers: [], all: true };
      const context = createContext();
      await executeCheck(options, context);

      expect(mockCheck).toHaveBeenCalledWith({ all: true });
    });

    it("should pass --search option", async () => {
      const mockResult: CheckOperationResult = {
        results: [],
        summary: { total: 0, ok: 0, warnings: 0, skipped: 0 },
      };
      mockCheck.mockResolvedValue(mockResult);

      const options: CheckCommandOptions = { identifiers: [], search: "2024" };
      const context = createContext();
      await executeCheck(options, context);

      expect(mockCheck).toHaveBeenCalledWith({ searchQuery: "2024" });
    });

    it("should pass --uuid and --days options", async () => {
      const mockResult: CheckOperationResult = {
        results: [],
        summary: { total: 0, ok: 0, warnings: 0, skipped: 0 },
      };
      mockCheck.mockResolvedValue(mockResult);

      const options: CheckCommandOptions = {
        identifiers: ["uuid-1"],
        uuid: true,
        days: 30,
      };
      const context = createContext();
      await executeCheck(options, context);

      expect(mockCheck).toHaveBeenCalledWith({
        identifiers: ["uuid-1"],
        idType: "uuid",
        skipDays: 30,
      });
    });

    it("should pass --no-save option", async () => {
      const mockResult: CheckOperationResult = {
        results: [],
        summary: { total: 0, ok: 0, warnings: 0, skipped: 0 },
      };
      mockCheck.mockResolvedValue(mockResult);

      const options: CheckCommandOptions = {
        identifiers: ["smith-2024"],
        save: false,
      };
      const context = createContext();
      await executeCheck(options, context);

      expect(mockCheck).toHaveBeenCalledWith({
        identifiers: ["smith-2024"],
        save: false,
      });
    });
  });

  describe("formatCheckTextOutput", () => {
    it("should format warning results with findings", () => {
      const result: CheckOperationResult = {
        results: [
          {
            id: "smith-2024",
            uuid: "uuid-1",
            status: "warning",
            findings: [
              {
                type: "retracted",
                message: "This article was retracted on 2024-06-01",
                details: {
                  retractionDoi: "10.1234/retraction",
                  retractionDate: "2024-06-01",
                },
              },
            ],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 0, warnings: 1, skipped: 0 },
      };

      const output = formatCheckTextOutput(result);

      expect(output).toContain("[RETRACTED] smith-2024");
      expect(output).toContain("This article was retracted on 2024-06-01");
      expect(output).toContain("https://doi.org/10.1234/retraction");
      expect(output).toContain("Summary:");
    });

    it("should format ok results", () => {
      const result: CheckOperationResult = {
        results: [
          {
            id: "clean-2024",
            uuid: "uuid-1",
            status: "ok",
            findings: [],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 1, warnings: 0, skipped: 0 },
      };

      const output = formatCheckTextOutput(result);

      expect(output).toContain("[OK] clean-2024");
    });

    it("should format version change results", () => {
      const result: CheckOperationResult = {
        results: [
          {
            id: "preprint-2024",
            uuid: "uuid-1",
            status: "warning",
            findings: [
              {
                type: "version_changed",
                message: "Published version available: 10.5678/published",
                details: { newDoi: "10.5678/published" },
              },
            ],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 0, warnings: 1, skipped: 0 },
      };

      const output = formatCheckTextOutput(result);

      expect(output).toContain("[VERSION] preprint-2024");
      expect(output).toContain("Published version available: 10.5678/published");
    });

    it("should include summary line", () => {
      const result: CheckOperationResult = {
        results: [
          {
            id: "a",
            uuid: "u1",
            status: "ok",
            findings: [],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
          {
            id: "b",
            uuid: "u2",
            status: "warning",
            findings: [{ type: "retracted", message: "Retracted" }],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 2, ok: 1, warnings: 1, skipped: 0 },
      };

      const output = formatCheckTextOutput(result);

      expect(output).toContain("Summary: 2 checked");
      expect(output).toContain("1 ok");
    });

    it("should format metadata mismatch with field diffs", () => {
      const result: CheckOperationResult = {
        results: [
          {
            id: "smith-2024",
            uuid: "uuid-1",
            status: "warning",
            findings: [
              {
                type: "metadata_mismatch",
                message: "Local metadata significantly differs from the remote record",
                details: {
                  updatedFields: ["title", "author"],
                  fieldDiffs: [
                    { field: "title", local: "Wrong Title", remote: "Correct Title" },
                    { field: "author", local: "Smith", remote: "Brown" },
                  ],
                },
              },
            ],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 0, warnings: 1, skipped: 0 },
      };

      const output = formatCheckTextOutput(result);

      expect(output).toContain("[MISMATCH] smith-2024");
      expect(output).toContain('title: "Wrong Title" → "Correct Title"');
      expect(output).toContain('author: "Smith" → "Brown"');
      expect(output).toContain("significantly differs");
      expect(output).toContain("ref update smith-2024");
    });

    it("should format metadata outdated with field diffs", () => {
      const result: CheckOperationResult = {
        results: [
          {
            id: "jones-2023",
            uuid: "uuid-2",
            status: "warning",
            findings: [
              {
                type: "metadata_outdated",
                message: "Remote metadata has been updated since import",
                details: {
                  updatedFields: ["page", "volume"],
                  fieldDiffs: [
                    { field: "page", local: null, remote: "123-145" },
                    { field: "volume", local: null, remote: "42" },
                  ],
                },
              },
            ],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 0, warnings: 1, skipped: 0 },
      };

      const output = formatCheckTextOutput(result);

      expect(output).toContain("[OUTDATED] jones-2023");
      expect(output).toContain('page: "(none)" → "123-145"');
      expect(output).toContain('volume: "(none)" → "42"');
      expect(output).toContain("updated since import");
      expect(output).toContain("ref update jones-2023");
    });

    it("should include mismatch and outdated in summary", () => {
      const result: CheckOperationResult = {
        results: [
          {
            id: "a",
            uuid: "u1",
            status: "warning",
            findings: [{ type: "metadata_mismatch", message: "Mismatch" }],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
          {
            id: "b",
            uuid: "u2",
            status: "warning",
            findings: [{ type: "metadata_outdated", message: "Outdated" }],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
          {
            id: "c",
            uuid: "u3",
            status: "ok",
            findings: [],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 3, ok: 1, warnings: 2, skipped: 0 },
      };

      const output = formatCheckTextOutput(result);

      expect(output).toContain("3 checked");
      expect(output).toContain("1 mismatch");
      expect(output).toContain("1 outdated");
      expect(output).toContain("1 ok");
    });
  });

  describe("formatCheckJsonOutput", () => {
    it("should return valid JSON structure", () => {
      const result: CheckOperationResult = {
        results: [
          {
            id: "smith-2024",
            uuid: "uuid-1",
            status: "warning",
            findings: [{ type: "retracted", message: "Retracted" }],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 0, warnings: 1, skipped: 0 },
      };

      const output = formatCheckJsonOutput(result);

      expect(output.results).toHaveLength(1);
      expect(output.summary.total).toBe(1);
      expect(output.summary.warnings).toBe(1);
    });

    it("should not include item data without --full", () => {
      const result: CheckOperationResult = {
        results: [
          {
            id: "smith-2024",
            uuid: "uuid-1",
            status: "ok",
            findings: [],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 1, warnings: 0, skipped: 0 },
      };

      const output = formatCheckJsonOutput(result);

      expect((output.results[0] as Record<string, unknown>).item).toBeUndefined();
    });

    it("should include item data with --full", () => {
      const item = {
        id: "smith-2024",
        type: "article-journal" as const,
        title: "Test Article",
        DOI: "10.1234/test",
      };
      const result: CheckOperationResult = {
        results: [
          {
            id: "smith-2024",
            uuid: "uuid-1",
            status: "ok",
            findings: [],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 1, warnings: 0, skipped: 0 },
      };

      const items = new Map([["smith-2024", item]]);
      const output = formatCheckJsonOutput(result, { full: true, items });

      expect((output.results[0] as Record<string, unknown>).item).toEqual(item);
    });
  });

  describe("getStatusLabel priority", () => {
    it("should show RETRACTED even when metadata findings come first", () => {
      const result: CheckOperationResult = {
        results: [
          {
            id: "mixed-findings",
            uuid: "uuid-1",
            status: "warning",
            findings: [
              { type: "metadata_mismatch", message: "Mismatch" },
              { type: "retracted", message: "Retracted" },
            ],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 0, warnings: 1, skipped: 0 },
      };

      const output = formatCheckTextOutput(result);

      // Retracted is highest priority, should be the label even if metadata finding is first
      expect(output).toContain("[RETRACTED] mixed-findings");
    });

    it("should show CONCERN over metadata findings", () => {
      const result: CheckOperationResult = {
        results: [
          {
            id: "concern-and-outdated",
            uuid: "uuid-1",
            status: "warning",
            findings: [
              { type: "metadata_outdated", message: "Outdated" },
              { type: "concern", message: "Concern" },
            ],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 0, warnings: 1, skipped: 0 },
      };

      const output = formatCheckTextOutput(result);

      expect(output).toContain("[CONCERN] concern-and-outdated");
    });

    it("should show MISMATCH over OUTDATED", () => {
      const result: CheckOperationResult = {
        results: [
          {
            id: "both-metadata",
            uuid: "uuid-1",
            status: "warning",
            findings: [
              { type: "metadata_outdated", message: "Outdated" },
              { type: "metadata_mismatch", message: "Mismatch" },
            ],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 0, warnings: 1, skipped: 0 },
      };

      const output = formatCheckTextOutput(result);

      expect(output).toContain("[MISMATCH] both-metadata");
    });
  });

  describe("handleCheckAction --fix", () => {
    let stderrOutput: string;
    let originalStderrWrite: typeof process.stderr.write;

    beforeEach(() => {
      vi.clearAllMocks();
      stderrOutput = "";
      originalStderrWrite = process.stderr.write;
      process.stderr.write = ((chunk: string) => {
        stderrOutput += chunk;
        return true;
      }) as typeof process.stderr.write;
    });

    afterEach(() => {
      process.stderr.write = originalStderrWrite;
    });

    it("should error when --fix is used in non-TTY", async () => {
      // Mock isTTY to return false
      const helpers = await import("../helpers.js");
      vi.spyOn(helpers, "isTTY").mockReturnValue(false);
      const setExitCodeSpy = vi.spyOn(helpers, "setExitCode");

      await handleCheckAction(["smith-2024"], { fix: true }, {});

      expect(stderrOutput).toContain("--fix requires an interactive terminal");
      expect(setExitCodeSpy).toHaveBeenCalledWith(1);
    });
  });
});
