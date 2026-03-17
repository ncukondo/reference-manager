/**
 * Custom PDF converter implementation.
 * Wraps user-defined shell commands as PdfConverter instances.
 */

import { exec } from "node:child_process";
import { access, writeFile } from "node:fs/promises";
import { expandTemplate } from "./command-template.js";
import { isCommandAvailable, runCheckCommand } from "./converter-check.js";
import type { CustomConverterConfig, PdfConvertResult, PdfConverter } from "./pdf-converter.js";

export class CustomPdfConverter implements PdfConverter {
  readonly name: string;
  private readonly config: CustomConverterConfig;

  constructor(name: string, config: CustomConverterConfig) {
    this.name = name;
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    const checkCmd = this.getCheckCommand();
    if (checkCmd) {
      return runCheckCommand(checkCmd);
    }
    // Extract first token of command as binary name
    const command = this.getCommand();
    const binary = command.split(/\s+/)[0] ?? command;
    return isCommandAvailable(binary);
  }

  async convert(pdfPath: string, outputPath: string): Promise<PdfConvertResult> {
    const command = this.getCommand();
    const expanded = expandTemplate(command, { input: pdfPath, output: outputPath });
    const outputMode = this.config.outputMode ?? "file";
    const timeoutMs = (this.config.timeout ?? 300) * 1000;

    try {
      const { stdout } = await this.execCommand(expanded, timeoutMs);

      if (outputMode === "stdout") {
        await writeFile(outputPath, stdout, "utf-8");
        return { success: true, outputPath };
      }

      // File mode: verify output file was created
      try {
        await access(outputPath);
      } catch {
        return {
          success: false,
          error: `Output file was not created: ${outputPath}`,
          code: "output-not-created",
        };
      }

      return { success: true, outputPath };
    } catch (err: unknown) {
      return this.handleExecError(err);
    }
  }

  private getCommand(): string {
    if (process.platform === "win32" && this.config.commandWindows) {
      return this.config.commandWindows;
    }
    return this.config.command;
  }

  private getCheckCommand(): string | undefined {
    if (process.platform === "win32" && this.config.checkCommandWindows) {
      return this.config.checkCommandWindows;
    }
    return this.config.checkCommand;
  }

  private execCommand(
    command: string,
    timeoutMs: number
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      exec(command, { timeout: timeoutMs }, (err, stdout, stderr) => {
        if (err) {
          reject(Object.assign(err, { stderr: stderr || (err as { stderr?: string }).stderr }));
        } else {
          resolve({ stdout: stdout as string, stderr: stderr as string });
        }
      });
    });
  }

  private handleExecError(err: unknown): PdfConvertResult {
    const error = err as { killed?: boolean; signal?: string; stderr?: string; message?: string };
    if (error.killed || error.signal === "SIGTERM") {
      return {
        success: false,
        error: `PDF conversion timed out after ${this.config.timeout ?? 300} seconds`,
        code: "timeout",
      };
    }
    return {
      success: false,
      error: error.message ?? "Conversion failed",
      code: "conversion-failed",
      ...(error.stderr ? { stderr: error.stderr } : {}),
    };
  }
}
