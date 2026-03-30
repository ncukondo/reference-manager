import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Browser, Page } from "playwright-core";
import type { UrlArchiveFormat, UrlConfig } from "../../config/schema.js";
import type { CslItem } from "../../core/csl-json/types.js";
import { launchBrowser } from "./browser.js";
import { type ArchiveResult, createArchive } from "./url-archive.js";
import { generateFulltext } from "./url-fulltext.js";
import { extractMetadata } from "./url-metadata.js";

/**
 * Options for URL fetching.
 */
export interface UrlFetchOptions {
  urlConfig: UrlConfig;
  archiveFormat?: UrlArchiveFormat | undefined;
  noArchive?: boolean | undefined;
}

/**
 * Result of fetching a URL.
 */
export interface UrlFetchResult {
  item: CslItem;
  fulltext: string;
  archive?: ArchiveResult | undefined;
  warnings: string[];
}

/**
 * Get the file path of the Readability library for browser injection.
 */
function getReadabilityPath(): string {
  const require = createRequire(import.meta.url);
  return require.resolve("@mozilla/readability/Readability.js");
}

/** Cached Readability script content (loaded once on first use). */
let readabilityScriptCache: string | undefined;

/**
 * Get the Readability script content, reading from disk only on first call.
 */
function getReadabilityScript(): string {
  if (readabilityScriptCache === undefined) {
    readabilityScriptCache = readFileSync(getReadabilityPath(), "utf-8");
  }
  return readabilityScriptCache;
}

/**
 * Process a single URL in an already-open browser page.
 */
async function processPage(
  page: Page,
  url: string,
  options: { archiveFormat: UrlArchiveFormat; noArchive: boolean; timeout: number }
): Promise<UrlFetchResult> {
  const warnings: string[] = [];

  // Navigate with configured timeout
  await page.goto(url, {
    waitUntil: "networkidle",
    timeout: options.timeout * 1000,
  });

  // Inject Readability for fulltext extraction
  try {
    const readabilityScript = getReadabilityScript();
    await page.addScriptTag({ content: readabilityScript });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    warnings.push(`Readability injection failed: ${msg}`);
  }

  // Extract metadata
  const item = await extractMetadata(page);

  // Generate fulltext
  const fulltext = await generateFulltext(page);

  // Create archive (optional, best-effort)
  let archive: ArchiveResult | undefined;
  if (!options.noArchive) {
    try {
      archive = await createArchive(page, options.archiveFormat);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      warnings.push(`Archive creation failed: ${msg}`);
    }
  }

  return { item, fulltext, archive, warnings };
}

/**
 * Resolve effective options for page processing.
 */
function resolvePageOptions(options: UrlFetchOptions): {
  archiveFormat: UrlArchiveFormat;
  noArchive: boolean;
  timeout: number;
} {
  return {
    archiveFormat: options.archiveFormat ?? options.urlConfig.archiveFormat,
    noArchive: options.noArchive ?? false,
    timeout: options.urlConfig.timeout,
  };
}

/**
 * Fetch a single URL and extract metadata, fulltext, and archive.
 *
 * Launches and closes a browser for this single URL.
 * For multiple URLs, use fetchUrls() to share a browser instance.
 */
export async function fetchUrl(url: string, options: UrlFetchOptions): Promise<UrlFetchResult> {
  const browser = await launchBrowser(options.urlConfig);

  try {
    const page = await browser.newPage();
    try {
      return await processPage(page, url, resolvePageOptions(options));
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

/**
 * Fetch multiple URLs reusing a single browser instance.
 *
 * Each URL is processed sequentially in a new page within the same browser.
 * Returns one result per URL (success or error).
 */
export async function fetchUrls(
  urls: string[],
  options: UrlFetchOptions
): Promise<Map<string, UrlFetchResult | Error>> {
  const results = new Map<string, UrlFetchResult | Error>();

  if (urls.length === 0) {
    return results;
  }

  let browser: Browser;
  try {
    browser = await launchBrowser(options.urlConfig);
  } catch (error) {
    // If browser launch fails, all URLs fail with the same error
    for (const url of urls) {
      results.set(url, error instanceof Error ? error : new Error(String(error)));
    }
    return results;
  }

  const pageOptions = resolvePageOptions(options);

  try {
    for (const url of urls) {
      try {
        const page = await browser.newPage();
        try {
          const result = await processPage(page, url, pageOptions);
          results.set(url, result);
        } finally {
          await page.close();
        }
      } catch (error) {
        results.set(url, error instanceof Error ? error : new Error(String(error)));
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
