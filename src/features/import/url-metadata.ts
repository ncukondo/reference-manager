import type { Page } from "playwright-core";
import type { CslItem } from "../../core/csl-json/types.js";

/**
 * Extract basic metadata from a browser page.
 *
 * Phase 1: title (from <title>), URL, accessed date, type: "webpage".
 * Phase 2 will add JSON-LD, citation_*, Dublin Core, Open Graph extraction.
 */
export async function extractMetadata(page: Page): Promise<CslItem> {
  const pageTitle = await page.title();
  const pageUrl = page.url();

  const now = new Date();
  const accessed = {
    "date-parts": [[now.getFullYear(), now.getMonth() + 1, now.getDate()]],
  };

  return {
    id: "",
    type: "webpage",
    title: pageTitle || pageUrl,
    URL: pageUrl,
    accessed,
  };
}
