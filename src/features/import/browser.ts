import { type Browser, chromium } from "playwright-core";
import type { UrlConfig } from "../../config/schema.js";

/**
 * Error thrown when Chrome/Chromium is not found on the system.
 */
export class BrowserNotFoundError extends Error {
  constructor(cause?: Error) {
    const message = [
      "Browser not found. URL import requires Chrome or Chromium.",
      "",
      "  Install one of the following:",
      "",
      "    Google Chrome:  https://www.google.com/chrome/",
      "    Chromium:       sudo apt install chromium-browser   (Ubuntu/Debian)",
      "                    brew install --cask chromium         (macOS)",
      "",
      "  Or specify the path manually:",
      "",
      "    [url]",
      '    browser_path = "/path/to/chrome"',
    ].join("\n");
    super(message, { cause });
    this.name = "BrowserNotFoundError";
  }
}

/**
 * Launch a headless browser for URL import.
 *
 * Uses system-installed Chrome/Chromium via playwright-core.
 * Falls back to config.browserPath if provided.
 */
export async function launchBrowser(config: UrlConfig): Promise<Browser> {
  try {
    const launchOptions: Parameters<typeof chromium.launch>[0] = {
      headless: true,
    };

    if (config.browserPath) {
      launchOptions.executablePath = config.browserPath;
    } else {
      launchOptions.channel = "chrome";
    }

    return await chromium.launch(launchOptions);
  } catch (error) {
    throw new BrowserNotFoundError(error instanceof Error ? error : undefined);
  }
}
