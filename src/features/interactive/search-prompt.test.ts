import type { CslItem } from "@customTypes/csl-json.js";
import type { SearchResult } from "@features/search/types.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock enquirer before importing search-prompt
const mockRun = vi.fn();
const MockAutoComplete = vi.fn().mockImplementation(() => ({
  run: mockRun,
}));

vi.mock("enquirer", () => ({
  default: {
    AutoComplete: MockAutoComplete,
  },
}));

import {
  type SearchPromptConfig,
  createChoices,
  getTerminalWidth,
  parseSelectedValues,
  runSearchPrompt,
} from "./search-prompt.js";

// Mock CslItem for testing
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

// Create SearchResult from CslItem
function createSearchResult(item: CslItem): SearchResult {
  return {
    reference: item,
    overallStrength: "exact",
    tokenMatches: [],
    score: 0,
  };
}

describe("createChoices", () => {
  it("creates choices from search results", () => {
    const item = createMockItem({ id: "ref-001" });
    const results = [createSearchResult(item)];

    const choices = createChoices(results, 80);

    expect(choices).toHaveLength(1);
    // name contains JSON (Enquirer returns name on selection when value is not defined)
    expect(JSON.parse(choices[0].name).item.id).toBe("ref-001");
  });

  it("includes formatted message with index starting at 1", () => {
    const item = createMockItem({
      id: "ref-001",
      author: [{ family: "Doe", given: "Jane" }],
      title: "Research Paper",
    });
    const results = [createSearchResult(item)];

    const choices = createChoices(results, 80);

    // Message should contain [1] for first result
    expect(choices[0].message).toContain("[1]");
    expect(choices[0].message).toContain("Doe");
  });

  it("stores item data in name as JSON (Enquirer returns name on selection)", () => {
    const item = createMockItem({ id: "ref-001" });
    const results = [createSearchResult(item)];

    const choices = createChoices(results, 80);

    const parsed = JSON.parse(choices[0].name as string);
    expect(parsed.index).toBe(0);
    expect(parsed.item.id).toBe("ref-001");
  });

  it("handles multiple results with correct indices", () => {
    const items = [
      createMockItem({ id: "ref-001" }),
      createMockItem({ id: "ref-002" }),
      createMockItem({ id: "ref-003" }),
    ];
    const results = items.map(createSearchResult);

    const choices = createChoices(results, 80);

    expect(choices).toHaveLength(3);
    expect(choices[0].message).toContain("[1]");
    expect(choices[1].message).toContain("[2]");
    expect(choices[2].message).toContain("[3]");
  });

  it("handles empty results", () => {
    const choices = createChoices([], 80);

    expect(choices).toHaveLength(0);
  });
});

describe("parseSelectedValues", () => {
  it("parses single value string", () => {
    const item = createMockItem({ id: "ref-001" });
    const valueJson = JSON.stringify({ index: 0, item });

    const result = parseSelectedValues(valueJson);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ref-001");
  });

  it("parses array of values", () => {
    const item1 = createMockItem({ id: "ref-001" });
    const item2 = createMockItem({ id: "ref-002" });
    const values = [
      JSON.stringify({ index: 0, item: item1 }),
      JSON.stringify({ index: 1, item: item2 }),
    ];

    const result = parseSelectedValues(values);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("ref-001");
    expect(result[1].id).toBe("ref-002");
  });

  it("handles empty array", () => {
    const result = parseSelectedValues([]);

    expect(result).toHaveLength(0);
  });

  it("skips invalid JSON values gracefully", () => {
    const item = createMockItem({ id: "ref-001" });
    const values = [
      JSON.stringify({ index: 0, item }),
      "invalid-json",
      JSON.stringify({ index: 2, item: createMockItem({ id: "ref-003" }) }),
    ];

    const result = parseSelectedValues(values);

    // Should parse valid values and skip invalid ones
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("ref-001");
    expect(result[1].id).toBe("ref-003");
  });

  it("handles empty string", () => {
    const result = parseSelectedValues("");

    expect(result).toHaveLength(0);
  });
});

describe("getTerminalWidth", () => {
  const originalColumns = process.stdout.columns;

  afterEach(() => {
    // Restore original value
    Object.defineProperty(process.stdout, "columns", {
      value: originalColumns,
      writable: true,
    });
  });

  it("returns process.stdout.columns when available", () => {
    Object.defineProperty(process.stdout, "columns", {
      value: 120,
      writable: true,
    });

    expect(getTerminalWidth()).toBe(120);
  });

  it("returns 80 as fallback when columns is undefined", () => {
    Object.defineProperty(process.stdout, "columns", {
      value: undefined,
      writable: true,
    });

    expect(getTerminalWidth()).toBe(80);
  });
});

