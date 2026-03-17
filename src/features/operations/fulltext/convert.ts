/**
 * Fulltext convert operation.
 *
 * Converts an attached fulltext file (PMC JATS XML or PDF) to Markdown.
 */

import { access } from "node:fs/promises";
import { join } from "node:path";
import { convertPmcXmlToMarkdown } from "@ncukondo/academic-fulltext";
import type { FulltextConfig } from "../../../config/schema.js";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import { fulltextAttach } from "./attach.js";
import { resolveConverter } from "./converter-resolver.js";

export interface FulltextConvertOptions {
  /** Reference identifier (id or uuid) */
  identifier: string;
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType | undefined;
  /** Directory for fulltext attachments */
  fulltextDirectory: string;
  /** Input format: "xml", "pdf", or undefined for auto-detect */
  from?: "xml" | "pdf" | undefined;
  /** Converter name or "auto" */
  converter?: string | undefined;
  /** Force re-conversion (overwrite existing markdown) */
  force?: boolean | undefined;
  /** Fulltext config for converter settings */
  fulltextConfig?: FulltextConfig | undefined;
}

export interface FulltextConvertResult {
  success: boolean;
  error?: string;
  /** The converted markdown filename */
  filename?: string;
  /** Error hints for the user */
  hints?: string;
  /** Error code for structured error handling */
  code?: string;
  /** Converter stderr output (on failure) */
  stderr?: string;
}

function findXmlFile(item: CslItem): string | undefined {
  const attachments = item.custom?.attachments;
  if (!attachments?.files) return undefined;

  const xmlFile = attachments.files.find(
    (f) => f.role === "fulltext" && f.filename.endsWith(".xml")
  );
  return xmlFile?.filename;
}

function findPdfFile(item: CslItem): string | undefined {
  const attachments = item.custom?.attachments;
  if (!attachments?.files) return undefined;

  const pdfFile = attachments.files.find(
    (f) => f.role === "fulltext" && f.filename.endsWith(".pdf")
  );
  return pdfFile?.filename;
}

function getFilePath(item: CslItem, filename: string, fulltextDirectory: string): string {
  const attachments = item.custom?.attachments;
  const directory = attachments?.directory ?? "";
  return join(fulltextDirectory, directory, filename);
}

export async function fulltextConvert(
  library: ILibrary,
  options: FulltextConvertOptions
): Promise<FulltextConvertResult> {
  const { identifier, idType = "id", from } = options;

  const item = await library.find(identifier, { idType });
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  // Determine input format
  const format = resolveFormat(item, from);
  if (!format.success) {
    return format.result;
  }

  if (format.type === "xml") {
    return convertXml(library, item, options);
  }

  return convertPdf(library, item, options);
}

function resolveFormat(
  item: CslItem,
  from?: "xml" | "pdf"
): { success: true; type: "xml" | "pdf" } | { success: false; result: FulltextConvertResult } {
  const hasXml = findXmlFile(item) !== undefined;
  const hasPdf = findPdfFile(item) !== undefined;

  if (from === "xml") {
    if (!hasXml) {
      return {
        success: false,
        result: {
          success: false,
          error: `No PMC XML file attached to '${item.id}'`,
        },
      };
    }
    return { success: true, type: "xml" };
  }

  if (from === "pdf") {
    if (!hasPdf) {
      return {
        success: false,
        result: {
          success: false,
          error: `No PDF file attached to '${item.id}'`,
          code: "no-pdf",
          hints: [
            "This reference has no fulltext PDF. You can:",
            `  1. Download OA fulltext:  ref fulltext fetch ${item.id}`,
            `  2. Attach a local PDF:    ref fulltext attach ${item.id} /path/to/paper.pdf`,
          ].join("\n"),
        },
      };
    }
    return { success: true, type: "pdf" };
  }

  // Auto-detect: XML preferred over PDF
  if (hasXml) return { success: true, type: "xml" };
  if (hasPdf) return { success: true, type: "pdf" };

  return {
    success: false,
    result: {
      success: false,
      error: `No PMC XML file attached to '${item.id}'`,
    },
  };
}

async function convertXml(
  library: ILibrary,
  item: CslItem,
  options: FulltextConvertOptions
): Promise<FulltextConvertResult> {
  const { identifier, idType = "id", fulltextDirectory } = options;

  const xmlFilename = findXmlFile(item);
  if (!xmlFilename) {
    return { success: false, error: `No PMC XML file attached to '${identifier}'` };
  }

  const xmlPath = getFilePath(item, xmlFilename, fulltextDirectory);

  try {
    await access(xmlPath);
  } catch {
    return { success: false, error: `XML file not found on disk: ${xmlPath}` };
  }

  const mdPath = xmlPath.replace(/\.xml$/, ".md");
  const convertResult = await convertPmcXmlToMarkdown(xmlPath, mdPath);
  if (!convertResult.success) {
    return {
      success: false,
      error: `Failed to convert PMC XML to Markdown: ${convertResult.error ?? "unknown error"}`,
    };
  }

  const attachResult = await fulltextAttach(library, {
    identifier,
    idType,
    filePath: mdPath,
    type: "markdown",
    force: true,
    move: true,
    fulltextDirectory,
  });

  if (!attachResult.success) {
    return { success: false, error: attachResult.error ?? "Attach failed" };
  }

  return {
    success: true,
    filename: attachResult.filename ?? "fulltext.md",
  };
}

async function convertPdf(
  library: ILibrary,
  item: CslItem,
  options: FulltextConvertOptions
): Promise<FulltextConvertResult> {
  const { identifier, idType = "id", fulltextDirectory, fulltextConfig } = options;
  const converterName = options.converter ?? fulltextConfig?.pdfConverter ?? "auto";

  const pdfFilename = findPdfFile(item);
  if (!pdfFilename) {
    return { success: false, error: `No PDF file attached to '${identifier}'`, code: "no-pdf" };
  }

  const pdfPath = getFilePath(item, pdfFilename, fulltextDirectory);

  try {
    await access(pdfPath);
  } catch {
    return { success: false, error: `PDF file not found on disk: ${pdfPath}` };
  }

  // Resolve converter
  const resolveResult = await resolveConverter(converterName, {
    priority: fulltextConfig?.pdfConverterPriority ?? ["marker", "docling", "mineru", "pymupdf"],
    customConverters: fulltextConfig?.converters ?? {},
  });

  if (!resolveResult.success) {
    const result: FulltextConvertResult = {
      success: false,
      error: resolveResult.error,
      code: resolveResult.code,
    };
    if (resolveResult.hints) {
      result.hints = resolveResult.hints;
    }
    return result;
  }

  // Run conversion
  const mdPath = pdfPath.replace(/\.pdf$/, ".md");
  const pdfResult = await resolveResult.converter.convert(pdfPath, mdPath);

  if (!pdfResult.success) {
    const result: FulltextConvertResult = {
      success: false,
      error: `Failed to convert PDF to Markdown using ${resolveResult.converter.name}: ${pdfResult.error}`,
      code: pdfResult.code,
    };
    if (pdfResult.stderr) {
      result.stderr = pdfResult.stderr;
    }
    return result;
  }

  // Attach the converted markdown
  const attachResult = await fulltextAttach(library, {
    identifier,
    idType,
    filePath: mdPath,
    type: "markdown",
    force: true,
    move: true,
    fulltextDirectory,
  });

  if (!attachResult.success) {
    return { success: false, error: attachResult.error ?? "Attach failed" };
  }

  return {
    success: true,
    filename: attachResult.filename ?? "fulltext.md",
  };
}
