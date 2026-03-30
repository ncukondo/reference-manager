import { afterEach, describe, expect, it, vi } from "vitest";
import type { UrlConfig } from "../../config/schema.js";

// Mock playwright-core
vi.mock("playwright-core", () => ({
  chromium: {
    launch: vi.fn(),
  },
}));

import { chromium } from "playwright-core";
import { BrowserNotFoundError, launchBrowser } from "./browser.js";

const mockLaunch = vi.mocked(chromium.launch);

const defaultUrlConfig: UrlConfig = {
  archiveFormat: "mhtml",
  browserPath: "",
  timeout: 30,
};

describe("launchBrowser", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should launch browser with channel chrome when no browserPath", async () => {
    const mockBrowser = { close: vi.fn() };
    mockLaunch.mockResolvedValue(mockBrowser as never);

    const browser = await launchBrowser(defaultUrlConfig);

    expect(mockLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "chrome", headless: true })
    );
    expect(browser).toBe(mockBrowser);
  });

  it("should use custom browserPath when provided", async () => {
    const mockBrowser = { close: vi.fn() };
    mockLaunch.mockResolvedValue(mockBrowser as never);

    const config: UrlConfig = { ...defaultUrlConfig, browserPath: "/usr/bin/chromium" };
    await launchBrowser(config);

    expect(mockLaunch).toHaveBeenCalledWith(
      expect.objectContaining({ executablePath: "/usr/bin/chromium" })
    );
  });

  it("should throw BrowserNotFoundError when browser not found", async () => {
    mockLaunch.mockRejectedValue(new Error("Failed to launch"));

    await expect(launchBrowser(defaultUrlConfig)).rejects.toThrow(BrowserNotFoundError);
  });

  it("should include installation hints in BrowserNotFoundError message", async () => {
    mockLaunch.mockRejectedValue(new Error("Failed to launch"));

    try {
      await launchBrowser(defaultUrlConfig);
      expect.fail("Should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(BrowserNotFoundError);
      expect((error as BrowserNotFoundError).message).toContain("Browser not found");
      expect((error as BrowserNotFoundError).message).toContain("Chrome");
    }
  });
});
