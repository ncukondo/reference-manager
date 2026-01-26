import type { CslItem } from "@customTypes/csl-json.js";
import { describe, expect, it, vi } from "vitest";

// Mock ink to prevent actual rendering
vi.mock("ink", () => ({
  render: vi.fn(() => ({
    unmount: vi.fn(),
    waitUntilExit: () => Promise.resolve(),
  })),
}));

// Mock format functions
vi.mock("../format/index.js", () => ({
  formatBibtex: vi.fn((items: CslItem[]) => items.map((i) => `@article{${i.id}}`).join("\n\n")),
  formatBibliographyCSL: vi.fn(
    (items: CslItem[], options: { style?: string }) =>
      `[${options.style || "apa"}] ${items.map((i) => i.title).join("; ")}`
  ),
}));

import { ACTION_CHOICES, STYLE_CHOICES } from "./action-menu.js";

describe("ACTION_CHOICES", () => {
  it("has all required action types", () => {
    const actionTypes = ACTION_CHOICES.map((c) => c.value);

    expect(actionTypes).toContain("output-ids");
    expect(actionTypes).toContain("output-csl-json");
    expect(actionTypes).toContain("output-bibtex");
    expect(actionTypes).toContain("cite-apa");
    expect(actionTypes).toContain("cite-choose");
    expect(actionTypes).toContain("cancel");
  });

  it("has 6 choices", () => {
    expect(ACTION_CHOICES).toHaveLength(6);
  });

  it("uses SelectOption format with label and value", () => {
    for (const choice of ACTION_CHOICES) {
      expect(choice).toHaveProperty("label");
      expect(choice).toHaveProperty("value");
    }
  });
});

describe("STYLE_CHOICES", () => {
  it("includes builtin styles", () => {
    const styleValues = STYLE_CHOICES.map((c) => c.value);

    // These should match BUILTIN_STYLES from config/csl-styles.ts
    expect(styleValues).toContain("apa");
    expect(styleValues).toContain("vancouver");
    expect(styleValues).toContain("harvard");
  });

  it("uses SelectOption format with label and value", () => {
    for (const choice of STYLE_CHOICES) {
      expect(choice).toHaveProperty("label");
      expect(choice).toHaveProperty("value");
    }
  });
});

// Note: runActionMenu and runStyleSelectPrompt are now using React Ink and require different testing approach.
// The integration tests (e2e) cover the end-to-end behavior.
// Unit tests for the React Ink components should use ink-testing-library if needed.
