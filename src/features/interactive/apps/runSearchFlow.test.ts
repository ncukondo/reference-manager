import { describe, expect, it } from "vitest";
import type { CslItem } from "../../../core/csl-json/types.js";
import { toChoice } from "./runSearchFlow.js";

describe("toChoice", () => {
  it("should prepend indicators to meta when item has resources", () => {
    const item: CslItem = {
      id: "test-2024",
      type: "article-journal",
      title: "Test Article",
      URL: "https://example.com",
      issued: { "date-parts": [[2024]] },
      custom: {
        tags: ["ml"],
        attachments: {
          directory: "test-dir",
          files: [{ filename: "fulltext.pdf", role: "fulltext" }],
        },
      },
    };
    const choice = toChoice(item);
    expect(choice.meta).toMatch(/^📄🔗🏷 /);
  });

  it("should not modify meta when item has no resources", () => {
    const item: CslItem = {
      id: "test-2024",
      type: "article-journal",
      title: "Test Article",
      issued: { "date-parts": [[2024]] },
    };
    const choice = toChoice(item);
    // Meta should start with year, no emoji prefix
    expect(choice.meta).toBe("2024 · Journal article");
  });
});
