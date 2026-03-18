import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { executeShow, formatShowOutput, handleShowAction } from "./show.js";

// Mock CLI helpers
vi.mock("../helpers.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../helpers.js")>();
  return {
    ...actual,
    loadConfigWithOverrides: vi.fn().mockResolvedValue({
      library: "/tmp/test-lib.json",
      attachments: { directory: "/tmp/test-attachments" },
      logLevel: "info",
      cli: { tui: { limit: 20, debounceMs: 200 } },
    }),
    isTTY: vi.fn().mockReturnValue(false),
    readIdentifierFromStdin: vi.fn().mockResolvedValue(undefined),
    exitWithError: vi.fn(),
    setExitCode: vi.fn(),
    writeOutputWithClipboard: vi.fn(),
  };
});

// Mock execution context
vi.mock("../execution-context.js", () => ({
  createExecutionContext: vi.fn(),
}));

// Mock Library
vi.mock("../../core/library.js", () => ({
  Library: { load: vi.fn() },
}));

function makeItem(id: string, overrides: Partial<CslItem> = {}): CslItem {
  return {
    id,
    type: "article-journal",
    ...overrides,
  };
}

function createMockContext(items: CslItem[]) {
  return {
    mode: "local" as const,
    library: {
      find: vi.fn(async (identifier: string, options?: { idType?: string }) => {
        if (options?.idType === "uuid") {
          return items.find((i) => i.custom?.uuid === identifier);
        }
        return items.find((i) => i.id === identifier);
      }),
      getAll: vi.fn(async () => items),
      add: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      save: vi.fn(),
      search: vi.fn(),
      list: vi.fn(),
      cite: vi.fn(),
      import: vi.fn(),
      check: vi.fn(),
      attachAdd: vi.fn(),
      attachList: vi.fn(),
      attachGet: vi.fn(),
      attachDetach: vi.fn(),
      attachSync: vi.fn(),
      attachOpen: vi.fn(),
    },
  };
}

describe("executeShow", () => {
  it("looks up a reference by ID", async () => {
    const items = [makeItem("smith2023", { title: "Test" })];
    const context = createMockContext(items);

    const result = await executeShow("smith2023", {}, context);
    expect(result).toBeDefined();
    expect(result?.id).toBe("smith2023");
    expect(context.library.find).toHaveBeenCalledWith("smith2023", { idType: "id" });
  });

  it("looks up by UUID when --uuid flag set", async () => {
    const items = [makeItem("smith2023", { custom: { uuid: "abc-123" } })];
    const context = createMockContext(items);

    const result = await executeShow("abc-123", { uuid: true }, context);
    expect(result).toBeDefined();
    expect(context.library.find).toHaveBeenCalledWith("abc-123", { idType: "uuid" });
  });

  it("returns undefined for non-existent reference", async () => {
    const context = createMockContext([]);

    const result = await executeShow("nonexistent", {}, context);
    expect(result).toBeUndefined();
  });
});

describe("formatShowOutput", () => {
  const item = makeItem("smith2023", {
    title: "Machine Learning",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2023]] },
    DOI: "10.1000/test",
  });

  it("formats pretty output by default", () => {
    const output = formatShowOutput(item, {});
    expect(output).toContain("[smith2023]");
    expect(output).toContain("Machine Learning");
    expect(output).toContain("Type:");
  });

  it("formats JSON output with --json flag", () => {
    const output = formatShowOutput(item, { json: true });
    const parsed = JSON.parse(output);
    expect(parsed.id).toBe("smith2023");
    expect(parsed.title).toBe("Machine Learning");
    expect(parsed.doi).toBe("10.1000/test");
    expect(parsed.raw).toBeDefined();
  });

  it("formats JSON output with --output json", () => {
    const output = formatShowOutput(item, { output: "json" });
    const parsed = JSON.parse(output);
    expect(parsed.id).toBe("smith2023");
  });

  it("formats YAML output with --output yaml", () => {
    const output = formatShowOutput(item, { output: "yaml" });
    expect(output).toContain("id: smith2023");
    expect(output).toContain("title: Machine Learning");
  });

  it("formats BibTeX output with --output bibtex", () => {
    const output = formatShowOutput(item, { output: "bibtex" });
    expect(output).toContain("@article");
    expect(output).toContain("smith2023");
  });
});

