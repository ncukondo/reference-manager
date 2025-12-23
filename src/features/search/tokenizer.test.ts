import { describe, expect, it } from "vitest";
import { tokenize } from "./tokenizer.js";

describe("tokenizer", () => {
  describe("basic tokenization", () => {
    it("should tokenize a single word", () => {
      const result = tokenize("machine");
      expect(result.original).toBe("machine");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]).toEqual({
        raw: "machine",
        value: "machine",
        field: undefined,
        isPhrase: false,
      });
    });

    it("should tokenize multiple words separated by spaces", () => {
      const result = tokenize("machine learning 2020");
      expect(result.original).toBe("machine learning 2020");
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0].value).toBe("machine");
      expect(result.tokens[1].value).toBe("learning");
      expect(result.tokens[2].value).toBe("2020");
    });

    it("should handle multiple consecutive spaces", () => {
      const result = tokenize("machine   learning");
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].value).toBe("machine");
      expect(result.tokens[1].value).toBe("learning");
    });

    it("should handle leading and trailing spaces", () => {
      const result = tokenize("  machine learning  ");
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].value).toBe("machine");
      expect(result.tokens[1].value).toBe("learning");
    });

    it("should return empty tokens for empty string", () => {
      const result = tokenize("");
      expect(result.original).toBe("");
      expect(result.tokens).toHaveLength(0);
    });

    it("should return empty tokens for whitespace-only string", () => {
      const result = tokenize("   ");
      expect(result.tokens).toHaveLength(0);
    });
  });

  describe("phrase search", () => {
    it("should treat quoted text as a single phrase", () => {
      const result = tokenize('"machine learning"');
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]).toEqual({
        raw: '"machine learning"',
        value: "machine learning",
        field: undefined,
        isPhrase: true,
      });
    });

    it("should handle multiple phrases", () => {
      const result = tokenize('"deep learning" "neural networks"');
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].value).toBe("deep learning");
      expect(result.tokens[0].isPhrase).toBe(true);
      expect(result.tokens[1].value).toBe("neural networks");
      expect(result.tokens[1].isPhrase).toBe(true);
    });

    it("should handle mixed phrases and non-phrases", () => {
      const result = tokenize('author:Smith "machine learning" 2020');
      expect(result.tokens).toHaveLength(3);
      expect(result.tokens[0].value).toBe("Smith");
      expect(result.tokens[0].field).toBe("author");
      expect(result.tokens[0].isPhrase).toBe(false);
      expect(result.tokens[1].value).toBe("machine learning");
      expect(result.tokens[1].isPhrase).toBe(true);
      expect(result.tokens[2].value).toBe("2020");
      expect(result.tokens[2].isPhrase).toBe(false);
    });

    it("should handle unclosed quotes as regular text", () => {
      const result = tokenize('"machine learning');
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].value).toBe('"machine');
      expect(result.tokens[0].isPhrase).toBe(false);
      expect(result.tokens[1].value).toBe("learning");
      expect(result.tokens[1].isPhrase).toBe(false);
    });

    it("should handle empty quotes", () => {
      const result = tokenize('""');
      expect(result.tokens).toHaveLength(0);
    });
  });

  describe("field-specified search", () => {
    it("should parse author field", () => {
      const result = tokenize("author:Smith");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]).toEqual({
        raw: "author:Smith",
        value: "Smith",
        field: "author",
        isPhrase: false,
      });
    });

    it("should parse title field", () => {
      const result = tokenize("title:Introduction");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].field).toBe("title");
      expect(result.tokens[0].value).toBe("Introduction");
    });

    it("should parse year field", () => {
      const result = tokenize("year:2020");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].field).toBe("year");
      expect(result.tokens[0].value).toBe("2020");
    });

    it("should parse doi field", () => {
      const result = tokenize("doi:10.1234/example");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].field).toBe("doi");
      expect(result.tokens[0].value).toBe("10.1234/example");
    });

    it("should parse pmid field", () => {
      const result = tokenize("pmid:12345678");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].field).toBe("pmid");
      expect(result.tokens[0].value).toBe("12345678");
    });

    it("should parse pmcid field", () => {
      const result = tokenize("pmcid:PMC1234567");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].field).toBe("pmcid");
      expect(result.tokens[0].value).toBe("PMC1234567");
    });

    it("should parse url field", () => {
      const result = tokenize("url:https://example.com");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].field).toBe("url");
      expect(result.tokens[0].value).toBe("https://example.com");
    });

    it("should parse keyword field", () => {
      const result = tokenize("keyword:neuroscience");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].field).toBe("keyword");
      expect(result.tokens[0].value).toBe("neuroscience");
    });

    it("should parse tag field", () => {
      const result = tokenize("tag:review");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]).toEqual({
        raw: "tag:review",
        value: "review",
        field: "tag",
        isPhrase: false,
      });
    });

    it("should parse tag field with different value", () => {
      const result = tokenize("tag:important");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]).toEqual({
        raw: "tag:important",
        value: "important",
        field: "tag",
        isPhrase: false,
      });
    });

    it("should handle field with phrase", () => {
      const result = tokenize('author:"John Smith"');
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0]).toEqual({
        raw: 'author:"John Smith"',
        value: "John Smith",
        field: "author",
        isPhrase: true,
      });
    });

    it("should handle multiple field-specified tokens", () => {
      const result = tokenize("author:Smith year:2020");
      expect(result.tokens).toHaveLength(2);
      expect(result.tokens[0].field).toBe("author");
      expect(result.tokens[0].value).toBe("Smith");
      expect(result.tokens[1].field).toBe("year");
      expect(result.tokens[1].value).toBe("2020");
    });

    it("should treat unknown field as regular text", () => {
      const result = tokenize("unknown:value");
      expect(result.tokens).toHaveLength(1);
      expect(result.tokens[0].field).toBeUndefined();
      expect(result.tokens[0].value).toBe("unknown:value");
    });

    it("should handle colon without value", () => {
      const result = tokenize("author:");
      expect(result.tokens).toHaveLength(0);
    });

    it("should handle field:value with spaces around colon", () => {
      const result = tokenize("author: Smith");
      // "author:" becomes empty (no value), "Smith" becomes a separate token
      const tokens = result.tokens.filter((t) => t.value);
      expect(tokens).toHaveLength(1);
      expect(tokens[0].value).toBe("Smith");
      expect(tokens[0].field).toBeUndefined();
    });
  });

  describe("complex queries", () => {
    it("should handle complex query from spec example", () => {
      const result = tokenize('author:Smith "machine learning" 2020');
      expect(result.tokens).toHaveLength(3);

      expect(result.tokens[0]).toEqual({
        raw: "author:Smith",
        value: "Smith",
        field: "author",
        isPhrase: false,
      });

      expect(result.tokens[1]).toEqual({
        raw: '"machine learning"',
        value: "machine learning",
        field: undefined,
        isPhrase: true,
      });

      expect(result.tokens[2]).toEqual({
        raw: "2020",
        value: "2020",
        field: undefined,
        isPhrase: false,
      });
    });

    it("should handle multiple field specifiers and phrases", () => {
      const result = tokenize('author:Smith title:"Deep Learning" year:2020 keyword:AI');
      expect(result.tokens).toHaveLength(4);
      expect(result.tokens[0].field).toBe("author");
      expect(result.tokens[1].field).toBe("title");
      expect(result.tokens[1].isPhrase).toBe(true);
      expect(result.tokens[2].field).toBe("year");
      expect(result.tokens[3].field).toBe("keyword");
    });
  });
});
