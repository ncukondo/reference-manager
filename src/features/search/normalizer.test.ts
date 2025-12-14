import { describe, expect, it } from "vitest";
import { normalize } from "./normalizer.js";

describe("normalizer", () => {
	describe("basic normalization", () => {
		it("should convert to lowercase", () => {
			expect(normalize("Machine Learning")).toBe("machine learning");
			expect(normalize("UPPERCASE")).toBe("uppercase");
			expect(normalize("MiXeD CaSe")).toBe("mixed case");
		});

		it("should handle empty string", () => {
			expect(normalize("")).toBe("");
		});

		it("should handle whitespace-only string", () => {
			expect(normalize("   ")).toBe("");
		});

		it("should normalize multiple spaces to single space", () => {
			expect(normalize("machine  learning")).toBe("machine learning");
			expect(normalize("machine   learning")).toBe("machine learning");
			expect(normalize("a    b    c")).toBe("a b c");
		});

		it("should trim leading and trailing whitespace", () => {
			expect(normalize("  machine learning  ")).toBe("machine learning");
			expect(normalize("\tmachine learning\n")).toBe("machine learning");
		});
	});

	describe("Unicode NFKC normalization", () => {
		it("should normalize Unicode characters to NFKC form", () => {
			// ﬁ (U+FB01) -> fi
			expect(normalize("ﬁeld")).toBe("field");

			// ½ (U+00BD) -> 1⁄2 (NFKC) -> 1 2 (fraction slash removed)
			expect(normalize("½")).toBe("1 2");

			// ℃ (U+2103) -> °C -> c (degree sign removed)
			expect(normalize("℃")).toBe("c");
		});

		it("should normalize fullwidth characters", () => {
			// Fullwidth Latin letters
			expect(normalize("ＡＢＣ")).toBe("abc");
			expect(normalize("１２３")).toBe("123");
		});

		it("should normalize combining characters", () => {
			// é (U+00E9) vs e + ́ (U+0065 + U+0301)
			const precomposed = "café"; // é is precomposed
			const decomposed = "café"; // é is e + combining acute
			expect(normalize(precomposed)).toBe(normalize(decomposed));
		});
	});

	describe("punctuation removal", () => {
		it("should remove common punctuation", () => {
			expect(normalize("hello, world!")).toBe("hello world");
			expect(normalize("machine-learning")).toBe("machine learning");
			expect(normalize("A.B.C.")).toBe("a b c");
		});

		it("should remove various punctuation marks", () => {
			expect(normalize("hello;world")).toBe("hello world");
			expect(normalize("question?")).toBe("question");
			expect(normalize("exclamation!")).toBe("exclamation");
			expect(normalize("colon:value")).toBe("colon value");
			expect(normalize("(parentheses)")).toBe("parentheses");
			expect(normalize("[brackets]")).toBe("brackets");
			expect(normalize("{braces}")).toBe("braces");
		});

		it("should remove quotes", () => {
			expect(normalize('"quoted"')).toBe("quoted");
			expect(normalize("'single quotes'")).toBe("single quotes");
		});

		it("should handle multiple consecutive punctuation marks", () => {
			expect(normalize("hello...world")).toBe("hello world");
			expect(normalize("what?!?!")).toBe("what");
		});
	});

	describe("complex cases", () => {
		it("should handle mixed Unicode, punctuation, and case", () => {
			expect(normalize("Machine-Learning: A Comprehensive Guide")).toBe(
				"machine learning a comprehensive guide",
			);
		});

		it("should handle scientific notation", () => {
			// Note: superscript ³ gets converted to regular 3 and combines with 10
			expect(normalize("1.5×10³")).toBe("1 5 103");
		});

		it("should handle URLs (as content, not for matching)", () => {
			// URLs in content fields get normalized (slashes kept)
			expect(normalize("https://example.com/path")).toBe(
				"https //example com/path",
			);
		});

		it("should handle author names with diacritics", () => {
			expect(normalize("Müller")).toBe("muller");
			expect(normalize("Žižek")).toBe("zizek");
			expect(normalize("Österreich")).toBe("osterreich");
		});

		it("should handle CJK characters", () => {
			// Japanese (unchanged except lowercase)
			expect(normalize("機械学習")).toBe("機械学習");
			// Chinese (unchanged except lowercase)
			expect(normalize("机器学习")).toBe("机器学习");
			// Korean - NFD decomposition may change Hangul
			const result = normalize("기계 학습");
			// Just verify it doesn't crash and returns something
			expect(result).toBeTruthy();
			expect(result.length).toBeGreaterThan(0);
		});

		it("should handle mixed scripts", () => {
			expect(normalize("Deep Learning (深層学習)")).toBe(
				"deep learning 深層学習",
			);
		});
	});

	describe("edge cases", () => {
		it("should handle strings with only punctuation", () => {
			expect(normalize("...")).toBe("");
			expect(normalize("!@#$%^&*()")).toBe("");
		});

		it("should handle very long strings", () => {
			const long = "A".repeat(10000);
			const normalized = normalize(long);
			expect(normalized).toBe("a".repeat(10000));
		});

		it("should handle newlines and tabs", () => {
			expect(normalize("line1\nline2")).toBe("line1 line2");
			expect(normalize("tab\tseparated")).toBe("tab separated");
		});

		it("should be idempotent", () => {
			const text = "Machine-Learning: A Guide!";
			const normalized = normalize(text);
			expect(normalize(normalized)).toBe(normalized);
		});
	});
});