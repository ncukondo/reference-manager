import { describe, expect, it } from "vitest";
import {
  datePartsToIso,
  isoToDateParts,
  transformDateFromEdit,
  transformDateToEdit,
} from "./field-transformer.js";

describe("field-transformer", () => {
  describe("datePartsToIso", () => {
    it("converts full date to ISO string", () => {
      expect(datePartsToIso([[2024, 3, 15]])).toBe("2024-03-15");
    });

    it("converts year-month to ISO string", () => {
      expect(datePartsToIso([[2024, 3]])).toBe("2024-03");
    });

    it("converts year only to ISO string", () => {
      expect(datePartsToIso([[2024]])).toBe("2024");
    });

    it("handles single-digit month and day with zero padding", () => {
      expect(datePartsToIso([[2024, 1, 5]])).toBe("2024-01-05");
    });

    it("returns empty string for empty date-parts", () => {
      expect(datePartsToIso([])).toBe("");
    });
  });

  describe("isoToDateParts", () => {
    it("converts full ISO date to date-parts", () => {
      expect(isoToDateParts("2024-03-15")).toEqual([[2024, 3, 15]]);
    });

    it("converts year-month ISO date to date-parts", () => {
      expect(isoToDateParts("2024-03")).toEqual([[2024, 3]]);
    });

    it("converts year only to date-parts", () => {
      expect(isoToDateParts("2024")).toEqual([[2024]]);
    });

    it("handles zero-padded values correctly", () => {
      expect(isoToDateParts("2024-01-05")).toEqual([[2024, 1, 5]]);
    });
  });

  describe("transformDateToEdit", () => {
    it("transforms CSL date object to ISO string", () => {
      expect(transformDateToEdit({ "date-parts": [[2024, 3, 15]] })).toBe("2024-03-15");
    });

    it("returns undefined for missing date-parts", () => {
      expect(transformDateToEdit({})).toBeUndefined();
    });

    it("returns undefined for undefined input", () => {
      expect(transformDateToEdit(undefined as never)).toBeUndefined();
    });
  });

  describe("transformDateFromEdit", () => {
    it("transforms ISO string to CSL date object", () => {
      expect(transformDateFromEdit("2024-03-15")).toEqual({
        "date-parts": [[2024, 3, 15]],
      });
    });

    it("handles partial dates", () => {
      expect(transformDateFromEdit("2024-03")).toEqual({
        "date-parts": [[2024, 3]],
      });
    });
  });
});
