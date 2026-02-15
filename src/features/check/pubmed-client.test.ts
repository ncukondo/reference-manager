import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { queryPubmed } from "./pubmed-client.js";

// Mock rate limiter
vi.mock("../import/rate-limiter.js", () => ({
  getRateLimiter: () => ({ acquire: vi.fn().mockResolvedValue(undefined) }),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("queryPubmed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should detect retraction via PubMed", async () => {
    // esummary returns article info
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          "12345678": {
            uid: "12345678",
            pubtype: ["Journal Article", "Retracted Publication"],
            title: "Retracted Article Title",
          },
        },
      }),
    });

    const result = await queryPubmed("12345678");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.isRetracted).toBe(true);
  });

  it("should detect non-retracted article", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          "12345678": {
            uid: "12345678",
            pubtype: ["Journal Article"],
            title: "Normal Article",
          },
        },
      }),
    });

    const result = await queryPubmed("12345678");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.isRetracted).toBe(false);
  });

  it("should detect retraction notice", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          "12345678": {
            uid: "12345678",
            pubtype: ["Retraction of Publication"],
            title: "Retraction: Some Article",
          },
        },
      }),
    });

    const result = await queryPubmed("12345678");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.isRetracted).toBe(true);
  });

  it("should handle fetch errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await queryPubmed("12345678");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("Network error");
  });

  it("should handle non-ok HTTP responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const result = await queryPubmed("12345678");

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toContain("500");
  });

  it("should handle missing PMID in response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {},
      }),
    });

    const result = await queryPubmed("99999999");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.isRetracted).toBe(false);
  });

  it("should detect expression of concern via pubtype", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          "12345678": {
            uid: "12345678",
            pubtype: ["Journal Article", "Expression of Concern"],
            title: "Article with Concern",
          },
        },
      }),
    });

    const result = await queryPubmed("12345678");

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.hasConcern).toBe(true);
  });
});
