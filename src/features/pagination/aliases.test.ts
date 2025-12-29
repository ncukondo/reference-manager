/**
 * Tests for sort field alias resolver
 */

import { describe, expect, it } from "vitest";
import { resolveSortAlias } from "./aliases.js";

describe("resolveSortAlias", () => {
  it("should resolve 'pub' to 'published'", () => {
    expect(resolveSortAlias("pub")).toBe("published");
  });

  it("should resolve 'mod' to 'updated'", () => {
    expect(resolveSortAlias("mod")).toBe("updated");
  });

  it("should resolve 'add' to 'created'", () => {
    expect(resolveSortAlias("add")).toBe("created");
  });

  it("should resolve 'rel' to 'relevance'", () => {
    expect(resolveSortAlias("rel")).toBe("relevance");
  });

  it("should pass through valid sort fields unchanged", () => {
    expect(resolveSortAlias("created")).toBe("created");
    expect(resolveSortAlias("updated")).toBe("updated");
    expect(resolveSortAlias("published")).toBe("published");
    expect(resolveSortAlias("author")).toBe("author");
    expect(resolveSortAlias("title")).toBe("title");
    expect(resolveSortAlias("relevance")).toBe("relevance");
  });

  it("should throw error for unknown alias", () => {
    expect(() => resolveSortAlias("invalid")).toThrow("Unknown sort field: invalid");
    expect(() => resolveSortAlias("date")).toThrow("Unknown sort field: date");
  });
});
