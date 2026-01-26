import type { CslItem } from "@customTypes/csl-json.js";
import type { SearchResult } from "@features/search/types.js";
import { afterEach, describe, expect, it, vi } from "vitest";

// Mock ink to prevent actual rendering
vi.mock("ink", () => ({
  render: vi.fn(() => ({
    unmount: vi.fn(),
    waitUntilExit: () => Promise.resolve(),
  })),
}));

import {
  calculateEffectiveLimit,
  createChoices,
  getTerminalHeight,
  getTerminalWidth,
  parseSelectedValues,
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
    // name contains JSON (legacy format for backward compatibility)
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
  });

  it("stores item data in name as JSON", () => {
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

describe("getTerminalHeight", () => {
  const originalRows = process.stdout.rows;

  afterEach(() => {
    // Restore original value
    Object.defineProperty(process.stdout, "rows", {
      value: originalRows,
      writable: true,
    });
  });

  it("returns process.stdout.rows when available", () => {
    Object.defineProperty(process.stdout, "rows", {
      value: 40,
      writable: true,
    });

    expect(getTerminalHeight()).toBe(40);
  });

  it("returns 24 as fallback when rows is undefined", () => {
    Object.defineProperty(process.stdout, "rows", {
      value: undefined,
      writable: true,
    });

    expect(getTerminalHeight()).toBe(24);
  });
});

describe("calculateEffectiveLimit", () => {
  const originalRows = process.stdout.rows;

  afterEach(() => {
    Object.defineProperty(process.stdout, "rows", {
      value: originalRows,
      writable: true,
    });
  });

  it("returns config limit when terminal is large enough", () => {
    Object.defineProperty(process.stdout, "rows", {
      value: 70,
      writable: true,
    });

    // 70 rows - 10 reserved = 60 available, 60 / 3 lines per item = 20 max
    // config limit 20 is equal, so returns 20
    expect(calculateEffectiveLimit(20)).toBe(20);
  });

  it("limits to terminal height minus reserved lines divided by lines per item", () => {
    Object.defineProperty(process.stdout, "rows", {
      value: 20,
      writable: true,
    });

    // 20 rows - 10 reserved = 10 available, 10 / 3 = 3 max items
    // config limit 20 is larger, so returns 3
    expect(calculateEffectiveLimit(20)).toBe(3);
  });

  it("returns terminal-based limit when config limit is 0", () => {
    Object.defineProperty(process.stdout, "rows", {
      value: 44,
      writable: true,
    });

    // 44 rows - 10 reserved = 34 available, 34 / 3 = 11 max items
    expect(calculateEffectiveLimit(0)).toBe(11);
  });

  it("returns at least 1 even with very small terminal", () => {
    Object.defineProperty(process.stdout, "rows", {
      value: 5,
      writable: true,
    });

    // 5 - 10 = -5 available, -5 / 3 = -1, but should be at least 1
    expect(calculateEffectiveLimit(20)).toBe(1);
  });
});

// Note: runSearchPrompt is now using React Ink and requires different testing approach.
// The integration tests (e2e) cover the end-to-end behavior.
// Unit tests for the React Ink components should use ink-testing-library if needed.
