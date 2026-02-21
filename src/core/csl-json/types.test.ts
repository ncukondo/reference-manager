import { describe, expect, it } from "vitest";
import { CslItemSchema } from "./types.js";

describe("CslCustomSchema typed fields", () => {
  const baseItem = { id: "test-1", type: "article-journal" };

  describe("arxiv_id", () => {
    it("accepts arxiv_id string", () => {
      const result = CslItemSchema.parse({
        ...baseItem,
        custom: { arxiv_id: "2301.13867" },
      });
      expect(result.custom?.arxiv_id).toBe("2301.13867");
    });

    it("accepts arxiv_id with version suffix", () => {
      const result = CslItemSchema.parse({
        ...baseItem,
        custom: { arxiv_id: "2301.13867v2" },
      });
      expect(result.custom?.arxiv_id).toBe("2301.13867v2");
    });

    it("is optional", () => {
      const result = CslItemSchema.parse({
        ...baseItem,
        custom: {},
      });
      expect(result.custom?.arxiv_id).toBeUndefined();
    });
  });

  describe("attachments", () => {
    it("accepts valid attachments object", () => {
      const result = CslItemSchema.parse({
        ...baseItem,
        custom: {
          attachments: {
            directory: "Smith-2024-PMID12345678-123e4567",
            files: [
              { filename: "fulltext.pdf", role: "fulltext" },
              { filename: "fulltext.md", role: "fulltext" },
            ],
          },
        },
      });
      expect(result.custom?.attachments).toEqual({
        directory: "Smith-2024-PMID12345678-123e4567",
        files: [
          { filename: "fulltext.pdf", role: "fulltext" },
          { filename: "fulltext.md", role: "fulltext" },
        ],
      });
    });

    it("accepts attachments with optional label", () => {
      const result = CslItemSchema.parse({
        ...baseItem,
        custom: {
          attachments: {
            directory: "dir",
            files: [{ filename: "notes.txt", role: "notes", label: "My Notes" }],
          },
        },
      });
      expect(result.custom?.attachments?.files[0]?.label).toBe("My Notes");
    });

    it("is optional", () => {
      const result = CslItemSchema.parse({
        ...baseItem,
        custom: {},
      });
      expect(result.custom?.attachments).toBeUndefined();
    });
  });

  describe("check", () => {
    it("accepts valid check data", () => {
      const result = CslItemSchema.parse({
        ...baseItem,
        custom: {
          check: {
            checked_at: "2024-06-01T00:00:00.000Z",
            status: "ok",
            findings: [],
          },
        },
      });
      expect(result.custom?.check).toEqual({
        checked_at: "2024-06-01T00:00:00.000Z",
        status: "ok",
        findings: [],
      });
    });

    it("accepts check data with findings", () => {
      const result = CslItemSchema.parse({
        ...baseItem,
        custom: {
          check: {
            checked_at: "2024-06-01T00:00:00.000Z",
            status: "retracted",
            findings: [
              {
                type: "retracted",
                message: "This article has been retracted",
                details: { retraction_doi: "10.1234/retraction" },
              },
            ],
          },
        },
      });
      expect(result.custom?.check?.findings).toHaveLength(1);
      expect(result.custom?.check?.findings[0]?.type).toBe("retracted");
    });

    it("is optional", () => {
      const result = CslItemSchema.parse({
        ...baseItem,
        custom: {},
      });
      expect(result.custom?.check).toBeUndefined();
    });
  });

  describe("validation", () => {
    it("rejects invalid attachments structure", () => {
      expect(() =>
        CslItemSchema.parse({
          ...baseItem,
          custom: { attachments: "not-an-object" },
        })
      ).toThrow();
    });

    it("rejects attachments missing required fields", () => {
      expect(() =>
        CslItemSchema.parse({
          ...baseItem,
          custom: { attachments: { files: [] } },
        })
      ).toThrow();
    });

    it("rejects invalid check structure", () => {
      expect(() =>
        CslItemSchema.parse({
          ...baseItem,
          custom: { check: "not-an-object" },
        })
      ).toThrow();
    });

    it("rejects check missing required fields", () => {
      expect(() =>
        CslItemSchema.parse({
          ...baseItem,
          custom: { check: { status: "ok" } },
        })
      ).toThrow();
    });

    it("rejects non-string arxiv_id", () => {
      expect(() =>
        CslItemSchema.parse({
          ...baseItem,
          custom: { arxiv_id: 12345 },
        })
      ).toThrow();
    });
  });

  describe("passthrough", () => {
    it("preserves unknown fields in custom", () => {
      const result = CslItemSchema.parse({
        ...baseItem,
        custom: {
          uuid: "abc-123",
          unknown_field: "preserved",
          another: 42,
        },
      });
      expect((result.custom as Record<string, unknown>).unknown_field).toBe("preserved");
      expect((result.custom as Record<string, unknown>).another).toBe(42);
    });

    it("preserves typed and unknown fields together", () => {
      const result = CslItemSchema.parse({
        ...baseItem,
        custom: {
          uuid: "abc-123",
          arxiv_id: "2301.13867",
          attachments: { directory: "dir", files: [] },
          check: { checked_at: "2024-01-01T00:00:00Z", status: "ok", findings: [] },
          external_tool_data: { foo: "bar" },
        },
      });
      expect(result.custom?.uuid).toBe("abc-123");
      expect(result.custom?.arxiv_id).toBe("2301.13867");
      expect(result.custom?.attachments?.directory).toBe("dir");
      expect(result.custom?.check?.status).toBe("ok");
      expect((result.custom as Record<string, unknown>).external_tool_data).toEqual({ foo: "bar" });
    });
  });
});
