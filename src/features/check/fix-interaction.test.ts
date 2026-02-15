import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { FixInteractionResult } from "./fix-interaction.js";
import type { CheckResult } from "./types.js";

// Mock fix-actions
vi.mock("./fix-actions.js", () => ({
  getFixActionsForFinding: vi.fn(),
  applyFixAction: vi.fn(),
}));

// Mock ink and react (since we can't render in test environment)
vi.mock("ink", () => ({
  render: vi.fn(() => ({
    waitUntilExit: () => Promise.resolve(),
  })),
}));

vi.mock("react", () => ({
  createElement: vi.fn(),
}));

vi.mock("../interactive/alternate-screen.js", () => ({
  restoreStdinAfterInk: vi.fn(),
}));

vi.mock("../interactive/components/index.js", () => ({
  Select: vi.fn(),
}));

describe("fix-interaction", () => {
  let mockLibrary: {
    update: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    getAll: ReturnType<typeof vi.fn>;
  };

  const items: CslItem[] = [
    {
      id: "retracted-2024",
      type: "article-journal",
      DOI: "10.1234/test",
      custom: { uuid: "uuid-1" },
    },
    {
      id: "ok-2024",
      type: "article-journal",
      DOI: "10.5678/ok",
      custom: { uuid: "uuid-2" },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockLibrary = {
      update: vi.fn().mockResolvedValue({ updated: true }),
      remove: vi.fn().mockResolvedValue({ removed: true }),
      save: vi.fn().mockResolvedValue(undefined),
      find: vi.fn(),
      getAll: vi.fn().mockResolvedValue(items),
    };
  });

  it("should skip results with ok status", async () => {
    const { runFixInteraction } = await import("./fix-interaction.js");

    const results: CheckResult[] = [
      {
        id: "ok-2024",
        uuid: "uuid-2",
        status: "ok",
        findings: [],
        checkedAt: "2026-02-15T10:00:00.000Z",
        checkedSources: ["crossref"],
      },
    ];

    const findItem = (id: string): CslItem | undefined => items.find((i) => i.id === id);

    const result: FixInteractionResult = await runFixInteraction(
      results,
      mockLibrary as never,
      findItem
    );

    expect(result.totalFindings).toBe(0);
    expect(result.applied).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it("should skip results with skipped status", async () => {
    const { runFixInteraction } = await import("./fix-interaction.js");

    const results: CheckResult[] = [
      {
        id: "skipped-2024",
        uuid: "uuid-3",
        status: "skipped",
        findings: [],
        checkedAt: "2026-02-15T10:00:00.000Z",
        checkedSources: [],
      },
    ];

    const findItem = (id: string): CslItem | undefined => items.find((i) => i.id === id);

    const result = await runFixInteraction(results, mockLibrary as never, findItem);

    expect(result.totalFindings).toBe(0);
  });

  it("should count findings for warning results", async () => {
    const { getFixActionsForFinding } = await import("./fix-actions.js");
    const mockGetActions = vi.mocked(getFixActionsForFinding);
    mockGetActions.mockReturnValue([]);

    const { runFixInteraction } = await import("./fix-interaction.js");

    const results: CheckResult[] = [
      {
        id: "retracted-2024",
        uuid: "uuid-1",
        status: "warning",
        findings: [
          {
            type: "retracted",
            message: "Retracted",
            details: { retractionDoi: "10.1234/retraction" },
          },
        ],
        checkedAt: "2026-02-15T10:00:00.000Z",
        checkedSources: ["crossref"],
      },
    ];

    const findItem = (id: string): CslItem | undefined => items.find((i) => i.id === id);

    const result = await runFixInteraction(results, mockLibrary as never, findItem);

    expect(result.totalFindings).toBe(1);
    expect(mockGetActions).toHaveBeenCalledWith(results[0].findings[0]);
  });

  it("should skip if item not found", async () => {
    const { runFixInteraction } = await import("./fix-interaction.js");

    const results: CheckResult[] = [
      {
        id: "nonexistent-2024",
        uuid: "uuid-99",
        status: "warning",
        findings: [{ type: "retracted", message: "Retracted" }],
        checkedAt: "2026-02-15T10:00:00.000Z",
        checkedSources: ["crossref"],
      },
    ];

    const findItem = (_id: string): CslItem | undefined => undefined;

    const result = await runFixInteraction(results, mockLibrary as never, findItem);

    expect(result.totalFindings).toBe(0);
  });
});
