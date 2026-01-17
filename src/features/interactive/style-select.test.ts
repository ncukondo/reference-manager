import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock enquirer
const mockRun = vi.fn();
const MockSelect = vi.fn().mockImplementation(() => ({
  run: mockRun,
}));

vi.mock("enquirer", () => ({
  default: {
    Select: MockSelect,
  },
}));

// Mock fs for custom style listing
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

import * as fs from "node:fs";
import * as path from "node:path";
import {
  type StyleSelectOptions,
  buildStyleChoices,
  listCustomStyles,
  runStyleSelect,
} from "./style-select.js";

describe("listCustomStyles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when cslDirectory is undefined", () => {
    const result = listCustomStyles(undefined);
    expect(result).toEqual([]);
  });

  it("returns empty array when cslDirectory does not exist", () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = listCustomStyles("/nonexistent/dir");
    expect(result).toEqual([]);
  });

  it("lists .csl files from single directory", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      "chicago.csl",
      "ieee.csl",
      "readme.txt",
    ] as unknown as string[]);

    const result = listCustomStyles("/styles");
    expect(result).toEqual(["chicago", "ieee"]);
  });

  it("lists .csl files from multiple directories", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync)
      .mockReturnValueOnce(["chicago.csl"] as unknown as string[])
      .mockReturnValueOnce(["ieee.csl", "mla.csl"] as unknown as string[]);

    const result = listCustomStyles(["/styles1", "/styles2"]);
    expect(result).toEqual(["chicago", "ieee", "mla"]);
  });

  it("deduplicates styles from multiple directories", () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync)
      .mockReturnValueOnce(["chicago.csl", "ieee.csl"] as unknown as string[])
      .mockReturnValueOnce(["ieee.csl", "mla.csl"] as unknown as string[]);

    const result = listCustomStyles(["/styles1", "/styles2"]);
    expect(result).toEqual(["chicago", "ieee", "mla"]);
  });

  it("expands tilde in directory path", () => {
    const originalHome = process.env.HOME;
    process.env.HOME = "/home/user";

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(["custom.csl"] as unknown as string[]);

    const result = listCustomStyles("~/styles");

    expect(fs.existsSync).toHaveBeenCalledWith(path.join("/home/user", "styles"));
    expect(result).toEqual(["custom"]);

    process.env.HOME = originalHome;
  });
});

describe("buildStyleChoices", () => {
  it("returns built-in styles with default first", () => {
    const choices = buildStyleChoices([], "apa");

    expect(choices[0]).toEqual({
      name: "apa",
      message: "apa (default)",
      value: "apa",
    });
    expect(choices[1]).toEqual({
      name: "vancouver",
      message: "vancouver",
      value: "vancouver",
    });
    expect(choices[2]).toEqual({
      name: "harvard",
      message: "harvard",
      value: "harvard",
    });
  });

  it("marks non-apa style as default", () => {
    const choices = buildStyleChoices([], "vancouver");

    expect(choices[0]).toEqual({
      name: "vancouver",
      message: "vancouver (default)",
      value: "vancouver",
    });
    expect(choices[1]).toEqual({
      name: "apa",
      message: "apa",
      value: "apa",
    });
  });

  it("includes custom styles after built-in styles", () => {
    const choices = buildStyleChoices(["chicago", "ieee"], "apa");

    // Built-in styles first
    expect(choices[0].name).toBe("apa");
    expect(choices[1].name).toBe("vancouver");
    expect(choices[2].name).toBe("harvard");

    // Custom styles after
    expect(choices[3]).toEqual({
      name: "chicago",
      message: "chicago",
      value: "chicago",
    });
    expect(choices[4]).toEqual({
      name: "ieee",
      message: "ieee",
      value: "ieee",
    });
  });

  it("marks custom style as default if specified", () => {
    const choices = buildStyleChoices(["chicago"], "chicago");

    expect(choices[0]).toEqual({
      name: "chicago",
      message: "chicago (default)",
      value: "chicago",
    });
    // Built-in styles follow
    expect(choices[1].name).toBe("apa");
  });

  it("excludes built-in styles from custom list to avoid duplicates", () => {
    const choices = buildStyleChoices(["apa", "chicago"], "apa");

    // Should not have apa twice
    const apaChoices = choices.filter((c) => c.name === "apa");
    expect(apaChoices).toHaveLength(1);
  });
});

describe("runStyleSelect", () => {
  const defaultOptions: StyleSelectOptions = {
    defaultStyle: "apa",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.existsSync).mockReturnValue(false);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns selected style", async () => {
    mockRun.mockResolvedValueOnce("vancouver");

    const result = await runStyleSelect(defaultOptions);

    expect(result.style).toBe("vancouver");
    expect(result.cancelled).toBe(false);
  });

  it("returns cancelled when user cancels", async () => {
    mockRun.mockRejectedValueOnce("");

    const result = await runStyleSelect(defaultOptions);

    expect(result.cancelled).toBe(true);
    expect(result.style).toBeUndefined();
  });

  it("includes custom styles from cslDirectory", async () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue(["chicago.csl"] as unknown as string[]);
    mockRun.mockResolvedValueOnce("chicago");

    const result = await runStyleSelect({
      ...defaultOptions,
      cslDirectory: "/styles",
    });

    expect(result.style).toBe("chicago");

    // Verify choices were built with custom styles
    const constructorCall = MockSelect.mock.calls[0][0];
    const chicagoChoice = constructorCall.choices.find(
      (c: { name: string }) => c.name === "chicago"
    );
    expect(chicagoChoice).toBeDefined();
  });

  it("passes correct prompt message", async () => {
    mockRun.mockResolvedValueOnce("apa");

    await runStyleSelect(defaultOptions);

    const constructorCall = MockSelect.mock.calls[0][0];
    expect(constructorCall.message).toBe("Select citation style:");
  });

  it("propagates non-cancel errors", async () => {
    const error = new Error("Unexpected error");
    mockRun.mockRejectedValueOnce(error);

    await expect(runStyleSelect(defaultOptions)).rejects.toThrow("Unexpected error");
  });
});
