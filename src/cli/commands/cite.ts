import { isBuiltinStyle } from "../../config/csl-styles.js";
import type { CslItem } from "../../core/csl-json/types.js";
import { formatBibliographyCSL, formatInTextCSL } from "../output/citation-csl.js";
import { formatBibliography, formatInText } from "../output/citation-fallback.js";

export interface CiteOptions {
  uuid?: boolean;
  style?: string;
  cslFile?: string;
  locale?: string;
  format?: "text" | "html" | "rtf";
  inText?: boolean;
}

/**
 * Resolve references by ID or UUID.
 *
 * @param items - Array of CSL items
 * @param idsOrUuids - Array of IDs or UUIDs to look up
 * @param useUuid - Whether to use UUID lookup
 * @returns Array of resolved CSL items
 * @throws Error if any reference is not found
 */
function resolveReferences(items: CslItem[], idsOrUuids: string[], useUuid: boolean): CslItem[] {
  const resolved: CslItem[] = [];

  for (const identifier of idsOrUuids) {
    let found: CslItem | undefined;

    if (useUuid) {
      // Look up by UUID
      found = items.find((item) => item.custom?.uuid === identifier);
      if (!found) {
        throw new Error(`Reference with UUID '${identifier}' not found`);
      }
    } else {
      // Look up by ID
      found = items.find((item) => item.id === identifier);
      if (!found) {
        throw new Error(`Reference '${identifier}' not found`);
      }
    }

    resolved.push(found);
  }

  return resolved;
}

/**
 * Validate citation options.
 *
 * @param options - Citation options to validate
 * @throws Error if options are invalid
 */
async function validateOptions(options: CiteOptions): Promise<void> {
  // Validate format option
  if (options.format && !["text", "html", "rtf"].includes(options.format)) {
    throw new Error(`Invalid format '${options.format}'. Must be one of: text, html, rtf`);
  }

  // Validate CSL file if provided
  if (options.cslFile) {
    const fs = await import("node:fs");
    if (!fs.existsSync(options.cslFile)) {
      throw new Error(`CSL file '${options.cslFile}' not found`);
    }
  }
}

/**
 * Check if fallback formatter should be used.
 *
 * @param options - Citation options
 * @returns true if fallback should be used
 */
function shouldUseFallbackFormatter(options: CiteOptions): boolean {
  // If custom CSL file is specified, don't use fallback
  if (options.cslFile) {
    return false;
  }

  // If style is specified but not built-in, use fallback
  if (options.style && !isBuiltinStyle(options.style)) {
    process.stderr.write(
      `Warning: CSL style '${options.style}' not found, falling back to simplified format\n`
    );
    return true;
  }

  return false;
}

/**
 * Generate citation using appropriate formatter.
 *
 * @param items - Resolved CSL items
 * @param options - Citation options
 * @param useFallback - Whether to use fallback formatter
 * @returns Formatted citation
 */
function generateCitation(items: CslItem[], options: CiteOptions, useFallback: boolean): string {
  const format = options.format || "text";
  const locale = options.locale || "en-US";
  const style = options.cslFile || options.style || "apa";

  if (useFallback) {
    // Use fallback formatter
    return options.inText ? formatInText(items) : formatBibliography(items);
  }

  // Use CSL processor (with automatic fallback)
  return options.inText
    ? formatInTextCSL(items, { style, locale, format })
    : formatBibliographyCSL(items, { style, locale, format });
}

/**
 * Generate citations for references.
 *
 * @param items - Array of CSL items
 * @param idsOrUuids - Array of IDs or UUIDs to cite
 * @param options - Citation options
 */
export async function cite(
  items: CslItem[],
  idsOrUuids: string[],
  options: CiteOptions
): Promise<void> {
  // Validate options
  await validateOptions(options);

  // Resolve references
  const resolved = resolveReferences(items, idsOrUuids, options.uuid || false);

  // Check if fallback should be used
  const useFallback = shouldUseFallbackFormatter(options);

  // Generate citation
  const output = generateCitation(resolved, options, useFallback);

  // Output to stdout
  process.stdout.write(output);
  if (!output.endsWith("\n")) {
    process.stdout.write("\n");
  }
}
