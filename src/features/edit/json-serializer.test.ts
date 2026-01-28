import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { deserializeFromJson, serializeToJson } from "./json-serializer.js";

describe("serializeToJson", () => {
  const baseItem: CslItem = {
    id: "Smith-2024",
    type: "article-journal",
    title: "Test Article",
    custom: {
      uuid: "550e8400-e29b-41d4-a716-446655440000",
      created_at: "2024-01-01T00:00:00.000Z",
      timestamp: "2024-03-15T10:30:00.000Z",
    },
  };

  it("serializes with _protected nested object", () => {
    const json = serializeToJson([baseItem]);
    const parsed = JSON.parse(json);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]._protected).toBeDefined();
    expect(parsed[0]._protected.uuid).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(parsed[0]._protected.created_at).toBe("2024-01-01T00:00:00.000Z");
    expect(parsed[0]._protected.timestamp).toBe("2024-03-15T10:30:00.000Z");
  });

  it("transforms date-parts to ISO string", () => {
    const itemWithDate: CslItem = {
      ...baseItem,
      issued: { "date-parts": [[2024, 3, 15]] },
    };
    const json = serializeToJson([itemWithDate]);
    const parsed = JSON.parse(json);

    expect(parsed[0].issued).toBe("2024-03-15");
  });

  it("preserves keyword as array", () => {
    const itemWithKeywords: CslItem = {
      ...baseItem,
      keyword: ["machine learning", "deep learning"],
    };
    const json = serializeToJson([itemWithKeywords]);
    const parsed = JSON.parse(json);

    expect(parsed[0].keyword).toEqual(["machine learning", "deep learning"]);
  });

  it("removes protected fields from custom object", () => {
    const itemWithExtraCustom: CslItem = {
      ...baseItem,
      custom: {
        uuid: baseItem.custom?.uuid ?? "",
        created_at: baseItem.custom?.created_at ?? "",
        timestamp: baseItem.custom?.timestamp ?? "",
        tags: ["important"],
      },
    };
    const json = serializeToJson([itemWithExtraCustom]);
    const parsed = JSON.parse(json);

    // custom should only have non-protected fields
    expect(parsed[0].custom).toBeDefined();
    expect(parsed[0].custom.tags).toEqual(["important"]);
    expect(parsed[0].custom.uuid).toBeUndefined();
  });
});

describe("deserializeFromJson", () => {
  it("parses valid JSON array", () => {
    const json = JSON.stringify([
      {
        id: "Smith-2024",
        type: "article-journal",
        title: "Test Article",
      },
    ]);

    const result = deserializeFromJson(json);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "Smith-2024",
      type: "article-journal",
      title: "Test Article",
    });
  });

  it("extracts UUID from _protected and attaches to result", () => {
    const json = JSON.stringify([
      {
        _protected: {
          uuid: "550e8400-e29b-41d4-a716-446655440000",
        },
        id: "Smith-2024",
        type: "article-journal",
      },
    ]);

    const result = deserializeFromJson(json);
    expect((result[0] as Record<string, unknown>)._extractedUuid).toBe(
      "550e8400-e29b-41d4-a716-446655440000"
    );
  });

  it("ignores _protected fields in result", () => {
    const json = JSON.stringify([
      {
        _protected: {
          uuid: "550e8400-e29b-41d4-a716-446655440000",
          created_at: "2024-01-01T00:00:00.000Z",
        },
        id: "Smith-2024",
        type: "article-journal",
      },
    ]);

    const result = deserializeFromJson(json);
    expect((result[0] as Record<string, unknown>)._protected).toBeUndefined();
  });

  it("transforms ISO date strings back to date-parts", () => {
    const json = JSON.stringify([
      {
        id: "Smith-2024",
        type: "article-journal",
        issued: "2024-03-15",
      },
    ]);

    const result = deserializeFromJson(json);
    const item = result[0] as Record<string, unknown>;
    expect(item.issued).toEqual({ "date-parts": [[2024, 3, 15]] });
  });

  it("throws error for invalid JSON", () => {
    expect(() => deserializeFromJson("invalid json")).toThrow();
  });
});
