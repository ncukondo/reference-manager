import { describe, expect, it } from "vitest";
import { deserializeFromYaml, extractUuidFromComment } from "./yaml-deserializer.js";

describe("extractUuidFromComment", () => {
  it("extracts UUID from comment block", () => {
    const content = `# === Protected Fields (do not edit) ===
# uuid: 550e8400-e29b-41d4-a716-446655440000
# created_at: 2024-01-01T00:00:00.000Z
# timestamp: 2024-03-15T10:30:00.000Z
# ========================================

- id: Smith-2024`;

    expect(extractUuidFromComment(content)).toBe("550e8400-e29b-41d4-a716-446655440000");
  });

  it("returns undefined when no UUID in comments", () => {
    const content = `- id: Smith-2024
  type: article-journal`;

    expect(extractUuidFromComment(content)).toBeUndefined();
  });

  it("returns undefined for empty content", () => {
    expect(extractUuidFromComment("")).toBeUndefined();
  });
});

describe("deserializeFromYaml", () => {
  it("parses valid YAML", () => {
    const yaml = `- id: Smith-2024
  type: article-journal
  title: Test Article`;

    const result = deserializeFromYaml(yaml);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "Smith-2024",
      type: "article-journal",
      title: "Test Article",
    });
  });

  it("extracts UUID from comment block and attaches to result", () => {
    const yaml = `# === Protected Fields (do not edit) ===
# uuid: 550e8400-e29b-41d4-a716-446655440000
# created_at: 2024-01-01T00:00:00.000Z
# timestamp: 2024-03-15T10:30:00.000Z
# ========================================

- id: Smith-2024
  type: article-journal
  title: Test Article`;

    const result = deserializeFromYaml(yaml);
    expect(result).toHaveLength(1);
    expect((result[0] as Record<string, unknown>)._extractedUuid).toBe(
      "550e8400-e29b-41d4-a716-446655440000"
    );
  });

  it("transforms ISO date strings back to date-parts", () => {
    const yaml = `- id: Smith-2024
  type: article-journal
  issued: "2024-03-15"`;

    const result = deserializeFromYaml(yaml);
    const item = result[0] as Record<string, unknown>;
    expect(item.issued).toEqual({ "date-parts": [[2024, 3, 15]] });
  });

  it("transforms partial ISO date strings", () => {
    const yaml = `- id: Smith-2024
  type: article-journal
  issued: "2024-03"`;

    const result = deserializeFromYaml(yaml);
    const item = result[0] as Record<string, unknown>;
    expect(item.issued).toEqual({ "date-parts": [[2024, 3]] });
  });

  it("transforms year-only dates", () => {
    const yaml = `- id: Smith-2024
  type: article-journal
  issued: "2024"`;

    const result = deserializeFromYaml(yaml);
    const item = result[0] as Record<string, unknown>;
    expect(item.issued).toEqual({ "date-parts": [[2024]] });
  });

  it("throws error for invalid YAML", () => {
    const invalidYaml = `- id: Smith-2024
  type: [invalid`;

    expect(() => deserializeFromYaml(invalidYaml)).toThrow();
  });

  it("preserves keyword array", () => {
    const yaml = `- id: Smith-2024
  type: article-journal
  keyword:
    - machine learning
    - deep learning`;

    const result = deserializeFromYaml(yaml);
    const item = result[0] as Record<string, unknown>;
    expect(item.keyword).toEqual(["machine learning", "deep learning"]);
  });

  it("handles multiple documents separated by ---", () => {
    const yaml = `# === Protected Fields (do not edit) ===
# uuid: uuid-1
# ========================================

- id: Smith-2024
  type: article-journal

---

# === Protected Fields (do not edit) ===
# uuid: uuid-2
# ========================================

- id: Doe-2023
  type: book`;

    const result = deserializeFromYaml(yaml);
    expect(result).toHaveLength(2);
    expect((result[0] as Record<string, unknown>)._extractedUuid).toBe("uuid-1");
    expect((result[1] as Record<string, unknown>)._extractedUuid).toBe("uuid-2");
  });
});
