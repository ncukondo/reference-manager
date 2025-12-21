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
    // Use server API - build options without undefined values
    const serverOpts: Parameters<typeof serverClient.cite>[0] = {
      identifiers: options.identifiers,
    };
    if (options.uuid !== undefined) serverOpts.byUuid = options.uuid;
    if (options.inText !== undefined) serverOpts.inText = options.inText;
    if (options.style !== undefined) serverOpts.style = options.style;
    if (options.cslFile !== undefined) serverOpts.cslFile = options.cslFile;
    if (options.locale !== undefined) serverOpts.locale = options.locale;
    if (options.format !== undefined) {
      serverOpts.format = options.format === "rtf" ? "text" : options.format;
    }
    return serverClient.cite(serverOpts);
  }

  // Direct library operation - build options without undefined values
  const opOpts: Parameters<typeof citeReferences>[1] = {
    identifiers: options.identifiers,
  };
  if (options.uuid !== undefined) opOpts.byUuid = options.uuid;
  if (options.style !== undefined) opOpts.style = options.style;
  if (options.cslFile !== undefined) opOpts.cslFile = options.cslFile;
  if (options.locale !== undefined) opOpts.locale = options.locale;
  if (options.format !== undefined) opOpts.format = options.format;
  if (options.inText !== undefined) opOpts.inText = options.inText;
  return citeReferences(library, opOpts);
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
