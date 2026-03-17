import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildNoConverterHints, resolveConverter } from "./converter-resolver.js";
import type { PdfConverter } from "./pdf-converter.js";
import type { CustomConverterConfig } from "./pdf-converter.js";

vi.mock("./builtin-converters.js", () => ({
  getBuiltinConverter: vi.fn(),
  BUILTIN_CONVERTER_NAMES: ["marker", "docling", "mineru", "pymupdf"],
  BUILTIN_CONVERTER_INFO: {
    marker: { install: "pip install marker-pdf", description: "GPU recommended, best quality" },
    docling: { install: "pip install docling", description: "CPU OK, good tables" },
    mineru: { install: "pip install mineru[all]", description: "GPU recommended, fastest" },
    pymupdf: { install: "pip install pymupdf4llm", description: "CPU only, lightweight" },
  },
}));

vi.mock("./custom-converter.js", () => ({
  CustomPdfConverter: vi.fn(),
}));

import { getBuiltinConverter } from "./builtin-converters.js";
import { CustomPdfConverter } from "./custom-converter.js";

const mockedGetBuiltinConverter = vi.mocked(getBuiltinConverter);
const MockedCustomPdfConverter = vi.mocked(CustomPdfConverter);

function createMockConverter(name: string, available: boolean): PdfConverter {
  return {
    name,
    isAvailable: vi.fn().mockResolvedValue(available),
    convert: vi.fn(),
  };
}

describe("resolveConverter", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("auto mode", () => {
    it("should return first available from priority list", async () => {
      const markerConverter = createMockConverter("marker", true);
      mockedGetBuiltinConverter.mockImplementation((name) => {
        if (name === "marker") return markerConverter;
        return undefined;
      });

      const result = await resolveConverter("auto", {
        priority: ["marker", "docling"],
        customConverters: {},
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.converter.name).toBe("marker");
      }
    });

    it("should skip unavailable converters", async () => {
      const markerConverter = createMockConverter("marker", false);
      const doclingConverter = createMockConverter("docling", true);
      mockedGetBuiltinConverter.mockImplementation((name) => {
        if (name === "marker") return markerConverter;
        if (name === "docling") return doclingConverter;
        return undefined;
      });

      const result = await resolveConverter("auto", {
        priority: ["marker", "docling"],
        customConverters: {},
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.converter.name).toBe("docling");
      }
    });

    it("should prefer custom converter over built-in with same name", async () => {
      const customConfig: CustomConverterConfig = {
        command: "my-marker {input} {output}",
      };
      const customConverter = createMockConverter("marker", true);
      MockedCustomPdfConverter.mockReturnValue(customConverter as unknown as CustomPdfConverter);

      const result = await resolveConverter("auto", {
        priority: ["marker"],
        customConverters: { marker: customConfig },
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.converter.name).toBe("marker");
      }
      expect(MockedCustomPdfConverter).toHaveBeenCalledWith("marker", customConfig);
      expect(mockedGetBuiltinConverter).not.toHaveBeenCalled();
    });

    it("should return error when no converter available", async () => {
      mockedGetBuiltinConverter.mockImplementation((name) => {
        return createMockConverter(name, false);
      });

      const result = await resolveConverter("auto", {
        priority: ["marker", "docling", "mineru", "pymupdf"],
        customConverters: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("no-converter");
      }
    });
  });

  describe("explicit name", () => {
    it("should return specific converter", async () => {
      const markerConverter = createMockConverter("marker", true);
      mockedGetBuiltinConverter.mockReturnValue(markerConverter);

      const result = await resolveConverter("marker", {
        priority: ["marker"],
        customConverters: {},
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.converter.name).toBe("marker");
      }
    });

    it("should return not-installed error when specific converter unavailable", async () => {
      const markerConverter = createMockConverter("marker", false);
      mockedGetBuiltinConverter.mockReturnValue(markerConverter);

      const result = await resolveConverter("marker", {
        priority: ["marker"],
        customConverters: {},
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("not-installed");
      }
    });
  });
});

describe("buildNoConverterHints", () => {
  it("should include install instructions", () => {
    const hints = buildNoConverterHints(["marker", "docling"]);
    expect(hints).toContain("marker");
    expect(hints).toContain("pip install marker-pdf");
    expect(hints).toContain("docling");
    expect(hints).toContain("pip install docling");
  });
});
