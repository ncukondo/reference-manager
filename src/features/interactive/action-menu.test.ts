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

import { ACTION_CHOICES, STYLE_CHOICES, generateOutput, getActionChoices } from "./action-menu.js";

describe("ACTION_CHOICES", () => {
  it("has all required action types", () => {
    const actionTypes = ACTION_CHOICES.map((c) => c.value);

    expect(actionTypes).toContain("output-ids");
    expect(actionTypes).toContain("output-csl-json");
    expect(actionTypes).toContain("output-bibtex");
    expect(actionTypes).toContain("cite-apa");
    expect(actionTypes).toContain("cite-choose");
    expect(actionTypes).toContain("key-default");
    expect(actionTypes).toContain("cancel");
  });

  it("has 7 choices", () => {
    expect(ACTION_CHOICES).toHaveLength(7);
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

describe("generateOutput", () => {
  const mockItems: CslItem[] = [
    {
      id: "ref1",
      type: "article-journal",
      title: "Test Article 1",
      author: [{ family: "Smith", given: "John" }],
      issued: { "date-parts": [[2023]] },
    },
    {
      id: "ref2",
      type: "article-journal",
      title: "Test Article 2",
      author: [{ family: "Doe", given: "Jane" }],
      issued: { "date-parts": [[2024]] },
    },
  ];

  it("should generate pandoc citation keys by default for key-default action", () => {
    const output = generateOutput("key-default", mockItems);
    expect(output).toBe("@ref1; @ref2");
  });

  it("should generate pandoc citation keys when defaultKeyFormat is pandoc", () => {
    const output = generateOutput("key-default", mockItems, "apa", "pandoc");
    expect(output).toBe("@ref1; @ref2");
  });

  it("should generate latex citation keys when defaultKeyFormat is latex", () => {
    const output = generateOutput("key-default", mockItems, "apa", "latex");
    expect(output).toBe("\\cite{ref1,ref2}");
  });

  it("should generate output-ids correctly", () => {
    const output = generateOutput("output-ids", mockItems);
    expect(output).toBe("ref1\nref2");
  });

  it("should return empty string for cancel", () => {
    const output = generateOutput("cancel", mockItems);
    expect(output).toBe("");
  });
});

describe("getActionChoices", () => {
  it("should return Pandoc label by default", () => {
    const choices = getActionChoices();
    const keyChoice = choices.find((c) => c.value === "key-default");
    expect(keyChoice?.label).toBe("Citation key (Pandoc)");
  });

  it("should return Pandoc label when defaultKeyFormat is pandoc", () => {
    const choices = getActionChoices("pandoc");
    const keyChoice = choices.find((c) => c.value === "key-default");
    expect(keyChoice?.label).toBe("Citation key (Pandoc)");
  });

  it("should return LaTeX label when defaultKeyFormat is latex", () => {
    const choices = getActionChoices("latex");
    const keyChoice = choices.find((c) => c.value === "key-default");
    expect(keyChoice?.label).toBe("Citation key (LaTeX)");
  });

  it("should have 7 choices", () => {
    expect(getActionChoices()).toHaveLength(7);
  });
});

// Note: runActionMenu and runStyleSelectPrompt are now using React Ink and require different testing approach.
// The integration tests (e2e) cover the end-to-end behavior.
// Unit tests for the React Ink components should use ink-testing-library if needed.
