import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ILibraryOperations } from "../../features/operations/library-operations.js";
import { type CheckToolParams, registerCheckTool } from "./check.js";

describe("MCP check tool", () => {
  const mockCheck = vi.fn();

  const createMockOps = (): ILibraryOperations =>
    ({
      check: mockCheck,
    }) as unknown as ILibraryOperations;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerCheckTool", () => {
    it("should register tool with correct name and description", () => {
      const registeredTools: Array<{
        name: string;
        config: { description?: string };
      }> = [];

      const mockServer = {
        registerTool: (name: string, config: { description?: string }, _cb: unknown) => {
          registeredTools.push({ name, config });
        },
      };

      registerCheckTool(mockServer as never, createMockOps);

      expect(registeredTools).toHaveLength(1);
      expect(registeredTools[0].name).toBe("check");
      expect(registeredTools[0].config.description).toContain("retraction");
    });
  });

  describe("check tool callback", () => {
    it("should check specified identifiers", async () => {
      mockCheck.mockResolvedValue({
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
      });

      let capturedCallback: (
        args: CheckToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerCheckTool(mockServer as never, createMockOps);

      const result = await capturedCallback?.({ ids: ["smith-2024"] });

      expect(mockCheck).toHaveBeenCalledWith(
        expect.objectContaining({ identifiers: ["smith-2024"] })
      );
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("smith-2024");
      expect(result.content[0].text).toContain("ok");
    });

    it("should check all references", async () => {
      mockCheck.mockResolvedValue({
        results: [],
        summary: { total: 0, ok: 0, warnings: 0, skipped: 0 },
      });

      let capturedCallback: (
        args: CheckToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerCheckTool(mockServer as never, createMockOps);

      await capturedCallback?.({ all: true });

      expect(mockCheck).toHaveBeenCalledWith(expect.objectContaining({ all: true }));
    });

    it("should report findings for warnings", async () => {
      mockCheck.mockResolvedValue({
        results: [
          {
            id: "retracted-2024",
            uuid: "uuid-1",
            status: "warning",
            findings: [
              {
                type: "retracted",
                message: "This article was retracted on 2024-06-01",
                details: { retractionDoi: "10.1234/retraction" },
              },
            ],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 0, warnings: 1, skipped: 0 },
      });

      let capturedCallback: (
        args: CheckToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerCheckTool(mockServer as never, createMockOps);

      const result = await capturedCallback?.({ ids: ["retracted-2024"] });

      expect(result.content[0].text).toContain("retracted-2024");
      expect(result.content[0].text).toContain("retracted");
    });

    it("should include summary", async () => {
      mockCheck.mockResolvedValue({
        results: [
          {
            id: "test-2024",
            uuid: "uuid-1",
            status: "ok",
            findings: [],
            checkedAt: "2026-02-15T10:00:00.000Z",
            checkedSources: ["crossref"],
          },
        ],
        summary: { total: 1, ok: 1, warnings: 0, skipped: 0 },
      });

      let capturedCallback: (
        args: CheckToolParams
      ) => Promise<{ content: Array<{ type: string; text: string }> }>;

      const mockServer = {
        registerTool: (_name: string, _config: unknown, cb: typeof capturedCallback) => {
          capturedCallback = cb;
        },
      };

      registerCheckTool(mockServer as never, createMockOps);

      const result = await capturedCallback?.({ ids: ["test-2024"] });

      // Last content item should be summary
      const lastContent = result.content[result.content.length - 1];
      expect(lastContent.text).toContain("Summary");
      expect(lastContent.text).toContain("1");
    });
  });
});
