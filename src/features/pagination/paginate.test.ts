/**
 * Tests for pagination applier
 */

import { describe, expect, it } from "vitest";
import { paginate } from "./paginate.js";

describe("paginate", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

  describe("limit", () => {
    it("should return first N items when limit is specified", () => {
      const result = paginate(items, { limit: 3 });
      expect(result.items).toEqual(["a", "b", "c"]);
    });

    it("should return all items when limit is 0 (unlimited)", () => {
      const result = paginate(items, { limit: 0 });
      expect(result.items).toEqual(items);
    });

    it("should return all items when limit is undefined", () => {
      const result = paginate(items, {});
      expect(result.items).toEqual(items);
    });

    it("should return all items when limit exceeds total", () => {
      const result = paginate(items, { limit: 100 });
      expect(result.items).toEqual(items);
    });
  });

  describe("offset", () => {
    it("should skip first N items when offset is specified", () => {
      const result = paginate(items, { offset: 3 });
      expect(result.items).toEqual(["d", "e", "f", "g", "h", "i", "j"]);
    });

    it("should return empty array when offset equals total", () => {
      const result = paginate(items, { offset: 10 });
      expect(result.items).toEqual([]);
    });

    it("should return empty array when offset exceeds total", () => {
      const result = paginate(items, { offset: 100 });
      expect(result.items).toEqual([]);
    });

    it("should skip 0 items when offset is 0", () => {
      const result = paginate(items, { offset: 0 });
      expect(result.items).toEqual(items);
    });
  });

  describe("limit and offset combined", () => {
    it("should apply offset then limit", () => {
      const result = paginate(items, { limit: 3, offset: 2 });
      expect(result.items).toEqual(["c", "d", "e"]);
    });

    it("should return remaining items when limit exceeds remaining", () => {
      const result = paginate(items, { limit: 5, offset: 7 });
      expect(result.items).toEqual(["h", "i", "j"]);
    });
  });

  describe("nextOffset", () => {
    it("should return next offset when more items available", () => {
      const result = paginate(items, { limit: 3, offset: 0 });
      expect(result.nextOffset).toBe(3);
    });

    it("should return null when no more items available", () => {
      const result = paginate(items, { limit: 3, offset: 7 });
      expect(result.nextOffset).toBeNull();
    });

    it("should return null when limit is 0 (unlimited)", () => {
      const result = paginate(items, { limit: 0, offset: 0 });
      expect(result.nextOffset).toBeNull();
    });

    it("should return null when limit is undefined", () => {
      const result = paginate(items, { offset: 0 });
      expect(result.nextOffset).toBeNull();
    });

    it("should return null when offset exceeds total", () => {
      const result = paginate(items, { limit: 10, offset: 100 });
      expect(result.nextOffset).toBeNull();
    });

    it("should calculate correct nextOffset for pagination", () => {
      // Page 1
      const page1 = paginate(items, { limit: 3, offset: 0 });
      expect(page1.nextOffset).toBe(3);

      // Page 2
      const page2 = paginate(items, { limit: 3, offset: 3 });
      expect(page2.nextOffset).toBe(6);

      // Page 3
      const page3 = paginate(items, { limit: 3, offset: 6 });
      expect(page3.nextOffset).toBe(9);

      // Page 4 (last page, 1 item)
      const page4 = paginate(items, { limit: 3, offset: 9 });
      expect(page4.items).toEqual(["j"]);
      expect(page4.nextOffset).toBeNull();
    });
  });

  describe("empty input", () => {
    it("should return empty result for empty array", () => {
      const result = paginate([], { limit: 10 });
      expect(result.items).toEqual([]);
      expect(result.nextOffset).toBeNull();
    });
  });

  describe("immutability", () => {
    it("should not mutate the original array", () => {
      const original = ["a", "b", "c"];
      const copy = [...original];
      paginate(original, { limit: 1, offset: 1 });
      expect(original).toEqual(copy);
    });
  });
});
