import { describe, expect, it } from "vitest";
import { type InputFormat, detectFormat, isPmid } from "./detector.js";

describe("detectFormat", () => {
  describe("file extension detection", () => {
    it("should detect .json as json format", () => {
      expect(detectFormat("references.json")).toBe("json");
    });

    it("should detect .bib as bibtex format", () => {
      expect(detectFormat("paper.bib")).toBe("bibtex");
    });

    it("should detect .ris as ris format", () => {
      expect(detectFormat("citations.ris")).toBe("ris");
    });

    it("should handle uppercase extensions", () => {
      expect(detectFormat("paper.BIB")).toBe("bibtex");
      expect(detectFormat("refs.JSON")).toBe("json");
      expect(detectFormat("data.RIS")).toBe("ris");
    });

    it("should handle mixed case extensions", () => {
      expect(detectFormat("paper.BiB")).toBe("bibtex");
    });

    it("should detect format from path with directories", () => {
      expect(detectFormat("/home/user/papers/references.json")).toBe("json");
      expect(detectFormat("./data/paper.bib")).toBe("bibtex");
    });
  });

  describe("content-based detection (when extension unknown)", () => {
    it("should detect JSON array content", () => {
      const content = '[{"id": "test"}]';
      expect(detectFormat("data.txt", content)).toBe("json");
    });

    it("should detect JSON object content", () => {
      const content = '{"id": "test"}';
      expect(detectFormat("data.txt", content)).toBe("json");
    });

    it("should detect JSON with leading whitespace", () => {
      const content = '  \n  [{"id": "test"}]';
      expect(detectFormat("data.txt", content)).toBe("json");
    });

    it("should detect BibTeX content", () => {
      const content = "@article{smith2024,\n  title={Test}}";
      expect(detectFormat("data.txt", content)).toBe("bibtex");
    });

    it("should detect BibTeX with leading whitespace", () => {
      const content = "  \n  @article{smith2024}";
      expect(detectFormat("data.txt", content)).toBe("bibtex");
    });

    it("should detect BibTeX with @preamble", () => {
      const content = '@preamble{"Some text"}';
      expect(detectFormat("data.txt", content)).toBe("bibtex");
    });

    it("should detect BibTeX with @comment", () => {
      const content = "@comment{Some comment}";
      expect(detectFormat("data.txt", content)).toBe("bibtex");
    });

    it("should detect RIS content", () => {
      const content = "TY  - JOUR\nAU  - Smith, John";
      expect(detectFormat("data.txt", content)).toBe("ris");
    });

    it("should detect RIS with leading whitespace", () => {
      const content = "  \n  TY  - JOUR";
      expect(detectFormat("data.txt", content)).toBe("ris");
    });

    it("should prioritize extension over content", () => {
      // Even if content looks like JSON, .bib extension wins
      const jsonContent = '{"id": "test"}';
      expect(detectFormat("paper.bib", jsonContent)).toBe("bibtex");
    });
  });

  describe("identifier detection (no file extension)", () => {
    describe("PMID detection", () => {
      it("should detect numeric string as PMID", () => {
        expect(detectFormat("12345678")).toBe("pmid");
      });

      it("should detect short numeric string as PMID", () => {
        expect(detectFormat("123")).toBe("pmid");
      });

      it("should detect long numeric string as PMID", () => {
        expect(detectFormat("123456789012")).toBe("pmid");
      });

      it("should not detect number with leading zeros as special", () => {
        // Leading zeros are still numeric
        expect(detectFormat("00123456")).toBe("pmid");
      });
    });

    describe("DOI detection", () => {
      it("should detect standard DOI format", () => {
        expect(detectFormat("10.1000/xyz123")).toBe("doi");
      });

      it("should detect DOI with complex suffix", () => {
        expect(detectFormat("10.1038/s41558-023-0001")).toBe("doi");
      });

      it("should detect https://doi.org URL", () => {
        expect(detectFormat("https://doi.org/10.1000/xyz123")).toBe("doi");
      });

      it("should detect http://doi.org URL", () => {
        expect(detectFormat("http://doi.org/10.1000/xyz123")).toBe("doi");
      });

      it("should detect https://dx.doi.org URL", () => {
        expect(detectFormat("https://dx.doi.org/10.1000/xyz123")).toBe("doi");
      });

      it("should detect http://dx.doi.org URL", () => {
        expect(detectFormat("http://dx.doi.org/10.1000/xyz123")).toBe("doi");
      });

      it("should detect DOI with uppercase registrant", () => {
        expect(detectFormat("10.1000/XYZ")).toBe("doi");
      });

      it("should detect DOI starting with 10.", () => {
        expect(detectFormat("10.1234/test")).toBe("doi");
        expect(detectFormat("10.99999/paper")).toBe("doi");
      });
    });
  });

  describe("multiple identifiers detection", () => {
    it("should detect space-separated PMIDs as identifiers", () => {
      expect(detectFormat("12345678 23456789")).toBe("identifiers");
    });

    it("should detect space-separated DOIs as identifiers", () => {
      expect(detectFormat("10.1000/xyz 10.2000/abc")).toBe("identifiers");
    });

    it("should detect mixed PMID and DOI as identifiers", () => {
      expect(detectFormat("12345678 10.1000/xyz")).toBe("identifiers");
    });

    it("should detect tab-separated identifiers", () => {
      expect(detectFormat("12345678\t10.1000/xyz")).toBe("identifiers");
    });

    it("should detect newline-separated identifiers", () => {
      expect(detectFormat("12345678\n10.1000/xyz")).toBe("identifiers");
    });

    it("should detect multiple whitespace-separated identifiers", () => {
      expect(detectFormat("12345678   10.1000/xyz\n23456789")).toBe("identifiers");
    });

    it("should detect mixed with DOI URLs", () => {
      expect(detectFormat("12345678 https://doi.org/10.1000/xyz")).toBe("identifiers");
    });

    it("should return single pmid format for single PMID", () => {
      // Single ID should return specific format, not identifiers
      expect(detectFormat("12345678")).toBe("pmid");
    });

    it("should return single doi format for single DOI", () => {
      expect(detectFormat("10.1000/xyz")).toBe("doi");
    });

    it("should detect identifiers in stdin-like content", () => {
      // Content parameter simulating stdin
      const content = "12345678 10.1000/xyz 23456789";
      expect(detectFormat("", content)).toBe("identifiers");
    });
  });

  describe("unknown format", () => {
    it("should return unknown for unrecognized extension without content", () => {
      expect(detectFormat("paper.xml")).toBe("unknown");
    });

    it("should return unknown for unrecognized content", () => {
      const content = "random text content";
      expect(detectFormat("data.txt", content)).toBe("unknown");
    });

    it("should return unknown for empty content", () => {
      expect(detectFormat("data.txt", "")).toBe("unknown");
    });

    it("should return unknown for whitespace-only content", () => {
      expect(detectFormat("data.txt", "   \n\t  ")).toBe("unknown");
    });

    it("should return unknown for string that looks like filename but is not a valid identifier", () => {
      expect(detectFormat("nonexistent.bib")).toBe("bibtex"); // Extension takes priority
      expect(detectFormat("nonexistent.xyz")).toBe("unknown");
    });

    it("should return unknown for alphanumeric string that is not PMID or DOI", () => {
      expect(detectFormat("abc123")).toBe("unknown");
      expect(detectFormat("test-string")).toBe("unknown");
    });

    it("should return unknown for 10. without valid DOI structure", () => {
      // "10." alone is not a valid DOI
      expect(detectFormat("10.")).toBe("unknown");
    });

    it("should return unknown for mixed valid and invalid identifiers", () => {
      // If any part is not a valid identifier, return unknown
      expect(detectFormat("12345678 invalid")).toBe("unknown");
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      expect(detectFormat("")).toBe("unknown");
    });

    it("should handle path with multiple dots", () => {
      expect(detectFormat("paper.v2.final.json")).toBe("json");
      expect(detectFormat("data.backup.bib")).toBe("bibtex");
    });

    it("should handle hidden files", () => {
      expect(detectFormat(".references.json")).toBe("json");
    });

    it("should handle filename without extension", () => {
      expect(detectFormat("Makefile")).toBe("unknown");
    });

    it("should handle DOI with special characters", () => {
      expect(detectFormat("10.1000/journal.pone.0000001")).toBe("doi");
      expect(detectFormat("10.1000/(test)")).toBe("doi");
    });

    it("should not confuse year starting with 10 as DOI", () => {
      // "1023" is numeric, so it's PMID, not DOI
      expect(detectFormat("1023")).toBe("pmid");
      // But "10.23" looks like DOI start
      expect(detectFormat("10.23/test")).toBe("doi");
    });

    it("should handle content with only identifiers", () => {
      // When file input with .txt but content is identifiers
      const content = "12345678\n23456789";
      expect(detectFormat("input.txt", content)).toBe("identifiers");
    });
  });

  describe("type exhaustiveness", () => {
    it("should only return valid InputFormat values", () => {
      const validFormats: InputFormat[] = [
        "json",
        "bibtex",
        "ris",
        "pmid",
        "doi",
        "identifiers",
        "unknown",
      ];

      // Test various inputs
      const testCases = [
        "paper.json",
        "paper.bib",
        "paper.ris",
        "12345678",
        "10.1000/xyz",
        "12345678 10.1000/xyz",
        "random",
      ];

      for (const input of testCases) {
        const result = detectFormat(input);
        expect(validFormats).toContain(result);
      }
    });
  });
});

