import { describe, expect, it } from "vitest";
import {
  BUILTIN_CONVERTER_INFO,
  BUILTIN_CONVERTER_NAMES,
  getBuiltinConverter,
} from "./builtin-converters.js";

describe("builtin converters", () => {
  describe("BUILTIN_CONVERTER_NAMES", () => {
    it("should contain marker, docling, mineru, pymupdf", () => {
      expect(BUILTIN_CONVERTER_NAMES).toEqual(["marker", "docling", "mineru", "pymupdf"]);
    });
  });

  describe("getBuiltinConverter", () => {
    it("should return a converter for each built-in name", () => {
      for (const name of BUILTIN_CONVERTER_NAMES) {
        const converter = getBuiltinConverter(name);
        expect(converter).toBeDefined();
        expect(converter?.name).toBe(name);
      }
    });

    it("should return undefined for unknown name", () => {
      const converter = getBuiltinConverter("unknown-tool");
      expect(converter).toBeUndefined();
    });

    it("should produce correct marker command", () => {
      const converter = getBuiltinConverter("marker");
      expect(converter).toBeDefined();
      expect(converter?.name).toBe("marker");
    });

    it("should produce correct docling command", () => {
      const converter = getBuiltinConverter("docling");
      expect(converter).toBeDefined();
      expect(converter?.name).toBe("docling");
    });

    it("should produce correct mineru command", () => {
      const converter = getBuiltinConverter("mineru");
      expect(converter).toBeDefined();
      expect(converter?.name).toBe("mineru");
    });

    it("should produce correct pymupdf command", () => {
      const converter = getBuiltinConverter("pymupdf");
      expect(converter).toBeDefined();
      expect(converter?.name).toBe("pymupdf");
    });
  });

  describe("BUILTIN_CONVERTER_INFO", () => {
    it("should have install instructions for each built-in", () => {
      for (const name of BUILTIN_CONVERTER_NAMES) {
        const info = BUILTIN_CONVERTER_INFO[name];
        expect(info).toBeDefined();
        expect(info?.install).toBeTruthy();
        expect(info?.description).toBeTruthy();
      }
    });
  });
});
