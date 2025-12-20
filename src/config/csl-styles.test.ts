import * as fs from "node:fs";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BUILTIN_STYLES, isBuiltinStyle, loadCSLStyleFile, resolveStyle } from "./csl-styles";

// Mock fs module for testing file operations
vi.mock("node:fs");

describe("CSL Style Management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("BUILTIN_STYLES", () => {
    it("should include apa as default style", () => {
      expect(BUILTIN_STYLES).toContain("apa");
    });

    it("should include vancouver style", () => {
      expect(BUILTIN_STYLES).toContain("vancouver");
    });

    it("should include harvard style", () => {
      expect(BUILTIN_STYLES).toContain("harvard");
    });

    it("should have exactly 3 built-in styles", () => {
      expect(BUILTIN_STYLES).toHaveLength(3);
    });
  });

  describe("isBuiltinStyle", () => {
    it("should return true for apa", () => {
      expect(isBuiltinStyle("apa")).toBe(true);
    });

    it("should return true for vancouver", () => {
      expect(isBuiltinStyle("vancouver")).toBe(true);
    });

    it("should return true for harvard", () => {
      expect(isBuiltinStyle("harvard")).toBe(true);
    });

    it("should return false for unknown style", () => {
      expect(isBuiltinStyle("nature")).toBe(false);
    });

    it("should return false for chicago (not built-in)", () => {
      expect(isBuiltinStyle("chicago")).toBe(false);
    });
  });

  describe("resolveStyle", () => {
    describe("loading from --csl-file path", () => {
      it("should return custom style when cslFile is provided and exists", () => {
        const mockCSL = '<?xml version="1.0"?><style>...</style>';
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(mockCSL);

        const result = resolveStyle({
          cslFile: "/path/to/custom.csl",
        });

        expect(result.type).toBe("custom");
        expect(result.styleName).toBe("custom");
        expect(result.styleXml).toBe(mockCSL);
        expect(fs.existsSync).toHaveBeenCalledWith("/path/to/custom.csl");
      });

      it("should throw error when cslFile is provided but does not exist", () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        expect(() => {
          resolveStyle({
            cslFile: "/path/to/missing.csl",
          });
        }).toThrow("CSL file '/path/to/missing.csl' not found");
      });

      it("should prioritize cslFile over style name", () => {
        const mockCSL = '<?xml version="1.0"?><style>...</style>';
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(mockCSL);

        const result = resolveStyle({
          cslFile: "/path/to/custom.csl",
          style: "apa",
        });

        expect(result.type).toBe("custom");
        expect(result.styleXml).toBe(mockCSL);
      });
    });

    describe("searching built-in styles", () => {
      it("should return builtin type for apa style", () => {
        const result = resolveStyle({
          style: "apa",
        });

        expect(result.type).toBe("builtin");
        expect(result.styleName).toBe("apa");
        expect(result.styleXml).toBeUndefined();
      });

      it("should return builtin type for vancouver style", () => {
        const result = resolveStyle({
          style: "vancouver",
        });

        expect(result.type).toBe("builtin");
        expect(result.styleName).toBe("vancouver");
      });

      it("should return builtin type for harvard style", () => {
        const result = resolveStyle({
          style: "harvard",
        });

        expect(result.type).toBe("builtin");
        expect(result.styleName).toBe("harvard");
      });
    });

    describe("searching in csl_directory paths", () => {
      it("should search single csl_directory when style is not built-in", () => {
        const mockCSL = '<?xml version="1.0"?><style>nature</style>';
        vi.mocked(fs.existsSync).mockImplementation((p) => {
          return p === path.join("/home/user/.csl", "nature.csl");
        });
        vi.mocked(fs.readFileSync).mockReturnValue(mockCSL);

        const result = resolveStyle({
          style: "nature",
          cslDirectory: "/home/user/.csl",
        });

        expect(result.type).toBe("custom");
        expect(result.styleName).toBe("nature");
        expect(result.styleXml).toBe(mockCSL);
      });

      it("should search multiple csl_directory paths in order", () => {
        const mockCSL = '<?xml version="1.0"?><style>nature</style>';
        vi.mocked(fs.existsSync).mockImplementation((p) => {
          // First directory doesn't have it, second directory does
          return p === path.join("/usr/share/csl", "nature.csl");
        });
        vi.mocked(fs.readFileSync).mockReturnValue(mockCSL);

        const result = resolveStyle({
          style: "nature",
          cslDirectory: ["/home/user/.csl", "/usr/share/csl"],
        });

        expect(result.type).toBe("custom");
        expect(result.styleName).toBe("nature");
        // Should check first directory first, then second
        expect(fs.existsSync).toHaveBeenCalledWith(path.join("/home/user/.csl", "nature.csl"));
        expect(fs.existsSync).toHaveBeenCalledWith(path.join("/usr/share/csl", "nature.csl"));
      });

      it("should use first matching directory when multiple have the style", () => {
        const mockCSL = '<?xml version="1.0"?><style>nature</style>';
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(mockCSL);

        const result = resolveStyle({
          style: "nature",
          cslDirectory: ["/home/user/.csl", "/usr/share/csl"],
        });

        expect(result.type).toBe("custom");
        // Should only check the first directory
        expect(fs.existsSync).toHaveBeenCalledTimes(1);
        expect(fs.existsSync).toHaveBeenCalledWith(path.join("/home/user/.csl", "nature.csl"));
      });

      it("should handle tilde expansion in csl_directory paths", () => {
        const mockCSL = '<?xml version="1.0"?><style>nature</style>';
        const originalHome = process.env.HOME;
        process.env.HOME = "/home/testuser";

        vi.mocked(fs.existsSync).mockImplementation((p) => {
          return p === path.join("/home/testuser/.csl", "nature.csl");
        });
        vi.mocked(fs.readFileSync).mockReturnValue(mockCSL);

        const result = resolveStyle({
          style: "nature",
          cslDirectory: "~/.csl",
        });

        expect(result.type).toBe("custom");
        expect(result.styleName).toBe("nature");

        process.env.HOME = originalHome;
      });

      it("should not search csl_directory for built-in styles", () => {
        const result = resolveStyle({
          style: "apa",
          cslDirectory: "/home/user/.csl",
        });

        // Should return built-in apa, not search in csl_directory
        expect(result.type).toBe("builtin");
        expect(result.styleName).toBe("apa");
        expect(fs.existsSync).not.toHaveBeenCalled();
      });
    });

    describe("fallback to default style", () => {
      it("should use default_style when style not found in any location", () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = resolveStyle({
          style: "nonexistent",
          defaultStyle: "vancouver",
        });

        // Should fall back to vancouver built-in
        expect(result.type).toBe("builtin");
        expect(result.styleName).toBe("vancouver");
      });

      it("should fall back to apa when both style and default_style are not found", () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const result = resolveStyle({
          style: "nonexistent",
          defaultStyle: "also-nonexistent",
        });

        // Should fall back to apa (hardcoded default)
        expect(result.type).toBe("builtin");
        expect(result.styleName).toBe("apa");
      });

      it("should return apa when no style is specified", () => {
        const result = resolveStyle({});

        expect(result.type).toBe("builtin");
        expect(result.styleName).toBe("apa");
      });

      it("should use default_style when no style is specified", () => {
        const result = resolveStyle({
          defaultStyle: "vancouver",
        });

        expect(result.type).toBe("builtin");
        expect(result.styleName).toBe("vancouver");
      });
    });

    describe("complex resolution scenarios", () => {
      it("should follow complete resolution order: cslFile > built-in > csl_directory > default > apa", () => {
        const mockCSL = '<?xml version="1.0"?><style>custom</style>';
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(mockCSL);

        const result = resolveStyle({
          cslFile: "/custom/path.csl",
          style: "vancouver",
          cslDirectory: "/home/user/.csl",
          defaultStyle: "harvard",
        });

        // cslFile should win
        expect(result.type).toBe("custom");
        expect(result.styleXml).toBe(mockCSL);
      });

      it("should use csl_directory when style is not built-in", () => {
        const mockCSL = '<?xml version="1.0"?><style>custom</style>';
        vi.mocked(fs.existsSync).mockImplementation((p) => {
          return p === path.join("/home/user/.csl", "custom.csl");
        });
        vi.mocked(fs.readFileSync).mockReturnValue(mockCSL);

        const result = resolveStyle({
          style: "custom",
          cslDirectory: "/home/user/.csl",
          defaultStyle: "apa",
        });

        expect(result.type).toBe("custom");
        expect(result.styleName).toBe("custom");
        expect(result.styleXml).toBe(mockCSL);
      });
    });
  });

  describe("loadCSLStyleFile", () => {
    it("should load CSL style file content", () => {
      const mockCSL = '<?xml version="1.0"?><style>...</style>';
      vi.mocked(fs.readFileSync).mockReturnValue(mockCSL);

      const result = loadCSLStyleFile("/path/to/style.csl");

      expect(result).toBe(mockCSL);
      expect(fs.readFileSync).toHaveBeenCalledWith("/path/to/style.csl", "utf-8");
    });

    it("should throw error when file cannot be read", () => {
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("ENOENT: no such file");
      });

      expect(() => {
        loadCSLStyleFile("/path/to/missing.csl");
      }).toThrow();
    });
  });
});
