import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckOperationResult } from "../../features/operations/check.js";
import type { ExecutionContext } from "../execution-context.js";
import {
  type CheckCommandOptions,
  executeCheck,
  formatCheckJsonOutput,
  formatCheckTextOutput,
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
        noSave: true,
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
  });
});
