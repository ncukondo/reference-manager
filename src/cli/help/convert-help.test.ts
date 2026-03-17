import { describe, expect, it } from "vitest";
import { BUILTIN_CONVERTER_NAMES } from "../../features/operations/fulltext/builtin-converters.js";
import { buildConvertHelpText } from "./convert-help.js";

describe("buildConvertHelpText", () => {
  const helpText = buildConvertHelpText();

  describe("BUILT-IN CONVERTERS section", () => {
    it("should include BUILT-IN CONVERTERS header", () => {
      expect(helpText).toContain("BUILT-IN CONVERTERS");
    });

    it("should list all built-in converter names", () => {
      for (const name of BUILTIN_CONVERTER_NAMES) {
        expect(helpText).toContain(name);
      }
    });

    it("should show install commands", () => {
      expect(helpText).toContain("pip install marker-pdf");
      expect(helpText).toContain("pip install docling");
      expect(helpText).toContain("pip install mineru[all]");
      expect(helpText).toContain("pip install pymupdf4llm");
    });

    it("should show priority order", () => {
      expect(helpText).toContain("Priority: marker > docling > mineru > pymupdf");
    });
  });

  describe("CUSTOM CONVERTERS section", () => {
    it("should include CUSTOM CONVERTERS header", () => {
      expect(helpText).toContain("CUSTOM CONVERTERS");
    });

    it("should document all template placeholders", () => {
      const placeholders = ["{input}", "{output}", "{input_dir}", "{input_name}", "{output_name}"];
      for (const placeholder of placeholders) {
        expect(helpText).toContain(placeholder);
      }
    });

    it("should show config set examples", () => {
      expect(helpText).toContain("ref config set fulltext.converters.");
    });

    it("should show config.toml example", () => {
      expect(helpText).toContain("[fulltext.converters.my-tool]");
    });

    it("should document additional options", () => {
      expect(helpText).toContain("output_mode");
      expect(helpText).toContain("timeout");
      expect(helpText).toContain("progress");
    });
  });

  describe("CONFIGURATION section", () => {
    it("should include CONFIGURATION header", () => {
      expect(helpText).toContain("CONFIGURATION");
    });

    it("should mention config set commands", () => {
      expect(helpText).toContain("ref config set fulltext.pdf_converter");
      expect(helpText).toContain("ref config set fulltext.pdf_converter_timeout");
    });

    it("should mention config edit", () => {
      expect(helpText).toContain("ref config edit");
    });
  });

  describe("EXAMPLES section", () => {
    it("should include EXAMPLES header", () => {
      expect(helpText).toContain("EXAMPLES");
    });

    it("should include example commands", () => {
      expect(helpText).toContain("ref fulltext convert smith2023");
    });

    it("should include --converter example", () => {
      expect(helpText).toContain("--converter marker");
    });

    it("should include --from and --force example", () => {
      expect(helpText).toContain("--from pdf --force");
    });
  });

  describe("formatting", () => {
    it("should start with a newline for proper spacing after options", () => {
      expect(helpText).toMatch(/^\n/);
    });
  });
});
