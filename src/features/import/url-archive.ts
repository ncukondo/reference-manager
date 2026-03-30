import type { Page } from "playwright-core";
import type { UrlArchiveFormat } from "../../config/schema.js";

/**
 * Result of archive creation.
 */
export interface ArchiveResult {
  data: string;
  extension: string;
}

/**
 * Create MHTML archive via Chrome DevTools Protocol.
 */
async function captureMhtml(page: Page): Promise<string> {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { data } = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
    return data;
  } finally {
    await cdp.detach();
  }
}

/**
 * Create single HTML archive from page content.
 */
async function captureHtml(page: Page): Promise<string> {
  return page.evaluate("document.documentElement.outerHTML") as Promise<string>;
}

/**
 * Create an archive of the current page in the specified format.
 *
 * @param page - Playwright page
 * @param format - "mhtml" (CDP snapshot) or "html" (page source)
 * @returns Archive data and file extension
 */
export async function createArchive(page: Page, format: UrlArchiveFormat): Promise<ArchiveResult> {
  if (format === "mhtml") {
    const data = await captureMhtml(page);
    return { data, extension: "mhtml" };
  }

  const data = await captureHtml(page);
  return { data, extension: "html" };
}
