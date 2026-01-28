import { describe, expect, it } from "vitest";
import { isEqual } from "./object";

describe("isEqual", () => {
  describe("primitives", () => {
    it("should return true for identical numbers", () => {
      expect(isEqual(1, 1)).toBe(true);
    });

    it("should return false for different numbers", () => {
      expect(isEqual(1, 2)).toBe(false);
    });

    it("should return true for identical strings", () => {
      expect(isEqual("hello", "hello")).toBe(true);
    });

    it("should return false for different strings", () => {
      expect(isEqual("hello", "world")).toBe(false);
    });

    it("should return true for identical booleans", () => {
      expect(isEqual(true, true)).toBe(true);
    });

    it("should return false for different types", () => {
      expect(isEqual(1, "1")).toBe(false);
      expect(isEqual(0, false)).toBe(false);
      expect(isEqual("", false)).toBe(false);
    });
  });

  describe("null/undefined", () => {
    it("should return true for null === null", () => {
      expect(isEqual(null, null)).toBe(true);
    });

    it("should return true for undefined === undefined", () => {
      expect(isEqual(undefined, undefined)).toBe(true);
    });

    it("should return false for null vs non-null", () => {
      expect(isEqual(null, 1)).toBe(false);
      expect(isEqual(1, null)).toBe(false);
    });

    it("should return false for undefined vs non-undefined", () => {
      expect(isEqual(undefined, 1)).toBe(false);
      expect(isEqual(1, undefined)).toBe(false);
    });

    it("should return false for null vs undefined (both nullish but a === b fails)", () => {
      // null == undefined is true but null === undefined is false
      // However isEqual(null, undefined) => a === b? no => a == null? yes, b == null? yes
      // Actually: a === b? false => a == null? true => b == null? true => doesn't return false
      // Falls through to typeof check: typeof null = "object", typeof undefined = "undefined" => false
      expect(isEqual(null, undefined)).toBe(false);
    });
  });

  describe("arrays", () => {
    it("should return true for identical flat arrays", () => {
      expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    });

    it("should return false for arrays with different lengths", () => {
      expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
    });

    it("should return false for arrays with different elements", () => {
      expect(isEqual([1, 2, 3], [1, 2, 4])).toBe(false);
    });

    it("should return true for nested arrays", () => {
      expect(isEqual([[1, 2], [3]], [[1, 2], [3]])).toBe(true);
    });

    it("should return false for different nested arrays", () => {
      expect(isEqual([[1, 2], [3]], [[1, 2], [4]])).toBe(false);
    });

    it("should return true for empty arrays", () => {
      expect(isEqual([], [])).toBe(true);
    });
  });

  describe("objects", () => {
    it("should return true for identical flat objects", () => {
      expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    it("should return false for objects with different keys", () => {
      expect(isEqual({ a: 1 }, { b: 1 })).toBe(false);
    });

    it("should return false for objects with different values", () => {
      expect(isEqual({ a: 1 }, { a: 2 })).toBe(false);
    });

    it("should return false for objects with different key counts", () => {
      expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
    });

    it("should return true for nested objects", () => {
      expect(isEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    });

    it("should return false for different nested objects", () => {
      expect(isEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false);
    });

    it("should return true for empty objects", () => {
      expect(isEqual({}, {})).toBe(true);
    });
  });

  describe("mixed structures", () => {
    it("should return true for objects containing arrays", () => {
      expect(isEqual({ a: [1, 2] }, { a: [1, 2] })).toBe(true);
    });

    it("should return false for objects with different array values", () => {
      expect(isEqual({ a: [1, 2] }, { a: [1, 3] })).toBe(false);
    });

    it("should return true for arrays containing objects", () => {
      expect(isEqual([{ a: 1 }], [{ a: 1 }])).toBe(true);
    });

    it("should return false for arrays with different object elements", () => {
      expect(isEqual([{ a: 1 }], [{ a: 2 }])).toBe(false);
    });
  });
});