describe("runSearchPrompt", () => {
  const defaultConfig: SearchPromptConfig = {
    limit: 20,
    debounceMs: 200,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns selected items when user makes selection", async () => {
    const item1 = createMockItem({ id: "ref-001" });
    const item2 = createMockItem({ id: "ref-002" });
    const allRefs = [item1, item2];

    // Mock search function
    const searchFn = vi.fn().mockReturnValue([createSearchResult(item1)]);

    // Mock AutoComplete to return selected value
    const selectedValue = JSON.stringify({ index: 0, item: item1 });
    mockRun.mockResolvedValueOnce([selectedValue]);

    const result = await runSearchPrompt(allRefs, searchFn, defaultConfig);

    expect(result.cancelled).toBe(false);
    expect(result.selected).toHaveLength(1);
    expect(result.selected[0].id).toBe("ref-001");
  });

  it("returns cancelled: true when user presses Escape", async () => {
    const allRefs = [createMockItem({ id: "ref-001" })];
    const searchFn = vi.fn();

    // Enquirer throws empty string on cancel
    mockRun.mockRejectedValueOnce("");

    const result = await runSearchPrompt(allRefs, searchFn, defaultConfig);

    expect(result.cancelled).toBe(true);
    expect(result.selected).toHaveLength(0);
  });

  it("handles multiple selections", async () => {
    const item1 = createMockItem({ id: "ref-001" });
    const item2 = createMockItem({ id: "ref-002" });
    const allRefs = [item1, item2];

    const searchFn = vi.fn();

    // Mock multiple selections
    const selectedValues = [
      JSON.stringify({ index: 0, item: item1 }),
      JSON.stringify({ index: 1, item: item2 }),
    ];
    mockRun.mockResolvedValueOnce(selectedValues);

    const result = await runSearchPrompt(allRefs, searchFn, defaultConfig);

    expect(result.cancelled).toBe(false);
    expect(result.selected).toHaveLength(2);
  });

  it("creates AutoComplete with correct options", async () => {
    const item1 = createMockItem({ id: "ref-001" });
    const allRefs = [item1];
    // When initialQuery is provided, searchFn is called to get initial results
    const searchFn = vi.fn().mockReturnValue([createSearchResult(item1)]);

    mockRun.mockResolvedValueOnce([]);

    await runSearchPrompt(allRefs, searchFn, defaultConfig, "test query");

    expect(MockAutoComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "references",
        message: "Search references",
        initial: "test query",
        multiple: true,
        limit: 20,
      })
    );
  });

  it("uses search function in suggest callback", async () => {
    const item1 = createMockItem({ id: "ref-001" });
    const item2 = createMockItem({ id: "ref-002" });
    const allRefs = [item1, item2];

    const searchFn = vi.fn().mockReturnValue([createSearchResult(item1)]);
    mockRun.mockResolvedValueOnce([]);

    await runSearchPrompt(allRefs, searchFn, defaultConfig);

    // Get the suggest function from the constructor call
    const constructorCall = MockAutoComplete.mock.calls[0][0];
    const suggestFn = constructorCall.suggest;

    // Call suggest with a query
    const choices = suggestFn("machine", []);

    expect(searchFn).toHaveBeenCalledWith("machine");
    expect(choices).toHaveLength(1);
  });

  it("returns all references when suggest is called with empty input after typing", async () => {
    const item1 = createMockItem({ id: "ref-001" });
    const item2 = createMockItem({ id: "ref-002" });
    const allRefs = [item1, item2];

    const searchFn = vi.fn().mockReturnValue([createSearchResult(item1)]);
    mockRun.mockResolvedValueOnce([]);

    await runSearchPrompt(allRefs, searchFn, defaultConfig);

    const constructorCall = MockAutoComplete.mock.calls[0][0];
    const suggestFn = constructorCall.suggest;

    // First, type something to change lastQuery
    suggestFn("test", []);

    // Then clear input - should return all references
    const choices = suggestFn("", []);

    expect(choices).toHaveLength(2);
  });

  it("propagates non-cancel errors", async () => {
    const allRefs = [createMockItem({ id: "ref-001" })];
    const searchFn = vi.fn();

    // Create an error with a non-empty message
    const error = new Error("Unexpected error");
    mockRun.mockRejectedValueOnce(error);

    try {
      await runSearchPrompt(allRefs, searchFn, defaultConfig);
      // If we get here, the error wasn't thrown
      expect.fail("Expected error to be thrown");
    } catch (thrownError) {
      expect(thrownError).toBe(error);
    }
  });
});
