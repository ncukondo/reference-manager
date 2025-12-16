import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { list } from "./list.js";

describe("list command", () => {
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

  it("should list all references in pretty format by default", async () => {
    const items: CslItem[] = [
      {
        id: "Smith-2020",
        type: "article",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2020]] },
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
    ];

    await list(items, {});

    const output = mockStdout.join("");
    expect(output).toContain("[Smith-2020] Test Article");
    expect(output).toContain("Authors: Smith, J.");
    expect(output).toContain("Year: 2020");
  });

  it("should list all references in JSON format", async () => {
    const items: CslItem[] = [
      {
        id: "Smith-2020",
        type: "article",
        title: "Test Article",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
    ];

    await list(items, { json: true });

    const output = mockStdout.join("");
    const parsed = JSON.parse(output);
    expect(parsed).toEqual(items);
  });

  it("should list only IDs when ids-only option is set", async () => {
    const items: CslItem[] = [
      {
        id: "Smith-2020",
        type: "article",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
      {
        id: "Jones-2021",
        type: "book",
        custom: {
          uuid: "660e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
    ];

    await list(items, { idsOnly: true });

    const output = mockStdout.join("");
    expect(output).toBe("Smith-2020\nJones-2021\n");
  });

  it("should list only UUIDs when uuid option is set", async () => {
    const items: CslItem[] = [
      {
        id: "Smith-2020",
        type: "article",
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
      {
        id: "Jones-2021",
        type: "book",
        custom: {
          uuid: "660e8400-e29b-41d4-a716-446655440001",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
    ];

    await list(items, { uuid: true });

    const output = mockStdout.join("");
    expect(output).toBe(
      "550e8400-e29b-41d4-a716-446655440000\n660e8400-e29b-41d4-a716-446655440001\n"
    );
  });

  it("should list in BibTeX format when bibtex option is set", async () => {
    const items: CslItem[] = [
      {
        id: "Smith-2020",
        type: "article",
        title: "Test Article",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2020]] },
        custom: {
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          created_at: "2024-01-01T00:00:00.000Z",
          timestamp: "2024-01-01T00:00:00.000Z",
        },
      },
    ];

    await list(items, { bibtex: true });

    const output = mockStdout.join("");
    expect(output).toContain("@article{Smith-2020,");
    expect(output).toContain("title = {Test Article}");
    expect(output).toContain("author = {Smith, John}");
  });

  it("should handle empty library", async () => {
    await list([], {});

    const output = mockStdout.join("");
    expect(output).toBe("");
  });

  it("should throw error for conflicting output options", async () => {
    const items: CslItem[] = [];

    await expect(list(items, { json: true, bibtex: true })).rejects.toThrow(
      "Multiple output formats specified. Only one of --json, --ids-only, --uuid, --bibtex can be used."
    );

    await expect(list(items, { idsOnly: true, uuid: true })).rejects.toThrow(
      "Multiple output formats specified. Only one of --json, --ids-only, --uuid, --bibtex can be used."
    );
  });
});
