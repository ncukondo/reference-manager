import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fs for custom style listing
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readdirSync: vi.fn(),
}));

// Mock ink to prevent actual rendering
vi.mock("ink", () => ({
  render: vi.fn(() => ({
    unmount: vi.fn(),
    waitUntilExit: () => Promise.resolve(),
  })),
}));

import * as fs from "node:fs";
import * as path from "node:path";
import { buildStyleChoices, listCustomStyles } from "./style-select.js";

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
      label: "apa (default)",
      value: "apa",
    });
    expect(choices[1]).toEqual({
      label: "vancouver",
      value: "vancouver",
    });
    expect(choices[2]).toEqual({
      label: "harvard",
      value: "harvard",
    });
  });

  it("marks non-apa style as default", () => {
    const choices = buildStyleChoices([], "vancouver");

    expect(choices[0]).toEqual({
      label: "vancouver (default)",
      value: "vancouver",
    });
    expect(choices[1]).toEqual({
      label: "apa",
      value: "apa",
    });
  });

  it("includes custom styles after built-in styles", () => {
    const choices = buildStyleChoices(["chicago", "ieee"], "apa");

    // Built-in styles first
    expect(choices[0].value).toBe("apa");
    expect(choices[1].value).toBe("vancouver");
    expect(choices[2].value).toBe("harvard");

    // Custom styles after
    expect(choices[3]).toEqual({
      label: "chicago",
      value: "chicago",
    });
    expect(choices[4]).toEqual({
      label: "ieee",
      value: "ieee",
    });
  });

  it("marks custom style as default if specified", () => {
    const choices = buildStyleChoices(["chicago"], "chicago");

    expect(choices[0]).toEqual({
      label: "chicago (default)",
      value: "chicago",
    });
    // Built-in styles follow
    expect(choices[1].value).toBe("apa");
  });

  it("excludes built-in styles from custom list to avoid duplicates", () => {
    const choices = buildStyleChoices(["apa", "chicago"], "apa");

    // Should not have apa twice
    const apaChoices = choices.filter((c) => c.value === "apa");
    expect(apaChoices).toHaveLength(1);
  });
});

// Note: runStyleSelect is now using React Ink and requires different testing approach.
// The integration tests cover the end-to-end behavior.
// Unit tests for the React Ink components should use ink-testing-library if needed.
