import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
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
}

/**
 * Get the file path of the Readability library for browser injection.
 */
function getReadabilityPath(): string {
  const require = createRequire(import.meta.url);
  return require.resolve("@mozilla/readability/Readability.js");
}

/**
 * Fetch a URL and extract metadata, fulltext, and archive.
 *
 * Pipeline:
 * 1. Launch browser
 * 2. Navigate to URL
 * 3. Inject Readability
 * 4. Extract metadata
 * 5. Generate fulltext (Markdown)
 * 6. Create archive (MHTML/HTML)
 * 7. Close browser
 */
export async function fetchUrl(url: string, options: UrlFetchOptions): Promise<UrlFetchResult> {
  const { urlConfig, noArchive } = options;
  const archiveFormat = options.archiveFormat ?? urlConfig.archiveFormat;

  const browser = await launchBrowser(urlConfig);

  try {
    const page = await browser.newPage();

    // Navigate with configured timeout
    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: urlConfig.timeout * 1000,
    });

    // Inject Readability for fulltext extraction
    try {
      const readabilityPath = getReadabilityPath();
      await page.addScriptTag({ content: readFileSync(readabilityPath, "utf-8") });
    } catch {
      // Readability injection failed; generateFulltext will fall back to full HTML
    }

    // Extract metadata
    const item = await extractMetadata(page);

    // Generate fulltext
    const fulltext = await generateFulltext(page);

    // Create archive (optional, best-effort)
    let archive: ArchiveResult | undefined;
    if (!noArchive) {
      try {
        archive = await createArchive(page, archiveFormat);
      } catch {
        // Archive creation failed — continue without it
      }
    }

    return { item, fulltext, archive };
  } finally {
    await browser.close();
  }
}
