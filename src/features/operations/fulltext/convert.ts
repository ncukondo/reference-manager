/**
 * Fulltext convert operation.
 *
 * Converts an attached PMC JATS XML file to Markdown.
 */

import { access } from "node:fs/promises";
import { join } from "node:path";
import { convertPmcXmlToMarkdown } from "@ncukondo/academic-fulltext";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import { fulltextAttach } from "./attach.js";

export interface FulltextConvertOptions {
  /** Reference identifier (id or uuid) */
  identifier: string;
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType | undefined;
  /** Directory for fulltext attachments */
  fulltextDirectory: string;
}

export interface FulltextConvertResult {
  success: boolean;
  error?: string;
  /** The converted markdown filename */
  filename?: string;
}

function findXmlFile(item: CslItem): string | undefined {
  const attachments = item.custom?.attachments;
  if (!attachments?.files) return undefined;

  const xmlFile = attachments.files.find(
    (f) => f.role === "fulltext" && f.filename.endsWith(".xml")
  );
  return xmlFile?.filename;
}

function getXmlPath(item: CslItem, xmlFilename: string, fulltextDirectory: string): string {
  const attachments = item.custom?.attachments;
  const directory = attachments?.directory ?? "";
  return join(fulltextDirectory, directory, xmlFilename);
}

export async function fulltextConvert(
  library: ILibrary,
  options: FulltextConvertOptions
): Promise<FulltextConvertResult> {
  const { identifier, idType = "id", fulltextDirectory } = options;

  const item = await library.find(identifier, { idType });
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  const xmlFilename = findXmlFile(item as CslItem);
  if (!xmlFilename) {
    return { success: false, error: `No PMC XML file attached to '${identifier}'` };
  }

  const xmlPath = getXmlPath(item as CslItem, xmlFilename, fulltextDirectory);

  // Verify file exists on disk
  try {
    await access(xmlPath);
  } catch {
    return { success: false, error: `XML file not found on disk: ${xmlPath}` };
  }

  // Convert to temp file then attach
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
