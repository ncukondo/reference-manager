import type { CslItem } from "@customTypes/csl-json.js";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock enquirer before importing action-menu
const mockRun = vi.fn();
const MockSelect = vi.fn().mockImplementation(() => ({
  run: mockRun,
}));

vi.mock("enquirer", () => ({
  default: {
    Select: MockSelect,
  },
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
  STYLE_CHOICES,
  runActionMenu,
  runStyleSelectPrompt,
} from "./action-menu.js";

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
});

describe("STYLE_CHOICES", () => {
  it("includes builtin styles", () => {
    const styleValues = STYLE_CHOICES.map((c) => c.value);

    // These should match BUILTIN_STYLES from config/csl-styles.ts
    expect(styleValues).toContain("apa");
    expect(styleValues).toContain("vancouver");
    expect(styleValues).toContain("harvard");
  });
});

describe("runActionMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows menu with correct count in message", async () => {
    const items = [createMockItem({ id: "ref-001" }), createMockItem({ id: "ref-002" })];

    mockRun.mockResolvedValueOnce("cancel");

    await runActionMenu(items);

    expect(MockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Action for 2 selected references:",
      })
    );
  });

  it("shows singular message for 1 item", async () => {
    const items = [createMockItem({ id: "ref-001" })];

    mockRun.mockResolvedValueOnce("cancel");

    await runActionMenu(items);

    expect(MockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Action for 1 selected reference:",
      })
    );
  });

  it("returns output-ids action with IDs", async () => {
    const items = [createMockItem({ id: "ref-001" }), createMockItem({ id: "ref-002" })];

    mockRun.mockResolvedValueOnce("output-ids");

    const result = await runActionMenu(items);

    expect(result.action).toBe("output-ids");
    expect(result.output).toBe("ref-001\nref-002");
    expect(result.cancelled).toBe(false);
  });

  it("returns output-csl-json action with JSON", async () => {
    const items = [createMockItem({ id: "ref-001", title: "Test Title" })];

    mockRun.mockResolvedValueOnce("output-csl-json");

    const result = await runActionMenu(items);

    expect(result.action).toBe("output-csl-json");
    expect(result.output).toContain('"id": "ref-001"');
    expect(result.output).toContain('"title": "Test Title"');
    expect(result.cancelled).toBe(false);
  });

  it("returns output-bibtex action with BibTeX", async () => {
    const items = [createMockItem({ id: "ref-001" })];

    mockRun.mockResolvedValueOnce("output-bibtex");

    const result = await runActionMenu(items);

    expect(result.action).toBe("output-bibtex");
    expect(result.output).toContain("@article{ref-001}");
    expect(result.cancelled).toBe(false);
  });

  it("returns cite-apa action with APA citation", async () => {
    const items = [createMockItem({ id: "ref-001", title: "Test Title" })];

    mockRun.mockResolvedValueOnce("cite-apa");

    const result = await runActionMenu(items);

    expect(result.action).toBe("cite-apa");
    expect(result.output).toContain("[apa]");
    expect(result.cancelled).toBe(false);
  });

  it("returns cancelled when cancel is selected", async () => {
    const items = [createMockItem({ id: "ref-001" })];

    mockRun.mockResolvedValueOnce("cancel");

    const result = await runActionMenu(items);

    expect(result.action).toBe("cancel");
    expect(result.output).toBe("");
    expect(result.cancelled).toBe(true);
  });

  it("returns cancelled when user presses Escape", async () => {
    const items = [createMockItem({ id: "ref-001" })];

    // Enquirer throws empty string on cancel
    mockRun.mockRejectedValueOnce("");

    const result = await runActionMenu(items);

    expect(result.cancelled).toBe(true);
    expect(result.output).toBe("");
  });

  it("propagates non-cancel errors", async () => {
    const items = [createMockItem({ id: "ref-001" })];

    const error = new Error("Unexpected error");
    mockRun.mockRejectedValueOnce(error);

    await expect(runActionMenu(items)).rejects.toBe(error);
  });
});

describe("runStyleSelectPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows style selection prompt", async () => {
    mockRun.mockResolvedValueOnce("vancouver");

    await runStyleSelectPrompt();

    expect(MockSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Select citation style:",
      })
    );
  });

  it("returns selected style", async () => {
    mockRun.mockResolvedValueOnce("vancouver");

    const result = await runStyleSelectPrompt();

    expect(result.style).toBe("vancouver");
    expect(result.cancelled).toBe(false);
  });

  it("returns cancelled when user presses Escape", async () => {
    mockRun.mockRejectedValueOnce("");

    const result = await runStyleSelectPrompt();

    expect(result.cancelled).toBe(true);
    expect(result.style).toBeUndefined();
  });
});

describe("runActionMenu with cite-choose", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prompts for style and returns citation with chosen style", async () => {
    const items = [createMockItem({ id: "ref-001", title: "Test Title" })];

    // First call: action menu returns cite-choose
    // Second call: style select returns vancouver
    mockRun.mockResolvedValueOnce("cite-choose").mockResolvedValueOnce("vancouver");

    const result = await runActionMenu(items);

    expect(result.action).toBe("cite-choose");
    expect(result.output).toContain("[vancouver]");
    expect(result.cancelled).toBe(false);
  });

  it("returns cancelled when style selection is cancelled", async () => {
    const items = [createMockItem({ id: "ref-001" })];

    // First call: action menu returns cite-choose
    // Second call: style select is cancelled
    mockRun.mockResolvedValueOnce("cite-choose").mockRejectedValueOnce("");

    const result = await runActionMenu(items);

    expect(result.cancelled).toBe(true);
    expect(result.output).toBe("");
  });
});
