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

import {
  ACTION_CHOICES,
  type ActionType,
  OUTPUT_FORMAT_CHOICES,
  STYLE_CHOICES,
  generateOutput,
  getActionChoices,
  isSideEffectAction,
} from "./action-menu.js";

describe("ACTION_CHOICES", () => {
  it("has all required action types", () => {
    const actionTypes = ACTION_CHOICES.map((c) => c.value);

    expect(actionTypes).toContain("key-default");
    expect(actionTypes).toContain("cite-default");
    expect(actionTypes).toContain("cite-choose");
    expect(actionTypes).toContain("output-format");
    expect(actionTypes).toContain("cancel");
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

describe("OUTPUT_FORMAT_CHOICES", () => {
  it("has IDs, CSL-JSON, BibTeX, YAML, Cancel options", () => {
    const values = OUTPUT_FORMAT_CHOICES.map((c) => c.value);
    expect(values).toContain("output-ids");
    expect(values).toContain("output-csl-json");
    expect(values).toContain("output-bibtex");
    expect(values).toContain("output-yaml");
    expect(values).toContain("cancel");
  });

  it("has 5 choices", () => {
    expect(OUTPUT_FORMAT_CHOICES).toHaveLength(5);
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
    const output = generateOutput("key-default", mockItems, { defaultKeyFormat: "pandoc" });
    expect(output).toBe("@ref1; @ref2");
  });

  it("should generate latex citation keys when defaultKeyFormat is latex", () => {
    const output = generateOutput("key-default", mockItems, { defaultKeyFormat: "latex" });
    expect(output).toBe("\\cite{ref1,ref2}");
  });

  it("should generate output-ids correctly", () => {
    const output = generateOutput("output-ids", mockItems);
    expect(output).toBe("ref1\nref2");
  });

  it("should generate YAML output", () => {
    const output = generateOutput("output-yaml", mockItems);
    expect(output).toContain("id: ref1");
    expect(output).toContain("id: ref2");
    expect(output).toContain("type: article-journal");
  });

  it("should use default style from config for cite-default", () => {
    const output = generateOutput("cite-default", mockItems, { defaultStyle: "vancouver" });
    expect(output).toContain("[vancouver]");
  });

  it("should use apa as default style when not specified", () => {
    const output = generateOutput("cite-default", mockItems);
    expect(output).toContain("[apa]");
  });

  it("should return empty string for cancel", () => {
    const output = generateOutput("cancel", mockItems);
    expect(output).toBe("");
  });

  it("should return empty string for side-effect actions", () => {
    const sideEffectActions: ActionType[] = [
      "open-url",
      "open-fulltext",
      "manage-attachments",
      "edit",
      "remove",
    ];
    for (const action of sideEffectActions) {
      const output = generateOutput(action, mockItems);
      expect(output).toBe("");
    }
  });
});

describe("getActionChoices", () => {
  describe("single entry (count=1)", () => {
    it("should include all single-entry actions", () => {
      const choices = getActionChoices(1);
      const values = choices.map((c) => c.value);

      expect(values).toContain("key-default");
      expect(values).toContain("cite-default");
      expect(values).toContain("cite-choose");
      expect(values).toContain("open-url");
      expect(values).toContain("open-fulltext");
      expect(values).toContain("manage-attachments");
      expect(values).toContain("edit");
      expect(values).toContain("output-format");
      expect(values).toContain("remove");
      expect(values).toContain("cancel");
    });

    it("should have 10 choices for single entry", () => {
      expect(getActionChoices(1)).toHaveLength(10);
    });

    it("should show singular labels for single entry", () => {
      const choices = getActionChoices(1);
      const editChoice = choices.find((c) => c.value === "edit");
      expect(editChoice?.label).toBe("Edit reference");
    });

    it("should return Pandoc label by default", () => {
      const choices = getActionChoices(1);
      const keyChoice = choices.find((c) => c.value === "key-default");
      expect(keyChoice?.label).toBe("Citation key (Pandoc)");
    });

    it("should return LaTeX label when defaultKeyFormat is latex", () => {
      const choices = getActionChoices(1, { defaultKeyFormat: "latex" });
      const keyChoice = choices.find((c) => c.value === "key-default");
      expect(keyChoice?.label).toBe("Citation key (LaTeX)");
    });
  });

  describe("multiple entries (count>1)", () => {
    it("should exclude single-entry-only actions", () => {
      const choices = getActionChoices(3);
      const values = choices.map((c) => c.value);

      expect(values).not.toContain("open-url");
      expect(values).not.toContain("open-fulltext");
      expect(values).not.toContain("manage-attachments");
    });

    it("should include multi-entry actions", () => {
      const choices = getActionChoices(3);
      const values = choices.map((c) => c.value);

      expect(values).toContain("key-default");
      expect(values).toContain("cite-default");
      expect(values).toContain("cite-choose");
      expect(values).toContain("edit");
      expect(values).toContain("output-format");
      expect(values).toContain("remove");
      expect(values).toContain("cancel");
    });

    it("should have 7 choices for multiple entries", () => {
      expect(getActionChoices(3)).toHaveLength(7);
    });

    it("should show plural labels for multiple entries", () => {
      const choices = getActionChoices(3);
      const editChoice = choices.find((c) => c.value === "edit");
      expect(editChoice?.label).toBe("Edit references");

      const keyChoice = choices.find((c) => c.value === "key-default");
      expect(keyChoice?.label).toBe("Citation keys (Pandoc)");
    });

    it("should use config for key format label with plural", () => {
      const choices = getActionChoices(3, { defaultKeyFormat: "latex" });
      const keyChoice = choices.find((c) => c.value === "key-default");
      expect(keyChoice?.label).toBe("Citation keys (LaTeX)");
    });
  });
});

describe("isSideEffectAction", () => {
  it("should identify side-effect actions", () => {
    expect(isSideEffectAction("open-url")).toBe(true);
    expect(isSideEffectAction("open-fulltext")).toBe(true);
    expect(isSideEffectAction("manage-attachments")).toBe(true);
    expect(isSideEffectAction("edit")).toBe(true);
    expect(isSideEffectAction("remove")).toBe(true);
  });

  it("should return false for output actions", () => {
    expect(isSideEffectAction("key-default")).toBe(false);
    expect(isSideEffectAction("cite-default")).toBe(false);
    expect(isSideEffectAction("cite-choose")).toBe(false);
    expect(isSideEffectAction("output-format")).toBe(false);
    expect(isSideEffectAction("cancel")).toBe(false);
  });
});

// Note: runActionMenu and runStyleSelectPrompt are now using React Ink and require different testing approach.
// The integration tests (e2e) cover the end-to-end behavior.
// Unit tests for the React Ink components should use ink-testing-library if needed.
