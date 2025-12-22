import { isBuiltinStyle } from "../../config/csl-styles.js";
import type { CslItem } from "../../core/csl-json/types.js";
import type { Library } from "../../core/library.js";
import {
  formatBibliography,
  formatBibliographyCSL,
  formatInText,
  formatInTextCSL,
} from "../../features/format/index.js";
import { type CiteResult, citeReferences } from "../../features/operations/cite.js";
import type { ServerClient } from "../server-client.js";

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
 * Build server cite options from command options.
 */
function buildServerCiteOptions(options: CiteCommandOptions): Parameters<ServerClient["cite"]>[0] {
  return {
    identifiers: options.identifiers,
    ...(options.uuid !== undefined && { byUuid: options.uuid }),
    ...(options.inText !== undefined && { inText: options.inText }),
    ...(options.style !== undefined && { style: options.style }),
    ...(options.cslFile !== undefined && { cslFile: options.cslFile }),
    ...(options.locale !== undefined && { locale: options.locale }),
    ...(options.format !== undefined && {
      format: options.format === "rtf" ? "text" : options.format,
    }),
  };
}

/**
 * Build operation cite options from command options.
 */
function buildOperationCiteOptions(
  options: CiteCommandOptions
): Parameters<typeof citeReferences>[1] {
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
 * Routes to server API or direct library operation based on server availability.
 *
 * @param options - Cite command options
 * @param library - Library instance (used when server is not available)
 * @param serverClient - Server client (undefined if server is not running)
 * @returns Cite result containing per-identifier results
 */
export async function executeCite(
  options: CiteCommandOptions,
  library: Library,
  serverClient: ServerClient | undefined
): Promise<CiteCommandResult> {
  await validateOptions(options);

  if (serverClient) {
    return serverClient.cite(buildServerCiteOptions(options));
  }

  return citeReferences(library, buildOperationCiteOptions(options));
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

// Keep the old function for backwards compatibility during transition
/**
 * @deprecated Use executeCite and formatCiteOutput instead
 */
export async function cite(
  items: CslItem[],
  idsOrUuids: string[],
  options: Omit<CiteCommandOptions, "identifiers">
): Promise<void> {
  const fullOptions: CiteCommandOptions = { ...options, identifiers: idsOrUuids };
  await validateOptions(fullOptions);

  // Resolve references
  const resolved: CslItem[] = [];
  for (const identifier of idsOrUuids) {
    const found = options.uuid
      ? items.find((item) => item.custom?.uuid === identifier)
      : items.find((item) => item.id === identifier);
    if (!found) {
      const msg = options.uuid
        ? `Reference with UUID '${identifier}' not found`
        : `Reference '${identifier}' not found`;
      throw new Error(msg);
    }
    resolved.push(found);
  }

  // Check if fallback should be used
  let useFallback = false;
  if (!options.cslFile && options.style && !isBuiltinStyle(options.style)) {
    process.stderr.write(
      `Warning: CSL style '${options.style}' not found, falling back to simplified format\n`
    );
    useFallback = true;
  }

  // Generate citation
  const format = options.format || "text";
  const locale = options.locale || "en-US";
  const style = options.cslFile || options.style || "apa";

  let output: string;
  if (useFallback) {
    output = options.inText ? formatInText(resolved) : formatBibliography(resolved);
  } else {
    output = options.inText
      ? formatInTextCSL(resolved, { style, locale, format })
      : formatBibliographyCSL(resolved, { style, locale, format });
  }

  process.stdout.write(output);
  if (!output.endsWith("\n")) {
    process.stdout.write("\n");
  }
}
