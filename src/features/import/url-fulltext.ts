import type { Page } from "playwright-core";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

/**
 * Result from in-browser content extraction.
 * Readability content may be null if extraction fails.
 */
interface ExtractedContent {
  content: string | null;
  fullHtml: string;
}

/**
 * Extract content from the page in the browser context.
 * Readability must be injected via addScriptTag before calling this.
 */
async function extractContent(page: Page): Promise<ExtractedContent> {
  // page.evaluate runs in the browser context where document is available.
  // The function is serialized and sent to the browser, so we use
  // Function constructor pattern to avoid TypeScript DOM reference errors.
  return page.evaluate(`
    (() => {
      let content = null;
      try {
        if (typeof Readability !== "undefined") {
          const reader = new Readability(document.cloneNode(true));
          const article = reader.parse();
          content = article ? article.content : null;
        }
      } catch (e) {}
      return {
        content: content,
        fullHtml: document.documentElement.outerHTML,
      };
    })()
  `) as Promise<ExtractedContent>;
}

/**
 * Convert HTML to Markdown using Turndown with GFM support.
 */
function htmlToMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });
  turndown.use(gfm);
  return turndown.turndown(html);
}

/**
 * Generate Markdown fulltext from a browser page.
 *
 * Uses Readability (in-browser) for clean HTML extraction,
 * then Turndown (Node.js) for HTML → Markdown conversion.
 * Falls back to full page HTML if Readability returns null.
 */
export async function generateFulltext(page: Page): Promise<string> {
  const extracted = await extractContent(page);

  const html = extracted.content ?? extracted.fullHtml;
  if (!html) {
    return "";
  }

  return htmlToMarkdown(html);
}
