import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryCrossref } from "./crossref-client.js";

// Mock rate limiter
vi.mock("../import/rate-limiter.js", () => ({
  getRateLimiter: () => ({ acquire: vi.fn().mockResolvedValue(undefined) }),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("queryCrossref", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return updates when article has retraction", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "ok",
        message: {
          DOI: "10.1234/test",
          title: ["Test Article"],
          "update-to": [
            {
              type: "retraction",
              DOI: "10.1234/retraction-notice",
              label: "Retraction",
              updated: { "date-parts": [[2024, 6, 1]] },
            },
          ],
        },
      }),
    });

    const result = await queryCrossref("10.1234/test");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.updates).toHaveLength(1);
    expect(result.updates[0].type).toBe("retraction");
    expect(result.updates[0].doi).toBe("10.1234/retraction-notice");
    expect(result.updates[0].date).toBe("2024-06-01");
  });

  it("should return updates when article has expression of concern", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "ok",
        message: {
          DOI: "10.1234/test",
          "update-to": [
            {
              type: "expression-of-concern",
              DOI: "10.1234/concern-notice",
              label: "Expression of Concern",
              updated: { "date-parts": [[2024, 3, 15]] },
            },
          ],
        },
      }),
    });

    const result = await queryCrossref("10.1234/test");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.updates).toHaveLength(1);
    expect(result.updates[0].type).toBe("expression-of-concern");
  });

  it("should return updates when preprint has new version", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "ok",
        message: {
          DOI: "10.1234/preprint",
          "update-to": [
            {
              type: "new_version",
              DOI: "10.5678/published",
              label: "New version",
              updated: { "date-parts": [[2024, 9, 1]] },
            },
          ],
        },
      }),
    });

    const result = await queryCrossref("10.1234/preprint");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.updates).toHaveLength(1);
    expect(result.updates[0].type).toBe("new_version");
    expect(result.updates[0].doi).toBe("10.5678/published");
  });

  it("should return empty updates when no update-to field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "ok",
        message: {
          DOI: "10.1234/clean",
          title: ["Clean Article"],
        },
      }),
    });

    const result = await queryCrossref("10.1234/clean");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.updates).toHaveLength(0);
  });

  it("should handle fetch errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await queryCrossref("10.1234/test");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Network error");
  });

  it("should handle non-ok HTTP responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    const result = await queryCrossref("10.1234/nonexistent");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("404");
  });

  it("should handle multiple updates", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "ok",
        message: {
          DOI: "10.1234/test",
          "update-to": [
            {
              type: "retraction",
              DOI: "10.1234/retraction",
              label: "Retraction",
              updated: { "date-parts": [[2024, 6, 1]] },
            },
            {
              type: "expression-of-concern",
              DOI: "10.1234/concern",
              label: "Expression of Concern",
              updated: { "date-parts": [[2024, 3, 1]] },
            },
          ],
        },
      }),
    });

    const result = await queryCrossref("10.1234/test");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.updates).toHaveLength(2);
  });

  it("should format date correctly from date-parts", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "ok",
        message: {
          DOI: "10.1234/test",
          "update-to": [
            {
              type: "retraction",
              DOI: "10.1234/retraction",
              updated: { "date-parts": [[2024, 1, 5]] },
            },
          ],
        },
      }),
    });

    const result = await queryCrossref("10.1234/test");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.updates[0].date).toBe("2024-01-05");
  });

  it("should include mailto query parameter when email is provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "ok",
        message: { DOI: "10.1234/test" },
      }),
    });

    await queryCrossref("10.1234/test", { email: "user@example.com" });

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("mailto=user%40example.com");
  });

  it("should not include mailto when no email is provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "ok",
        message: { DOI: "10.1234/test" },
      }),
    });

    await queryCrossref("10.1234/test");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).not.toContain("mailto");
  });

  describe("metadata extraction", () => {
    it("should extract metadata from Crossref response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "ok",
          message: {
            DOI: "10.1234/test",
            title: ["A Study of Machine Learning"],
            author: [
              { family: "Smith", given: "John" },
              { family: "Jones", given: "Alice" },
            ],
            "container-title": ["Journal of AI"],
            type: "journal-article",
            page: "123-145",
            volume: "42",
            issue: "3",
            issued: { "date-parts": [[2024, 6, 15]] },
          },
        }),
      });

      const result = await queryCrossref("10.1234/test");

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.title).toBe("A Study of Machine Learning");
      expect(result.metadata?.author).toEqual([
        { family: "Smith", given: "John" },
        { family: "Jones", given: "Alice" },
      ]);
      expect(result.metadata?.containerTitle).toBe("Journal of AI");
      expect(result.metadata?.type).toBe("journal-article");
      expect(result.metadata?.page).toBe("123-145");
      expect(result.metadata?.volume).toBe("42");
      expect(result.metadata?.issue).toBe("3");
      expect(result.metadata?.issued).toEqual({ "date-parts": [[2024, 6, 15]] });
    });

    it("should handle missing metadata fields gracefully", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "ok",
          message: {
            DOI: "10.1234/test",
            title: ["Minimal Article"],
          },
        }),
      });

      const result = await queryCrossref("10.1234/test");

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.title).toBe("Minimal Article");
      expect(result.metadata?.author).toBeUndefined();
      expect(result.metadata?.containerTitle).toBeUndefined();
      expect(result.metadata?.page).toBeUndefined();
    });

    it("should handle empty title array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "ok",
          message: {
            DOI: "10.1234/test",
            title: [],
          },
        }),
      });

      const result = await queryCrossref("10.1234/test");

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.metadata?.title).toBeUndefined();
    });

    it("should extract first title from title array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "ok",
          message: {
            DOI: "10.1234/test",
            title: ["Primary Title", "Subtitle"],
          },
        }),
      });

      const result = await queryCrossref("10.1234/test");

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.metadata?.title).toBe("Primary Title");
    });

    it("should return undefined metadata when message has no recognized fields", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "ok",
          message: {
            DOI: "10.1234/test",
            "some-unknown-field": "value",
          },
        }),
      });

      const result = await queryCrossref("10.1234/test");

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.metadata).toBeUndefined();
    });

    it("should extract first container-title from array", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "ok",
          message: {
            DOI: "10.1234/test",
            title: ["Test"],
            "container-title": ["Journal of Science", "J. Sci."],
          },
        }),
      });

      const result = await queryCrossref("10.1234/test");

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.metadata?.containerTitle).toBe("Journal of Science");
    });
  });

  it("should handle missing date in update-to entry", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: "ok",
        message: {
          DOI: "10.1234/test",
          "update-to": [
            {
              type: "retraction",
              DOI: "10.1234/retraction",
            },
          ],
        },
      }),
    });

    const result = await queryCrossref("10.1234/test");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.updates[0].date).toBeUndefined();
  });
});
