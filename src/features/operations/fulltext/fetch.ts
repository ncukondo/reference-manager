/**
 * Fulltext fetch operation.
 *
 * Discovers OA sources, downloads full-text files (PDF, PMC XML),
 * converts XML to Markdown, and attaches them to references.
 */

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type DiscoveryArticle,
  type DiscoveryConfig,
  type OALocation,
  convertPmcXmlToMarkdown,
  discoverOA,
  downloadPdf,
  downloadPmcXml,
} from "@ncukondo/academic-fulltext";
import type { FulltextConfig, FulltextSource } from "../../../config/schema.js";
import type { CslItem } from "../../../core/csl-json/types.js";
import type { ILibrary, IdentifierType } from "../../../core/library-interface.js";
import { fulltextAttach } from "./attach.js";
import { fulltextGet } from "./get.js";

export interface FulltextFetchOptions {
  /** Reference identifier (id or uuid) */
  identifier: string;
  /** Identifier type: 'id' (default), 'uuid', 'doi', 'pmid', or 'isbn' */
  idType?: IdentifierType | undefined;
  /** Fulltext configuration */
  fulltextConfig: FulltextConfig;
  /** Directory for fulltext attachments */
  fulltextDirectory: string;
  /** Preferred source to fetch from */
  source?: FulltextSource | undefined;
  /** Force overwrite existing fulltext */
  force?: boolean | undefined;
}

export interface FulltextFetchResult {
  success: boolean;
  error?: string;
  /** The reference ID used for display */
  referenceId?: string;
  /** Which source was used */
  source?: string;
  /** Which file types were attached */
  attachedFiles?: string[];
}

interface AttachContext {
  library: ILibrary;
  identifier: string;
  idType: IdentifierType;
  fulltextDirectory: string;
  force: boolean;
}

function buildDiscoveryArticle(item: CslItem): DiscoveryArticle {
  const article: DiscoveryArticle = {};
  if (item.DOI) article.doi = item.DOI;
  if (item.PMID) article.pmid = item.PMID;
  if (item.PMCID) article.pmcid = item.PMCID;
  return article;
}

function buildDiscoveryConfig(fulltextConfig: FulltextConfig): DiscoveryConfig {
  return {
    unpaywallEmail: fulltextConfig.sources.unpaywallEmail ?? "",
    coreApiKey: fulltextConfig.sources.coreApiKey ?? "",
    preferSources: fulltextConfig.preferSources,
  };
}

async function tryDownloadPdf(
  locations: OALocation[],
  tempDir: string,
  ctx: AttachContext
): Promise<{ attached: boolean; source: string }> {
  const pdfLocation = locations.find((loc) => loc.urlType === "pdf");
  if (!pdfLocation) return { attached: false, source: "" };

  const pdfPath = join(tempDir, "fulltext.pdf");
  const pdfResult = await downloadPdf(pdfLocation.url, pdfPath);
  if (!pdfResult.success) return { attached: false, source: pdfLocation.source };

  const attachResult = await fulltextAttach(ctx.library, {
    identifier: ctx.identifier,
    idType: ctx.idType,
    filePath: pdfPath,
    type: "pdf",
    force: ctx.force,
    move: true,
    fulltextDirectory: ctx.fulltextDirectory,
  });

  return { attached: attachResult.success, source: pdfLocation.source };
}

async function tryDownloadPmcXmlAndConvert(
  pmcid: string,
  tempDir: string,
  ctx: AttachContext
): Promise<boolean> {
  const xmlPath = join(tempDir, "fulltext.xml");
  const xmlResult = await downloadPmcXml(pmcid, xmlPath);
  if (!xmlResult.success) return false;

  const mdPath = join(tempDir, "fulltext.md");
  const convertResult = await convertPmcXmlToMarkdown(xmlPath, mdPath);
  if (!convertResult.success) return false;

  const attachResult = await fulltextAttach(ctx.library, {
    identifier: ctx.identifier,
    idType: ctx.idType,
    filePath: mdPath,
    type: "markdown",
    force: ctx.force,
    move: true,
    fulltextDirectory: ctx.fulltextDirectory,
  });

  return attachResult.success;
}

async function checkExistingFulltext(
  library: ILibrary,
  identifier: string,
  idType: IdentifierType,
  fulltextDirectory: string
): Promise<boolean> {
  const existing = await fulltextGet(library, { identifier, idType, fulltextDirectory });
  return existing.success && existing.paths !== undefined;
}

export async function fulltextFetch(
  library: ILibrary,
  options: FulltextFetchOptions
): Promise<FulltextFetchResult> {
  const { identifier, idType = "id", fulltextConfig, fulltextDirectory, source, force } = options;

  const item = await library.find(identifier, { idType });
  if (!item) {
    return { success: false, error: `Reference '${identifier}' not found` };
  }

  if (!item.DOI && !item.PMID) {
    return {
      success: false,
      error: `No DOI or PMID found for ${identifier}. Cannot discover OA sources.`,
    };
  }

  if (!force && (await checkExistingFulltext(library, identifier, idType, fulltextDirectory))) {
    return {
      success: false,
      error: `Fulltext already attached to ${identifier}. Use --force to overwrite.`,
    };
  }

  const discovery = await discoverOA(
    buildDiscoveryArticle(item),
    buildDiscoveryConfig(fulltextConfig)
  );

  let locations = discovery.locations;
  if (source) {
    locations = locations.filter((loc) => loc.source === source);
  }

  if (locations.length === 0) {
    return { success: false, error: `No OA sources found for ${identifier}` };
  }

  const tempDir = await mkdtemp(join(tmpdir(), "ref-fulltext-"));
  const ctx: AttachContext = {
    library,
    identifier,
    idType,
    fulltextDirectory,
    force: force ?? false,
  };

  try {
    return await downloadAndAttach(locations, item.PMCID, tempDir, ctx, item.id, identifier);
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function downloadAndAttach(
  locations: OALocation[],
  pmcid: string | undefined,
  tempDir: string,
  ctx: AttachContext,
  referenceId: string,
  identifier: string
): Promise<FulltextFetchResult> {
  const attachedFiles: string[] = [];
  let usedSource = "";

  const pdfResult = await tryDownloadPdf(locations, tempDir, ctx);
  if (pdfResult.attached) {
    attachedFiles.push("pdf");
    usedSource = pdfResult.source;
  }

  if (pmcid) {
    const mdAttached = await tryDownloadPmcXmlAndConvert(pmcid, tempDir, ctx);
    if (mdAttached) {
      attachedFiles.push("markdown");
      if (!usedSource) usedSource = "pmc";
    }
  }

  if (attachedFiles.length === 0) {
    const pdfLocation = locations.find((loc) => loc.urlType === "pdf");
    if (pdfLocation) {
      return {
        success: false,
        error: `Failed to download from ${pdfLocation.source}: download failed`,
      };
    }
    return { success: false, error: `Failed to download fulltext for ${identifier}` };
  }

  return {
    success: true,
    referenceId,
    source: usedSource,
    attachedFiles,
  };
}
