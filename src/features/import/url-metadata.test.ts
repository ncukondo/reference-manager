import { describe, expect, it, vi } from "vitest";
import { extractMetadata } from "./url-metadata.js";

describe("extractMetadata", () => {
  function createMockPage(title: string, url: string) {
    return {
      title: vi.fn().mockResolvedValue(title),
      url: vi.fn().mockReturnValue(url),
    };
  }

  it("should extract title from page", async () => {
    const page = createMockPage("Example Page", "https://example.com");
    const result = await extractMetadata(page as never);

    expect(result.title).toBe("Example Page");
  });

  it("should set URL from page", async () => {
    const page = createMockPage("Example", "https://example.com/page?q=test");
    const result = await extractMetadata(page as never);

    expect(result.URL).toBe("https://example.com/page?q=test");
  });

  it("should set type to webpage", async () => {
    const page = createMockPage("Example", "https://example.com");
    const result = await extractMetadata(page as never);

    expect(result.type).toBe("webpage");
  });

  it("should set accessed date to today", async () => {
    const page = createMockPage("Example", "https://example.com");
    const result = await extractMetadata(page as never);

    expect(result.accessed).toBeDefined();
    expect(result.accessed?.["date-parts"]).toBeDefined();
    const parts = result.accessed?.["date-parts"]?.[0];
    expect(parts).toHaveLength(3);
    // Verify it's today's date
    const now = new Date();
    expect(parts?.[0]).toBe(now.getFullYear());
    expect(parts?.[1]).toBe(now.getMonth() + 1);
    expect(parts?.[2]).toBe(now.getDate());
  });

  it("should use URL as title fallback when title is empty", async () => {
    const page = createMockPage("", "https://example.com/page");
    const result = await extractMetadata(page as never);

    expect(result.title).toBe("https://example.com/page");
  });

  it("should set empty id for later generation", async () => {
    const page = createMockPage("Example", "https://example.com");
    const result = await extractMetadata(page as never);

    expect(result.id).toBe("");
  });
});
