import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomPdfConverter } from "./custom-converter.js";
import type { CustomConverterConfig } from "./pdf-converter.js";

vi.mock("./converter-check.js", () => ({
  isCommandAvailable: vi.fn(),
  runCheckCommand: vi.fn(),
}));

vi.mock("node:child_process", () => ({
  exec: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  access: vi.fn(),
  writeFile: vi.fn(),
}));

import { exec } from "node:child_process";
import { access, writeFile } from "node:fs/promises";
import { isCommandAvailable, runCheckCommand } from "./converter-check.js";

const mockedIsCommandAvailable = vi.mocked(isCommandAvailable);
const mockedRunCheckCommand = vi.mocked(runCheckCommand);
const mockedExec = vi.mocked(exec);
const mockedAccess = vi.mocked(access);
const mockedWriteFile = vi.mocked(writeFile);

describe("CustomPdfConverter", () => {
  const baseConfig: CustomConverterConfig = {
    command: "my-tool {input} {output}",
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("isAvailable", () => {
    it("should delegate to isCommandAvailable when no checkCommand", async () => {
      mockedIsCommandAvailable.mockResolvedValue(true);
      const converter = new CustomPdfConverter("my-tool", baseConfig);

      const result = await converter.isAvailable();

      expect(result).toBe(true);
      // Extracts first token of command as the binary name
      expect(mockedIsCommandAvailable).toHaveBeenCalledWith("my-tool");
    });

    it("should delegate to runCheckCommand when checkCommand is set", async () => {
      mockedRunCheckCommand.mockResolvedValue(true);
      const config: CustomConverterConfig = {
        ...baseConfig,
        checkCommand: "my-tool --version",
      };
      const converter = new CustomPdfConverter("my-tool", config);

      const result = await converter.isAvailable();

      expect(result).toBe(true);
      expect(mockedRunCheckCommand).toHaveBeenCalledWith("my-tool --version");
      expect(mockedIsCommandAvailable).not.toHaveBeenCalled();
    });

    it("should return false when command is not available", async () => {
      mockedIsCommandAvailable.mockResolvedValue(false);
      const converter = new CustomPdfConverter("my-tool", baseConfig);

      const result = await converter.isAvailable();

      expect(result).toBe(false);
    });
  });

  describe("convert (file output mode)", () => {
    it("should execute command and verify output file exists", async () => {
      mockedExec.mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === "function") {
          callback(null, "", "");
        }
        return undefined as ReturnType<typeof exec>;
      });
      mockedAccess.mockResolvedValue(undefined);

      const converter = new CustomPdfConverter("my-tool", baseConfig);
      const result = await converter.convert("/input.pdf", "/output.md");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.outputPath).toBe("/output.md");
      }
      expect(mockedExec).toHaveBeenCalledWith(
        "my-tool /input.pdf /output.md",
        expect.objectContaining({ timeout: 300000 }),
        expect.any(Function)
      );
    });

    it("should return error when output file is not created", async () => {
      mockedExec.mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === "function") {
          callback(null, "", "");
        }
        return undefined as ReturnType<typeof exec>;
      });
      mockedAccess.mockRejectedValue(new Error("ENOENT"));

      const converter = new CustomPdfConverter("my-tool", baseConfig);
      const result = await converter.convert("/input.pdf", "/output.md");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("output-not-created");
      }
    });
  });

  describe("convert (stdout output mode)", () => {
    it("should capture stdout and write to output file", async () => {
      mockedExec.mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === "function") {
          callback(null, "# Markdown content\n\nHello world", "");
        }
        return undefined as ReturnType<typeof exec>;
      });
      mockedWriteFile.mockResolvedValue(undefined);

      const config: CustomConverterConfig = {
        command: "my-tool {input}",
        outputMode: "stdout",
      };
      const converter = new CustomPdfConverter("my-tool", config);
      const result = await converter.convert("/input.pdf", "/output.md");

      expect(result.success).toBe(true);
      expect(mockedWriteFile).toHaveBeenCalledWith(
        "/output.md",
        "# Markdown content\n\nHello world",
        "utf-8"
      );
    });
  });

  describe("error handling", () => {
    it("should return error with stderr on non-zero exit code", async () => {
      const execError = Object.assign(new Error("Command failed"), {
        code: 1,
        stderr: "CUDA out of memory",
        stdout: "",
      });
      mockedExec.mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === "function") {
          callback(execError as Parameters<typeof callback>[0], "", "CUDA out of memory");
        }
        return undefined as ReturnType<typeof exec>;
      });

      const converter = new CustomPdfConverter("my-tool", baseConfig);
      const result = await converter.convert("/input.pdf", "/output.md");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("conversion-failed");
        expect(result.stderr).toContain("CUDA out of memory");
      }
    });

    it("should handle timeout with conversion-failed code", async () => {
      const config: CustomConverterConfig = {
        ...baseConfig,
        timeout: 1,
      };
      const timeoutError = Object.assign(new Error("Command timed out"), {
        killed: true,
        signal: "SIGTERM",
      });
      mockedExec.mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === "function") {
          callback(timeoutError as Parameters<typeof callback>[0], "", "");
        }
        return undefined as ReturnType<typeof exec>;
      });

      const converter = new CustomPdfConverter("my-tool", config);
      const result = await converter.convert("/input.pdf", "/output.md");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe("timeout");
      }
    });
  });

  describe("platform handling", () => {
    it("should use commandWindows on win32", async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, "platform", { value: "win32" });

      mockedExec.mockImplementation((_cmd, _opts, callback) => {
        if (typeof callback === "function") {
          callback(null, "", "");
        }
        return undefined as ReturnType<typeof exec>;
      });
      mockedAccess.mockResolvedValue(undefined);

      const config: CustomConverterConfig = {
        command: "my-tool {input} {output}",
        commandWindows: "python -m my_tool {input} {output}",
      };
      const converter = new CustomPdfConverter("my-tool", config);
      await converter.convert("/input.pdf", "/output.md");

      expect(mockedExec).toHaveBeenCalledWith(
        "python -m my_tool /input.pdf /output.md",
        expect.any(Object),
        expect.any(Function)
      );

      Object.defineProperty(process, "platform", { value: originalPlatform });
    });
  });
});
