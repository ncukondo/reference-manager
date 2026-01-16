import { isBuiltinStyle, resolveStyle } from "../../config/csl-styles.js";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../core/library-interface.js";
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
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType;
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
  styleXml?: string | undefined;
  locale?: string | undefined;
  format?: "text" | "html" | "rtf" | undefined;
}

/**
 * Check if fallback formatter should be used.
 */
function shouldUseFallback(style: string | undefined, hasCustomXml: boolean): boolean {
  if (hasCustomXml) {
    return false;
  }
  if (style && !isBuiltinStyle(style)) {
    return true;
  }
  return false;
}

/**
 * Format a single item as citation.
 */
function formatCitation(item: CslItem, inText: boolean, options: FormatOptions): string {
  const useFallback = shouldUseFallback(options.style, !!options.styleXml);
  const style = options.style ?? "apa";
  const locale = options.locale ?? "en-US";
  const format = options.format ?? "text";
  const styleXml = options.styleXml;

  if (useFallback) {
    return inText ? formatInText([item]) : formatBibliography([item]);
  }

  const formatOptions = { style, locale, format, ...(styleXml && { styleXml }) };
  return inText ? formatInTextCSL([item], formatOptions) : formatBibliographyCSL([item], formatOptions);
}

/**
 * Generate citation for a single identifier.
 */
async function generateCitationForIdentifier(
  library: ILibrary,
  identifier: string,
  idType: IdentifierType,
  inText: boolean,
  options: FormatOptions
): Promise<CiteItemResult> {
  const item = await library.find(identifier, { idType });

  if (!item) {
    const lookupType = idType === "uuid" ? "UUID" : idType.toUpperCase();
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
  const { identifiers, idType = "id", inText = false, style, cslFile, locale, format } = options;
  const results: CiteItemResult[] = [];

  // Resolve style: load custom CSL file if specified
  let resolvedStyle = style;
  let styleXml: string | undefined;

  if (cslFile) {
    const resolution = resolveStyle({ cslFile });
    resolvedStyle = resolution.styleName;
    styleXml = resolution.styleXml;
  }

  for (const identifier of identifiers) {
    const result = await generateCitationForIdentifier(library, identifier, idType, inText, {
      style: resolvedStyle,
      styleXml,
      locale,
      format,
    });
    results.push(result);
  }

  return { results };
}