describe("isPmid", () => {
  describe("numeric PMID", () => {
    it("should return true for numeric string", () => {
      expect(isPmid("12345678")).toBe(true);
    });

    it("should return true for short numeric string", () => {
      expect(isPmid("123")).toBe(true);
    });

    it("should return true for long numeric string", () => {
      expect(isPmid("123456789012")).toBe(true);
    });

    it("should return true for PMID with leading zeros", () => {
      expect(isPmid("00123456")).toBe(true);
    });
  });

  describe("PMID with prefix", () => {
    it("should return true for PMID: prefix", () => {
      expect(isPmid("PMID:12345678")).toBe(true);
    });

    it("should return true for pmid: prefix (lowercase)", () => {
      expect(isPmid("pmid:12345678")).toBe(true);
    });

    it("should return true for Pmid: prefix (mixed case)", () => {
      expect(isPmid("Pmid:12345678")).toBe(true);
    });

    it("should return true for PMID: with space after colon", () => {
      expect(isPmid("PMID: 12345678")).toBe(true);
    });

    it("should return true for pmid: with multiple spaces after colon", () => {
      expect(isPmid("pmid:  12345678")).toBe(true);
    });

    it("should return true for PMID: with leading/trailing whitespace", () => {
      expect(isPmid("  PMID:12345678  ")).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("should return false for empty string", () => {
      expect(isPmid("")).toBe(false);
    });

    it("should return false for non-numeric string", () => {
      expect(isPmid("abc123")).toBe(false);
    });

    it("should return false for DOI", () => {
      expect(isPmid("10.1000/xyz")).toBe(false);
    });

    it("should return false for PMID: without number", () => {
      expect(isPmid("PMID:")).toBe(false);
    });

    it("should return false for PMID: with non-numeric value", () => {
      expect(isPmid("PMID:abc123")).toBe(false);
    });

    it("should return false for partial prefix", () => {
      expect(isPmid("PMI:12345678")).toBe(false);
    });
  });
});
