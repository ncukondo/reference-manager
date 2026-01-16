import { Cite, plugins } from "@citation-js/core";
import "@citation-js/plugin-csl";
import type { CslItem } from "../../core/csl-json/types.js";
import { formatBibliography, formatInText } from "./citation-fallback.js";

/**
 * Options for CSL citation formatting
 */
export type CitationFormatOptions = {
  /**
   * CSL style name (e.g., 'apa', 'vancouver', 'chicago')
   * @default 'apa'
   */
  style?: string;

  /**
   * Custom CSL style XML content.
   * When provided, this XML is registered and used instead of built-in styles.
   */
  styleXml?: string;

  /**
   * Output format: text, html, or rtf
   * @default 'text'
   */
  format?: "text" | "html" | "rtf";

  /**
   * Locale code (e.g., 'en-US', 'en-GB')
   * @default 'en-US'
   */
  locale?: string;
};

/**
 * Register a custom CSL style with citation-js.
 * Returns the style name to use for formatting.
 * @throws Error if CSL XML is invalid or malformed
 */
function registerCustomStyle(styleName: string, styleXml: string): string {
  // Basic XML validation
  if (!styleXml.includes("<style") || !styleXml.includes("</style>")) {
    throw new Error(
      "Invalid CSL file: Missing <style> element. The file may be malformed or not a valid CSL style."
    );
  }

  // Check for required CSL sections
  const hasCitation = styleXml.includes("<citation") || styleXml.includes("<citation>");
  const hasBibliography = styleXml.includes("<bibliography") || styleXml.includes("<bibliography>");
  if (!hasCitation && !hasBibliography) {
    throw new Error(
      "Invalid CSL file: Missing <citation> or <bibliography> section. " +
        "A valid CSL style must define at least one of these sections."
    );
  }

  try {
    const config = plugins.config.get("@csl");
    config.templates.add(styleName, styleXml);
    return styleName;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to register CSL style '${styleName}': ${message}`);
  }
}

/**
 * Format CSL-JSON items as bibliography using CSL processor.
 * Falls back to simplified format if CSL processing fails.
 *
 * @param items - Array of CSL-JSON items
 * @param options - Formatting options
 * @returns Formatted bibliography entries
 */
export function formatBibliographyCSL(items: CslItem[], options: CitationFormatOptions): string {
  // Handle empty array
  if (items.length === 0) {
    return "";
  }

  // Set defaults
  let style = options.style || "apa";
  const format = options.format || "text";
  const locale = options.locale || "en-US";

  // Register custom style if XML is provided
  if (options.styleXml) {
    style = registerCustomStyle(style, options.styleXml);
  }

  try {
    // Create Cite instance with CSL-JSON data
    const cite = new Cite(items);

    // Format as bibliography
    const result = cite.format("bibliography", {
      format,
      template: style,
      lang: locale,
    });

    return result;
  } catch (error) {
    // Fall back to simplified format on any error
    const errorMessage = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `Warning: CSL processing failed (style: ${style}), falling back to simplified format: ${errorMessage}\n`
    );
    return formatBibliography(items);
  }
}

/**
 * Format CSL-JSON items as in-text citations using CSL processor.
 * Falls back to simplified format if CSL processing fails.
 *
 * @param items - Array of CSL-JSON items
 * @param options - Formatting options
 * @returns Formatted in-text citation(s)
 */
export function formatInTextCSL(items: CslItem[], options: CitationFormatOptions): string {
  // Handle empty array
  if (items.length === 0) {
    return "";
  }

  // Set defaults
  let style = options.style || "apa";
  const format = options.format || "text";
  const locale = options.locale || "en-US";

  // Register custom style if XML is provided
  if (options.styleXml) {
    style = registerCustomStyle(style, options.styleXml);
  }

  try {
    // Create Cite instance with CSL-JSON data
    const cite = new Cite(items);

    // Format as in-text citation
    const result = cite.format("citation", {
      format,
      template: style,
      lang: locale,
    });

    return result;
  } catch (error) {
    // Fall back to simplified format on any error
    const errorMessage = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `Warning: CSL processing failed (style: ${style}), falling back to simplified format: ${errorMessage}\n`
    );
    return formatInText(items);
  }
}
