import { describe, expect, it } from "vitest";
import { validateCslItems, validateEditFormat, validateEditedItems } from "./edit-validator.js";

describe("validateEditFormat", () => {
  it("returns valid for valid dates", () => {
    const items = [
      { id: "test-2024", issued: "2024", accessed: "2024-03" },
      { id: "test-2025", issued: "2024-03-15" },
    ];
    const result = validateEditFormat(items);
    expect(result.valid).toBe(true);
    expect(result.errors.size).toBe(0);
  });

  it("returns errors for invalid date strings", () => {
    const items = [{ id: "test-2024", issued: "hello", accessed: "2024/03/15" }];
    const result = validateEditFormat(items);
    expect(result.valid).toBe(false);
    expect(result.errors.size).toBe(1);
    const errors = result.errors.get(0);
    expect(errors).toHaveLength(2);
    expect(errors?.[0]).toEqual({
      field: "issued",
      message: "Invalid date format (use YYYY, YYYY-MM, or YYYY-MM-DD)",
    });
    expect(errors?.[1]).toEqual({
      field: "accessed",
      message: "Invalid date format (use YYYY, YYYY-MM, or YYYY-MM-DD)",
    });
  });

  it("returns error for reversed date format", () => {
    const items = [{ id: "test-2024", issued: "03-2024" }];
    const result = validateEditFormat(items);
    expect(result.valid).toBe(false);
    expect(result.errors.get(0)?.[0]?.field).toBe("issued");
  });

  it("does not error on missing (undefined) date fields", () => {
    const items = [{ id: "test-2024", type: "article-journal" }];
    const result = validateEditFormat(items);
    expect(result.valid).toBe(true);
    expect(result.errors.size).toBe(0);
  });

  it("errors only on the invalid field when one date is valid and one is invalid", () => {
    const items = [{ id: "test-2024", issued: "hello", accessed: "2024-03" }];
    const result = validateEditFormat(items);
    expect(result.valid).toBe(false);
    const errors = result.errors.get(0);
    expect(errors).toHaveLength(1);
    expect(errors?.[0]?.field).toBe("issued");
  });

  it("tracks per-item errors correctly for multiple items", () => {
    const items = [
      { id: "valid-2024", issued: "2024-03-15" },
      { id: "invalid-2024", issued: "bad-date" },
      { id: "also-invalid", accessed: "nope" },
    ];
    const result = validateEditFormat(items);
    expect(result.valid).toBe(false);
    expect(result.errors.size).toBe(2);
    expect(result.errors.has(0)).toBe(false);
    expect(result.errors.get(1)?.[0]?.field).toBe("issued");
    expect(result.errors.get(2)?.[0]?.field).toBe("accessed");
  });

  it("does not error on non-string date values", () => {
    const items = [{ id: "test-2024", issued: { "date-parts": [[2024, 3, 15]] } }];
    const result = validateEditFormat(items as Record<string, unknown>[]);
    expect(result.valid).toBe(true);
    expect(result.errors.size).toBe(0);
  });
});

describe("validateCslItems", () => {
  it("returns schema error for type mismatch (author as string)", () => {
    const items = [{ id: "test-2024", type: "article-journal", author: "John" }];
    const result = validateCslItems(items);
    expect(result.valid).toBe(false);
    const errors = result.errors.get(0);
    expect(errors).toHaveLength(1);
    expect(errors?.[0]?.field).toBe("author");
    expect(errors?.[0]?.message).toContain("expected array");
  });

  it("returns schema error for missing required field (type)", () => {
    const items = [{ id: "test-2024" }];
    const result = validateCslItems(items);
    expect(result.valid).toBe(false);
    const errors = result.errors.get(0);
    expect(errors).toHaveLength(1);
    expect(errors?.[0]?.field).toBe("type");
    expect(errors?.[0]?.message).toContain("expected string");
  });

  it("returns correct per-item errors for mixed valid/invalid items", () => {
    const items = [
      { id: "valid-2024", type: "article-journal" },
      { id: "invalid-2024", type: "article-journal", author: "bad" },
    ];
    const result = validateCslItems(items);
    expect(result.valid).toBe(false);
    expect(result.errors.has(0)).toBe(false);
    expect(result.errors.has(1)).toBe(true);
  });

  it("transforms date strings before schema validation", () => {
    const items = [{ id: "test-2024", type: "article-journal", issued: "2024-03-15" }];
    const result = validateCslItems(items);
    expect(result.valid).toBe(true);
    expect(result.errors.size).toBe(0);
  });

  it("returns valid for fully correct items", () => {
    const items = [{ id: "test-2024", type: "article-journal", title: "A Test" }];
    const result = validateCslItems(items);
    expect(result.valid).toBe(true);
    expect(result.errors.size).toBe(0);
  });
});

describe("validateEditedItems", () => {
  it("short-circuits on Stage 1 failure (returns only edit-format errors)", () => {
    const items = [{ id: "test-2024", type: "article-journal", issued: "bad", author: "John" }];
    const result = validateEditedItems(items);
    expect(result.valid).toBe(false);
    const errors = result.errors.get(0);
    // Only edit-format error (issued), not schema error (author)
    expect(errors).toHaveLength(1);
    expect(errors?.[0]?.field).toBe("issued");
  });

  it("runs Stage 2 when Stage 1 passes", () => {
    const items = [{ id: "test-2024", type: "article-journal", author: "John" }];
    const result = validateEditedItems(items);
    expect(result.valid).toBe(false);
    const errors = result.errors.get(0);
    expect(errors?.[0]?.field).toBe("author");
  });

  it("returns valid when both stages pass", () => {
    const items = [{ id: "test-2024", type: "article-journal", issued: "2024-03" }];
    const result = validateEditedItems(items);
    expect(result.valid).toBe(true);
    expect(result.errors.size).toBe(0);
  });
});
