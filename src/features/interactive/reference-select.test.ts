import type { CslItem } from "@customTypes/csl-json.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock runSearchPrompt
const mockRunSearchPrompt = vi.fn();
vi.mock("./search-prompt.js", () => ({
  runSearchPrompt: (...args: unknown[]) => mockRunSearchPrompt(...args),
}));

// Mock tty
vi.mock("./tty.js", () => ({
  checkTTY: vi.fn(),
}));

// Mock search modules
vi.mock("../search/matcher.js", () => ({
  search: vi.fn().mockReturnValue([]),
}));

vi.mock("../search/tokenizer.js", () => ({
  tokenize: vi.fn().mockReturnValue({ tokens: [] }),
}));

import {
  type ReferenceSelectOptions,
  runReferenceSelect,
  selectReferenceItemsOrExit,
  selectReferencesOrExit,
} from "./reference-select.js";

function createMockItem(overrides: Partial<CslItem> = {}): CslItem {
  return {
    id: "test-id",
    type: "article-journal",
    title: "Test Article Title",
    author: [{ family: "Smith", given: "John" }],
    issued: { "date-parts": [[2020]] },
    DOI: "10.1000/test",
    ...overrides,
  };
}

describe("runReferenceSelect", () => {
  const defaultOptions: ReferenceSelectOptions = {
    multiSelect: true,
    prompt: "Select references",
  };

  const defaultConfig = {
    limit: 20,
    debounceMs: 200,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns selected items from runSearchPrompt", async () => {
    const item1 = createMockItem({ id: "ref-001" });
    const item2 = createMockItem({ id: "ref-002" });
    const allRefs = [item1, item2];

    mockRunSearchPrompt.mockResolvedValueOnce({
      selected: [item1, item2],
      cancelled: false,
    });

    const result = await runReferenceSelect(allRefs, defaultOptions, defaultConfig);

    expect(result.selected).toHaveLength(2);
    expect(result.selected[0].id).toBe("ref-001");
    expect(result.selected[1].id).toBe("ref-002");
    expect(result.cancelled).toBe(false);
  });

  it("returns cancelled when user cancels", async () => {
    const allRefs = [createMockItem({ id: "ref-001" })];

    mockRunSearchPrompt.mockResolvedValueOnce({
      selected: [],
      cancelled: true,
    });

    const result = await runReferenceSelect(allRefs, defaultOptions, defaultConfig);

    expect(result.selected).toHaveLength(0);
    expect(result.cancelled).toBe(true);
  });

  it("passes initial query to runSearchPrompt", async () => {
    const allRefs = [createMockItem({ id: "ref-001" })];

    mockRunSearchPrompt.mockResolvedValueOnce({
      selected: [],
      cancelled: false,
    });

    await runReferenceSelect(
      allRefs,
      { ...defaultOptions, initialQuery: "test query" },
      defaultConfig
    );

    expect(mockRunSearchPrompt).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "test query"
    );
  });

  it("uses multiSelect: false for single selection mode", async () => {
    const item1 = createMockItem({ id: "ref-001" });
    const allRefs = [item1];

    mockRunSearchPrompt.mockResolvedValueOnce({
      selected: [item1],
      cancelled: false,
    });

    const result = await runReferenceSelect(allRefs, { multiSelect: false }, defaultConfig);

    // Should return only first selected item
    expect(result.selected).toHaveLength(1);
    expect(result.selected[0].id).toBe("ref-001");
  });

  it("limits to single item when multiSelect is false", async () => {
    const item1 = createMockItem({ id: "ref-001" });
    const item2 = createMockItem({ id: "ref-002" });
    const allRefs = [item1, item2];

    // Even if multiple items are somehow selected, single mode should return only first
    mockRunSearchPrompt.mockResolvedValueOnce({
      selected: [item1, item2],
      cancelled: false,
    });

    const result = await runReferenceSelect(allRefs, { multiSelect: false }, defaultConfig);

    expect(result.selected).toHaveLength(1);
    expect(result.selected[0].id).toBe("ref-001");
  });

  it("returns empty when no references in library", async () => {
    mockRunSearchPrompt.mockResolvedValueOnce({
      selected: [],
      cancelled: false,
    });

    const result = await runReferenceSelect([], defaultOptions, defaultConfig);

    expect(result.selected).toHaveLength(0);
    expect(result.cancelled).toBe(false);
  });
});

describe("selectReferencesOrExit", () => {
  const defaultConfig = {
    limit: 20,
    debounceMs: 200,
  };

  let mockExit: ReturnType<typeof vi.spyOn>;
  let mockStderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    mockStderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockStderr.mockRestore();
  });

  it("returns identifiers for selected items", async () => {
    const item1 = createMockItem({ id: "ref-001" });
    const item2 = createMockItem({ id: "ref-002" });
    const allRefs = [item1, item2];

    mockRunSearchPrompt.mockResolvedValueOnce({
      selected: [item1, item2],
      cancelled: false,
    });

    const result = await selectReferencesOrExit(allRefs, { multiSelect: true }, defaultConfig);

    expect(result).toEqual(["ref-001", "ref-002"]);
  });

  it("exits with code 0 when library is empty", async () => {
    await expect(selectReferencesOrExit([], { multiSelect: true }, defaultConfig)).rejects.toThrow(
      "process.exit called"
    );

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(mockStderr).toHaveBeenCalledWith("No references in library.\n");
  });

  it("exits with code 0 when cancelled", async () => {
    const item1 = createMockItem({ id: "ref-001" });

    mockRunSearchPrompt.mockResolvedValueOnce({
      selected: [],
      cancelled: true,
    });

    await expect(
      selectReferencesOrExit([item1], { multiSelect: true }, defaultConfig)
    ).rejects.toThrow("process.exit called");

    expect(mockExit).toHaveBeenCalledWith(0);
  });
});

describe("selectReferenceItemsOrExit", () => {
  const defaultConfig = {
    limit: 20,
    debounceMs: 200,
  };

  let mockExit: ReturnType<typeof vi.spyOn>;
  let mockStderr: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });
    mockStderr = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockStderr.mockRestore();
  });

  it("returns full CslItem objects for selected items", async () => {
    const item1 = createMockItem({ id: "ref-001" });
    const item2 = createMockItem({ id: "ref-002" });
    const allRefs = [item1, item2];

    mockRunSearchPrompt.mockResolvedValueOnce({
      selected: [item1, item2],
      cancelled: false,
    });

    const result = await selectReferenceItemsOrExit(allRefs, { multiSelect: true }, defaultConfig);

    expect(result).toHaveLength(2);
    expect(result[0]).toBe(item1);
    expect(result[1]).toBe(item2);
  });

  it("exits with code 0 when library is empty", async () => {
    await expect(
      selectReferenceItemsOrExit([], { multiSelect: true }, defaultConfig)
    ).rejects.toThrow("process.exit called");

    expect(mockExit).toHaveBeenCalledWith(0);
    expect(mockStderr).toHaveBeenCalledWith("No references in library.\n");
  });

  it("exits with code 0 when cancelled", async () => {
    const item1 = createMockItem({ id: "ref-001" });

    mockRunSearchPrompt.mockResolvedValueOnce({
      selected: [],
      cancelled: true,
    });

    await expect(
      selectReferenceItemsOrExit([item1], { multiSelect: true }, defaultConfig)
    ).rejects.toThrow("process.exit called");

    expect(mockExit).toHaveBeenCalledWith(0);
  });
});