describe("handleShowAction", () => {
  let helpers: typeof import("../helpers.js");
  let executionContext: typeof import("../execution-context.js");

  beforeEach(async () => {
    vi.clearAllMocks();
    helpers = await import("../helpers.js");
    executionContext = await import("../execution-context.js");
  });

  it("shows a reference by ID (pretty output)", async () => {
    const items = [makeItem("smith2023", { title: "Test Title" })];
    const context = createMockContext(items);
    vi.mocked(executionContext.createExecutionContext).mockResolvedValue(context);

    await handleShowAction("smith2023", {}, {});

    expect(helpers.setExitCode).toHaveBeenCalledWith(0);
    expect(helpers.writeOutputWithClipboard).toHaveBeenCalled();
    const output = vi.mocked(helpers.writeOutputWithClipboard).mock.calls[0][0];
    expect(output).toContain("[smith2023]");
    expect(output).toContain("Test Title");
  });

  it("shows a reference with --json flag", async () => {
    const items = [makeItem("smith2023", { title: "Test Title" })];
    const context = createMockContext(items);
    vi.mocked(executionContext.createExecutionContext).mockResolvedValue(context);

    await handleShowAction("smith2023", { json: true }, {});

    const output = vi.mocked(helpers.writeOutputWithClipboard).mock.calls[0][0];
    const parsed = JSON.parse(output);
    expect(parsed.id).toBe("smith2023");
  });

  it("shows a reference with --output yaml", async () => {
    const items = [makeItem("smith2023", { title: "Test" })];
    const context = createMockContext(items);
    vi.mocked(executionContext.createExecutionContext).mockResolvedValue(context);

    await handleShowAction("smith2023", { output: "yaml" }, {});

    const output = vi.mocked(helpers.writeOutputWithClipboard).mock.calls[0][0];
    expect(output).toContain("id: smith2023");
  });

  it("shows a reference with --output bibtex", async () => {
    const items = [makeItem("smith2023", { title: "Test" })];
    const context = createMockContext(items);
    vi.mocked(executionContext.createExecutionContext).mockResolvedValue(context);

    await handleShowAction("smith2023", { output: "bibtex" }, {});

    const output = vi.mocked(helpers.writeOutputWithClipboard).mock.calls[0][0];
    expect(output).toContain("@article");
  });

  it("exits with error when reference not found", async () => {
    const context = createMockContext([]);
    vi.mocked(executionContext.createExecutionContext).mockResolvedValue(context);

    await handleShowAction("nonexistent", {}, {});

    expect(helpers.exitWithError).toHaveBeenCalledWith("Reference not found: nonexistent");
  });

  it("exits with error when no identifier and non-TTY", async () => {
    const context = createMockContext([]);
    vi.mocked(executionContext.createExecutionContext).mockResolvedValue(context);
    vi.mocked(helpers.isTTY).mockReturnValue(false);
    vi.mocked(helpers.readIdentifierFromStdin).mockResolvedValue(undefined);

    await handleShowAction(undefined, {}, {});

    expect(helpers.exitWithError).toHaveBeenCalledWith(
      "Identifier required (non-interactive mode)"
    );
  });

  it("reads identifier from stdin when non-TTY", async () => {
    const items = [makeItem("stdin-ref", { title: "From stdin" })];
    const context = createMockContext(items);
    vi.mocked(executionContext.createExecutionContext).mockResolvedValue(context);
    vi.mocked(helpers.isTTY).mockReturnValue(false);
    vi.mocked(helpers.readIdentifierFromStdin).mockResolvedValue("stdin-ref");

    await handleShowAction(undefined, {}, {});

    expect(helpers.setExitCode).toHaveBeenCalledWith(0);
  });

  it("uses --uuid flag to look up by UUID", async () => {
    const items = [makeItem("smith2023", { custom: { uuid: "uuid-123" } })];
    const context = createMockContext(items);
    vi.mocked(executionContext.createExecutionContext).mockResolvedValue(context);

    await handleShowAction("uuid-123", { uuid: true }, {});

    expect(context.library.find).toHaveBeenCalledWith("uuid-123", { idType: "uuid" });
    expect(helpers.setExitCode).toHaveBeenCalledWith(0);
  });
});
