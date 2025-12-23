import { isBuiltinStyle } from "../../config/csl-styles.js";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary } from "../../core/library-interface.js";
import {
  formatBibliography,
  formatBibliographyCSL,
  formatInText,
  formatInTextCSL,
} from "../format/index.js";

/**
 * Options for citeReferences operation
 */
export interface CiteOperationOptions {
  /** Reference IDs or UUIDs to cite */
  identifiers: string[];
  /** If true, identifiers are treated as UUIDs; otherwise as IDs (default: false) */
  byUuid?: boolean;
  /** CSL style name or path to CSL file */
  style?: string;
  /** Path to custom CSL file */
  cslFile?: string;
  /** Locale for citation formatting (default: "en-US") */
  locale?: string;
  /** Output format (default: "text") */
  format?: "text" | "html" | "rtf";
  /** If true, generate in-text citation instead of bibliography */
  inText?: boolean;
}

/**
 * Result for a single citation
 */
export type CiteItemResult =
  | { success: true; identifier: string; citation: string }
  | { success: false; identifier: string; error: string };

/**
 * Result of citeReferences operation
 */
export interface CiteResult {
  /** Results for each identifier */
  results: CiteItemResult[];
}

interface FormatOptions {
  style?: string | undefined;
  cslFile?: string | undefined;
  locale?: string | undefined;
  format?: "text" | "html" | "rtf" | undefined;
}

/**
 * Check if fallback formatter should be used.
 */
function shouldUseFallback(options: FormatOptions): boolean {
  if (options.cslFile) {
    return false;
  }
  if (options.style && !isBuiltinStyle(options.style)) {
    return true;
  }
  return false;
}

/**
 * Format a single item as citation.
 */
function formatCitation(item: CslItem, inText: boolean, options: FormatOptions): string {
  const useFallback = shouldUseFallback(options);
  const style = options.cslFile ?? options.style ?? "apa";
  const locale = options.locale ?? "en-US";
  const format = options.format ?? "text";

  if (useFallback) {
    return inText ? formatInText([item]) : formatBibliography([item]);
  }

  return inText
    ? formatInTextCSL([item], { style, locale, format })
    : formatBibliographyCSL([item], { style, locale, format });
}

/**
 * Generate citation for a single identifier.
 */
async function generateCitationForIdentifier(
  library: ILibrary,
  identifier: string,
  byUuid: boolean,
  inText: boolean,
  options: FormatOptions
): Promise<CiteItemResult> {
  const item = byUuid ? await library.findByUuid(identifier) : await library.findById(identifier);

  if (!item) {
    const lookupType = byUuid ? "UUID" : "ID";
    return {
      success: false,
      identifier,
      error: `Reference with ${lookupType} '${identifier}' not found`,
    };
  }

  const citation = formatCitation(item, inText, options);

  return {
    success: true,
    identifier,
    citation,
  };
}

/**
 * Generate citations for references.
 *
 * @param library - The library to cite from
 * @param options - Citation options including identifiers and style settings
 * @returns Results array with citation or error for each identifier
 */
export async function citeReferences(
  library: ILibrary,
  options: CiteOperationOptions
): Promise<CiteResult> {
  const { identifiers, byUuid = false, inText = false, style, cslFile, locale, format } = options;
  const results: CiteItemResult[] = [];

  for (const identifier of identifiers) {
    const result = await generateCitationForIdentifier(library, identifier, byUuid, inText, {
      style,
      cslFile,
      locale,
      format,
    });
    results.push(result);
  }

  return { results };
}
