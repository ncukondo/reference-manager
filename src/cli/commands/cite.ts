import type { CiteOperationOptions, CiteResult } from "../../features/operations/cite.js";
import type { ExecutionContext } from "../execution-context.js";

/**
 * Options for the cite command.
 */
export interface CiteCommandOptions {
  identifiers: string[];
  uuid?: boolean;
  style?: string;
  cslFile?: string;
  locale?: string;
  format?: "text" | "html" | "rtf";
  inText?: boolean;
}

/**
 * Result from cite command execution.
 */
export type CiteCommandResult = CiteResult;

/**
 * Validate citation options.
 */
async function validateOptions(options: CiteCommandOptions): Promise<void> {
  if (options.format && !["text", "html", "rtf"].includes(options.format)) {
    throw new Error(`Invalid format '${options.format}'. Must be one of: text, html, rtf`);
  }

  if (options.cslFile) {
    const fs = await import("node:fs");
    if (!fs.existsSync(options.cslFile)) {
      throw new Error(`CSL file '${options.cslFile}' not found`);
    }
  }
}

/**
 * Build cite operation options from command options.
 */
function buildCiteOptions(options: CiteCommandOptions): CiteOperationOptions {
  return {
    identifiers: options.identifiers,
    ...(options.uuid !== undefined && { byUuid: options.uuid }),
    ...(options.style !== undefined && { style: options.style }),
    ...(options.cslFile !== undefined && { cslFile: options.cslFile }),
    ...(options.locale !== undefined && { locale: options.locale }),
    ...(options.format !== undefined && { format: options.format }),
    ...(options.inText !== undefined && { inText: options.inText }),
  };
}

/**
 * Execute cite command.
 * Uses context.library.cite() which works for both local and server modes.
 *
 * @param options - Cite command options
 * @param context - Execution context
 * @returns Cite result containing per-identifier results
 */
export async function executeCite(
  options: CiteCommandOptions,
  context: ExecutionContext
): Promise<CiteCommandResult> {
  await validateOptions(options);

  return context.library.cite(buildCiteOptions(options));
}

/**
 * Format cite result for CLI output.
 *
 * @param result - Cite result
 * @returns Formatted output string (for stdout)
 */
export function formatCiteOutput(result: CiteCommandResult): string {
  const lines: string[] = [];
  for (const r of result.results) {
    if (r.success) {
      lines.push(r.citation);
    }
  }
  return lines.join("\n");
}

/**
 * Format cite errors for stderr.
 *
 * @param result - Cite result
 * @returns Error messages to write to stderr
 */
export function formatCiteErrors(result: CiteCommandResult): string {
  const lines: string[] = [];
  for (const r of result.results) {
    if (!r.success) {
      lines.push(`Error for '${r.identifier}': ${r.error}`);
    }
  }
  return lines.join("\n");
}

/**
 * Determine exit code based on result.
 *
 * @param result - Cite result
 * @returns Exit code (0 for success/partial success, 1 for complete failure)
 */
export function getCiteExitCode(result: CiteCommandResult): number {
  const hasSuccess = result.results.some((r) => r.success);
  const hasError = result.results.some((r) => !r.success);

  if (hasSuccess) {
    return 0;
  }
  if (hasError) {
    return 1;
  }
  return 0;
}
