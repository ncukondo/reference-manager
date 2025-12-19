import { Cite } from "@citation-js/core";
import "@citation-js/plugin-csl";
import type { CslItem } from "../../core/csl-json/types";
import { formatBibliography, formatInText } from "./citation-fallback";

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
  const style = options.style || "apa";
  const format = options.format || "text";
  const locale = options.locale || "en-US";

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
    console.warn(
      `CSL processing failed (style: ${style}), falling back to simplified format:`,
      error
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
  const style = options.style || "apa";
  const format = options.format || "text";
  const locale = options.locale || "en-US";

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
    console.warn(
      `CSL processing failed (style: ${style}), falling back to simplified format:`,
      error
    );
    return formatInText(items);
  }
}
