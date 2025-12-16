import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { search } from "./search.js";

describe("search command", () => {
  let mockStdout: string[];
  let mockStderr: string[];
  let originalStdoutWrite: typeof process.stdout.write;
  let originalStderrWrite: typeof process.stderr.write;

  beforeEach(() => {
    mockStdout = [];
    mockStderr = [];

    // Mock stdout/stderr
    originalStdoutWrite = process.stdout.write;
    originalStderrWrite = process.stderr.write;

    // @ts-expect-error - mocking stdout.write
    process.stdout.write = vi.fn((chunk: string) => {
      mockStdout.push(chunk);
      return true;
    });

    // @ts-expect-error - mocking stderr.write
    process.stderr.write = vi.fn((chunk: string) => {
      mockStderr.push(chunk);
      return true;
    });
  });

  afterEach(() => {
    process.stdout.write = originalStdoutWrite;
    process.stderr.write = originalStderrWrite;
  });

  const createItem = (id: string, title: string, authorFamily?: string): CslItem => ({
    id,
    type: "article",
    title,
    author: authorFamily ? [{ family: authorFamily, given: "John" }] : undefined,
    issued: { "date-parts": [[2020]] },
    custom: {
      uuid: `${id}-uuid`,
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-01-01T00:00:00.000Z",
    },
  });

  it("should search and return matching references", async () => {
    const items: CslItem[] = [
      createItem("Smith-2020", "Machine Learning", "Smith"),
      createItem("Jones-2021", "Deep Learning", "Jones"),
      createItem("Doe-2022", "Machine Vision", "Doe"),
    ];

    await search(items, "Machine", {});

    const output = mockStdout.join("");
    expect(output).toContain("Machine Learning");
    expect(output).toContain("Machine Vision");
    expect(output).not.toContain("Deep Learning");
  });

  it("should perform AND search with multiple tokens", async () => {
    const items: CslItem[] = [
      createItem("Smith-2020", "Machine Learning", "Smith"),
      createItem("Jones-2021", "Deep Learning", "Jones"),
      createItem("Smith-2022", "Machine Vision", "Smith"),
    ];

    await search(items, "Machine Smith", {});

    const output = mockStdout.join("");
    expect(output).toContain("Machine Learning");
    expect(output).toContain("Machine Vision");
    expect(output).not.toContain("Deep Learning");
  });

  it("should support field-specific search", async () => {
    const items: CslItem[] = [
      createItem("Smith-2020", "Machine Learning", "Smith"),
      createItem("Jones-2021", "Machine Vision", "Jones"),
    ];

    await search(items, "author:Smith", {});

    const output = mockStdout.join("");
    expect(output).toContain("Machine Learning");
    expect(output).not.toContain("Machine Vision");
  });

  it("should support JSON output format", async () => {
    const items: CslItem[] = [createItem("Smith-2020", "Machine Learning", "Smith")];

    await search(items, "Machine", { json: true });

    const output = mockStdout.join("");
    const parsed = JSON.parse(output);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("Smith-2020");
  });

  it("should return empty results when no matches", async () => {
    const items: CslItem[] = [createItem("Smith-2020", "Machine Learning", "Smith")];

    await search(items, "Nonexistent", {});

    const output = mockStdout.join("");
    expect(output).toBe("");
  });

  it("should support ids-only output format", async () => {
    const items: CslItem[] = [
      createItem("Smith-2020", "Machine Learning", "Smith"),
      createItem("Doe-2022", "Machine Vision", "Doe"),
    ];

    await search(items, "Machine", { idsOnly: true });

    const output = mockStdout.join("");
    // Results are sorted by year (descending), so Doe-2022 comes first
    expect(output).toBe("Doe-2022\nSmith-2020\n");
  });

  it("should throw error for conflicting output options", async () => {
    const items: CslItem[] = [];

    await expect(search(items, "test", { json: true, bibtex: true })).rejects.toThrow(
      "Multiple output formats specified"
    );
  });
});
