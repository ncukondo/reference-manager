import { describe, expect, it } from "vitest";
import { extractUuidPrefix, generateDirectoryName, parseDirectoryName } from "./directory.js";

describe("extractUuidPrefix", () => {
  it("should extract first 8 characters of UUID", () => {
    expect(extractUuidPrefix("123e4567-e89b-12d3-a456-426614174000")).toBe("123e4567");
  });

  it("should handle UUID without dashes", () => {
    expect(extractUuidPrefix("123e4567e89b12d3a456426614174000")).toBe("123e4567");
  });

  it("should return full string if shorter than 8 chars", () => {
    expect(extractUuidPrefix("abc")).toBe("abc");
  });
});

describe("generateDirectoryName", () => {
  it("should generate directory name with PMID", () => {
    const ref = {
      id: "Smith-2024",
      PMID: "12345678",
      custom: { uuid: "123e4567-e89b-12d3-a456-426614174000" },
    };
    expect(generateDirectoryName(ref)).toBe("Smith-2024-PMID12345678-123e4567");
  });

  it("should generate directory name without PMID", () => {
    const ref = {
      id: "Smith-2024",
      custom: { uuid: "b5c6d7e8-e89b-12d3-a456-426614174000" },
    };
    expect(generateDirectoryName(ref)).toBe("Smith-2024-b5c6d7e8");
  });

  it("should handle reference with empty PMID", () => {
    const ref = {
      id: "Jones-2023",
      PMID: "",
      custom: { uuid: "abcd1234-e89b-12d3-a456-426614174000" },
    };
    expect(generateDirectoryName(ref)).toBe("Jones-2023-abcd1234");
  });
});

describe("parseDirectoryName", () => {
  it("should parse directory name with PMID", () => {
    const result = parseDirectoryName("Smith-2024-PMID12345678-123e4567");
    expect(result).toEqual({
      id: "Smith-2024",
      pmid: "12345678",
      uuidPrefix: "123e4567",
    });
  });

  it("should parse directory name without PMID", () => {
    const result = parseDirectoryName("Smith-2024-b5c6d7e8");
    expect(result).toEqual({
      id: "Smith-2024",
      pmid: undefined,
      uuidPrefix: "b5c6d7e8",
    });
  });

  it("should parse directory name with complex id", () => {
    const result = parseDirectoryName("Van-der-Berg-2024-PMID99999999-abcdef12");
    expect(result).toEqual({
      id: "Van-der-Berg-2024",
      pmid: "99999999",
      uuidPrefix: "abcdef12",
    });
  });

  it("should parse directory name with id containing numbers", () => {
    const result = parseDirectoryName("Smith2024a-12345678");
    expect(result).toEqual({
      id: "Smith2024a",
      pmid: undefined,
      uuidPrefix: "12345678",
    });
  });

  it("should return null for invalid directory name", () => {
    expect(parseDirectoryName("invalid")).toBeNull();
    expect(parseDirectoryName("")).toBeNull();
    expect(parseDirectoryName("no-uuid-prefix")).toBeNull();
  });
});
