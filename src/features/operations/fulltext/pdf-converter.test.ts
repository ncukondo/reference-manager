import { describe, expect, it } from "vitest";
import type {
  CustomConverterConfig,
  PdfConvertError,
  PdfConvertResult,
  PdfConverter,
} from "./pdf-converter.js";

describe("PdfConverter types", () => {
  describe("PdfConverter interface", () => {
    it("should require name, isAvailable, and convert methods", () => {
      const converter: PdfConverter = {
        name: "test-converter",
        isAvailable: async () => true,
        convert: async (_pdfPath: string, _outputPath: string) => ({
          success: true as const,
          outputPath: "/tmp/output.md",
        }),
      };

      expect(converter.name).toBe("test-converter");
      expect(typeof converter.isAvailable).toBe("function");
      expect(typeof converter.convert).toBe("function");
    });

    it("should return PdfConvertResult from convert()", async () => {
      const converter: PdfConverter = {
        name: "test",
        isAvailable: async () => false,
        convert: async (_pdfPath, _outputPath) => ({
          success: true as const,
          outputPath: "/output.md",
        }),
      };

      const result = await converter.convert("/input.pdf", "/output.md");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.outputPath).toBe("/output.md");
      }
    });
  });

  describe("PdfConvertResult", () => {
    it("should represent a successful result", () => {
      const result: PdfConvertResult = {
        success: true,
        outputPath: "/path/to/output.md",
      };
      expect(result.success).toBe(true);
      expect(result.outputPath).toBe("/path/to/output.md");
    });

    it("should represent a failure result with error code", () => {
      const result: PdfConvertResult = {
        success: false,
        error: "Conversion failed",
        code: "conversion-failed",
      };
      expect(result.success).toBe(false);
      expect(result.error).toBe("Conversion failed");
      expect(result.code).toBe("conversion-failed");
    });

    it("should represent a failure result with stderr", () => {
      const result: PdfConvertResult = {
        success: false,
        error: "Process exited with code 1",
        code: "conversion-failed",
        stderr: "CUDA out of memory",
      };
      expect(result.success).toBe(false);
      expect(result.stderr).toBe("CUDA out of memory");
    });
  });

  describe("PdfConvertError codes", () => {
    it("should accept valid error codes", () => {
      const codes: PdfConvertError[] = [
        "no-converter",
        "not-installed",
        "conversion-failed",
        "timeout",
        "no-pdf",
        "output-not-created",
      ];
      expect(codes).toHaveLength(6);
    });
  });

  describe("CustomConverterConfig", () => {
    it("should require command field", () => {
      const config: CustomConverterConfig = {
        command: "my-tool {input} {output}",
      };
      expect(config.command).toBe("my-tool {input} {output}");
    });

    it("should accept all optional fields", () => {
      const config: CustomConverterConfig = {
        command: "my-tool {input} {output}",
        outputMode: "file",
        checkCommand: "my-tool --version",
        timeout: 600,
        progress: "inherit",
        commandWindows: "python -m my_tool {input} {output}",
        checkCommandWindows: 'python -c "import my_tool"',
      };
      expect(config.outputMode).toBe("file");
      expect(config.checkCommand).toBe("my-tool --version");
      expect(config.timeout).toBe(600);
      expect(config.progress).toBe("inherit");
      expect(config.commandWindows).toBe("python -m my_tool {input} {output}");
      expect(config.checkCommandWindows).toBe('python -c "import my_tool"');
    });

    it("should accept stdout output mode", () => {
      const config: CustomConverterConfig = {
        command: "my-tool {input}",
        outputMode: "stdout",
      };
      expect(config.outputMode).toBe("stdout");
    });

    it("should accept quiet progress mode", () => {
      const config: CustomConverterConfig = {
        command: "my-tool {input} {output}",
        progress: "quiet",
      };
      expect(config.progress).toBe("quiet");
    });
  });
});
