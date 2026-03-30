import { describe, expect, it, vi } from "vitest";
import { generateFulltext } from "./url-fulltext.js";

describe("generateFulltext", () => {
  function createMockPage(evaluateResult: { content: string | null; fullHtml: string }) {
    return {
      evaluate: vi.fn().mockResolvedValue(evaluateResult),
    };
  }

  it("should generate markdown from Readability content", async () => {
    const page = createMockPage({
      content: "<h1>Title</h1><p>Hello world</p>",
      fullHtml: "<html><body><h1>Title</h1><p>Hello world</p></body></html>",
    });

    const result = await generateFulltext(page as never);

    expect(result).toContain("Title");
    expect(result).toContain("Hello world");
  });

  it("should fall back to full HTML when Readability returns null", async () => {
    const page = createMockPage({
      content: null,
      fullHtml: "<html><body><p>Fallback content</p></body></html>",
    });

    const result = await generateFulltext(page as never);

    expect(result).toContain("Fallback content");
  });

  it("should convert HTML tables to markdown", async () => {
    const page = createMockPage({
      content: "<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>",
      fullHtml: "",
    });

    const result = await generateFulltext(page as never);

    expect(result).toContain("A");
    expect(result).toContain("B");
    expect(result).toContain("|");
  });

  it("should convert links to markdown", async () => {
    const page = createMockPage({
      content: '<p>Visit <a href="https://example.com">Example</a></p>',
      fullHtml: "",
    });

    const result = await generateFulltext(page as never);

    expect(result).toContain("[Example]");
    expect(result).toContain("(https://example.com)");
  });

  it("should return empty string when both Readability and full HTML are empty", async () => {
    const page = createMockPage({
      content: null,
      fullHtml: "",
    });

    const result = await generateFulltext(page as never);

    expect(result).toBe("");
  });
});
