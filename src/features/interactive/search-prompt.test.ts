import { afterEach, describe, expect, it } from "vitest";

import { calculateEffectiveLimit, getTerminalHeight, getTerminalWidth } from "./search-prompt.js";

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

    // 70 rows - 12 reserved = 58 available, 58 / 3 lines per item = 19 max
    // config limit 20 is larger, so returns 19
    expect(calculateEffectiveLimit(20)).toBe(19);
  });

  it("limits to terminal height minus reserved lines divided by lines per item", () => {
    Object.defineProperty(process.stdout, "rows", {
      value: 20,
      writable: true,
    });

    // 20 rows - 12 reserved = 8 available, 8 / 3 = 2 max items
    // config limit 20 is larger, so returns 2
    expect(calculateEffectiveLimit(20)).toBe(2);
  });

  it("returns terminal-based limit when config limit is 0", () => {
    Object.defineProperty(process.stdout, "rows", {
      value: 44,
      writable: true,
    });

    // 44 rows - 12 reserved = 32 available, 32 / 3 = 10 max items
    expect(calculateEffectiveLimit(0)).toBe(10);
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
