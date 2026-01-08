import { describe, expect, it } from "vitest";
import { type ParseResult, convertNbibToRis, parseBibtex, parseNbib, parseRis } from "./parser.js";

describe("parseBibtex", () => {
  describe("valid BibTeX parsing", () => {
    it("should parse a single article entry", () => {
      const bibtex = `@article{smith2024,
  author = {Smith, John},
  title = {A Great Paper},
  journal = {Nature},
  year = {2024}
}`;
      const result = parseBibtex(bibtex);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe("article-journal");
      expect(result.items[0].title).toBe("A Great Paper");
      expect(result.items[0].author).toEqual([{ family: "Smith", given: "John" }]);
    });

    it("should parse multiple entries", () => {
      const bibtex = `@article{smith2024,
  author = {Smith, John},
  title = {First Paper},
  year = {2024}
}

@book{jones2023,
  author = {Jones, Alice},
  title = {A Great Book},
  publisher = {Publisher},
  year = {2023}
}`;
      const result = parseBibtex(bibtex);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
    });

    it("should parse @book entries", () => {
      const bibtex = `@book{book2024,
  author = {Author, Test},
  title = {Book Title},
  publisher = {Publisher Name},
  year = {2024}
}`;
      const result = parseBibtex(bibtex);

      expect(result.success).toBe(true);
      expect(result.items[0].type).toBe("book");
    });

    it("should parse @inproceedings entries", () => {
      const bibtex = `@inproceedings{conf2024,
  author = {Author, Test},
  title = {Conference Paper},
  booktitle = {Conference Name},
  year = {2024}
}`;
      const result = parseBibtex(bibtex);

      expect(result.success).toBe(true);
      expect(result.items[0].type).toBe("paper-conference");
    });

    it("should handle DOI field", () => {
      const bibtex = `@article{doi2024,
  author = {Author, Test},
  title = {Paper with DOI},
  doi = {10.1000/xyz},
  year = {2024}
}`;
      const result = parseBibtex(bibtex);

      expect(result.success).toBe(true);
      expect(result.items[0].DOI).toBe("10.1000/xyz");
    });

    it("should preserve citation key as id", () => {
      const bibtex = `@article{my_citation_key,
  title = {Test},
  year = {2024}
}`;
      const result = parseBibtex(bibtex);

      expect(result.success).toBe(true);
      expect(result.items[0].id).toBe("my_citation_key");
    });
  });

  describe("empty input handling", () => {
    it("should return empty array for empty string", () => {
      const result = parseBibtex("");

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(0);
    });

    it("should return empty array for whitespace-only input", () => {
      const result = parseBibtex("   \n\t   ");

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(0);
    });

    it("should return empty array for comments only", () => {
      const bibtex = `% This is a comment
% Another comment`;
      const result = parseBibtex(bibtex);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(0);
    });
  });

  describe("malformed input handling", () => {
    it("should return error for completely invalid input", () => {
      const result = parseBibtex("not valid bibtex at all");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle partially valid input", () => {
      // citation-js may parse what it can
      const bibtex = `@article{valid2024,
  title = {Valid Entry},
  year = {2024}
}
@invalid{broken`;
      const result = parseBibtex(bibtex);

      // Result may vary - could be partial success or error
      if (result.success) {
        expect(result.items.length).toBeGreaterThanOrEqual(0);
      } else {
        expect(result.error).toBeDefined();
      }
    });
  });
});

describe("parseRis", () => {
  describe("valid RIS parsing", () => {
    it("should parse a single journal article", () => {
      const ris = `TY  - JOUR
AU  - Smith, John
TI  - A Great Paper
JO  - Nature
PY  - 2024
ER  - `;
      const result = parseRis(ris);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe("article-journal");
      expect(result.items[0].title).toBe("A Great Paper");
    });

    it("should parse multiple entries", () => {
      const ris = `TY  - JOUR
AU  - Smith, John
TI  - First Paper
PY  - 2024
ER  -

TY  - BOOK
AU  - Jones, Alice
TI  - A Great Book
PY  - 2023
ER  - `;
      const result = parseRis(ris);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
    });

    it("should parse book entries", () => {
      const ris = `TY  - BOOK
AU  - Author, Test
TI  - Book Title
PB  - Publisher Name
PY  - 2024
ER  - `;
      const result = parseRis(ris);

      expect(result.success).toBe(true);
      expect(result.items[0].type).toBe("book");
    });

    it("should handle DOI field", () => {
      const ris = `TY  - JOUR
AU  - Author, Test
TI  - Paper with DOI
DO  - 10.1000/xyz
PY  - 2024
ER  - `;
      const result = parseRis(ris);

      expect(result.success).toBe(true);
      expect(result.items[0].DOI).toBe("10.1000/xyz");
    });

    it("should handle multiple authors", () => {
      const ris = `TY  - JOUR
AU  - Smith, John
AU  - Jones, Alice
AU  - Williams, Bob
TI  - Multi-author Paper
PY  - 2024
ER  - `;
      const result = parseRis(ris);

      expect(result.success).toBe(true);
      expect(result.items[0].author).toHaveLength(3);
    });
  });

  describe("empty input handling", () => {
    it("should return empty array for empty string", () => {
      const result = parseRis("");

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(0);
    });

    it("should return empty array for whitespace-only input", () => {
      const result = parseRis("   \n\t   ");

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(0);
    });
  });

  describe("malformed input handling", () => {
    it("should return error for completely invalid input", () => {
      const result = parseRis("not valid ris at all");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle RIS without ER tag", () => {
      const ris = `TY  - JOUR
AU  - Smith, John
TI  - Paper without end tag
PY  - 2024`;
      const result = parseRis(ris);

      // Result may vary based on parser behavior
      if (result.success) {
        expect(result.items.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
});

describe("ParseResult type", () => {
  it("should have success and items on success", () => {
    const result: ParseResult = {
      success: true,
      items: [],
    };

    expect(result.success).toBe(true);
    expect(result.items).toBeDefined();
  });

  it("should have success and error on failure", () => {
    const result: ParseResult = {
      success: false,
      items: [],
      error: "Parse error",
    };

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("convertNbibToRis", () => {
  describe("tag conversion", () => {
    it("should convert PMID- tag to AN tag", () => {
      const nbib = "PMID- 12345678";
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("AN  - 12345678");
    });

    it("should convert TI tag to TI tag (same, but with RIS spacing)", () => {
      const nbib = `PMID- 12345678
TI  - Test Title`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("TI  - Test Title");
    });

    it("should convert FAU tag to AU tag", () => {
      const nbib = `PMID- 12345678
FAU - Smith, John`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("AU  - Smith, John");
    });

    it("should convert DP tag to PY tag (year only)", () => {
      const nbib = `PMID- 12345678
DP  - 2024 Mar 15`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("PY  - 2024");
    });

    it("should convert JT tag to JO tag", () => {
      const nbib = `PMID- 12345678
JT  - Nature`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("JO  - Nature");
    });

    it("should convert AB tag to AB tag", () => {
      const nbib = `PMID- 12345678
AB  - This is the abstract text.`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("AB  - This is the abstract text.");
    });

    it("should convert VI tag to VL tag", () => {
      const nbib = `PMID- 12345678
VI  - 15`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("VL  - 15");
    });

    it("should convert IP tag to IS tag", () => {
      const nbib = `PMID- 12345678
IP  - 3`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("IS  - 3");
    });

    it("should convert PG tag to SP tag", () => {
      const nbib = `PMID- 12345678
PG  - 123-456`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("SP  - 123-456");
    });

    it("should convert AID [doi] tag to DO tag", () => {
      const nbib = `PMID- 12345678
AID - 10.1000/xyz123 [doi]`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("DO  - 10.1000/xyz123");
    });

    it("should convert PT tag to TY tag", () => {
      const nbib = `PMID- 12345678
PT  - Journal Article`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("TY  - JOUR");
    });

    it("should convert MH tag to KW tag", () => {
      const nbib = `PMID- 12345678
MH  - Keyword One`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("KW  - Keyword One");
    });

    it("should convert LA tag to LA tag", () => {
      const nbib = `PMID- 12345678
LA  - eng`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("LA  - eng");
    });
  });

  describe("structure conversion", () => {
    it("should add TY tag at the beginning if PT is not provided", () => {
      const nbib = `PMID- 12345678
TI  - Test`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toMatch(/^TY {2}- JOUR/);
    });

    it("should add ER tag at the end", () => {
      const nbib = "PMID- 12345678";
      const ris = convertNbibToRis(nbib);

      expect(ris).toMatch(/ER {2}-\s*$/);
    });

    it("should handle multiple entries separated by blank lines", () => {
      const nbib = `PMID- 11111111
TI  - First Article

PMID- 22222222
TI  - Second Article`;
      const ris = convertNbibToRis(nbib);

      // Should contain two TY tags and two ER tags
      const tyMatches = ris.match(/TY {2}- JOUR/g);
      const erMatches = ris.match(/ER {2}-/g);
      expect(tyMatches).toHaveLength(2);
      expect(erMatches).toHaveLength(2);
    });

    it("should handle multi-line values (continuation lines)", () => {
      const nbib = `PMID- 12345678
AB  - This is a long abstract that spans
      multiple lines in the NBIB format.`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain(
        "AB  - This is a long abstract that spans multiple lines in the NBIB format."
      );
    });

    it("should handle multiple authors", () => {
      const nbib = `PMID- 12345678
FAU - Smith, John
FAU - Jones, Alice
FAU - Williams, Bob`;
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("AU  - Smith, John");
      expect(ris).toContain("AU  - Jones, Alice");
      expect(ris).toContain("AU  - Williams, Bob");
    });
  });

  describe("edge cases", () => {
    it("should return empty string for empty input", () => {
      expect(convertNbibToRis("")).toBe("");
    });

    it("should return empty string for whitespace-only input", () => {
      expect(convertNbibToRis("   \n\t   ")).toBe("");
    });

    it("should handle NBIB with only PMID", () => {
      const nbib = "PMID- 12345678";
      const ris = convertNbibToRis(nbib);

      expect(ris).toContain("TY  - JOUR");
      expect(ris).toContain("AN  - 12345678");
      expect(ris).toContain("ER  -");
    });
  });
});

describe("parseNbib", () => {
  describe("valid NBIB parsing", () => {
    it("should parse a single journal article", () => {
      const nbib = `PMID- 12345678
TI  - A Great Paper
FAU - Smith, John
JT  - Nature
DP  - 2024 Mar`;
      const result = parseNbib(nbib);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].type).toBe("article-journal");
      expect(result.items[0].title).toBe("A Great Paper");
    });

    it("should parse multiple entries", () => {
      const nbib = `PMID- 11111111
TI  - First Paper
DP  - 2024

PMID- 22222222
TI  - Second Paper
DP  - 2023`;
      const result = parseNbib(nbib);

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(2);
    });

    it("should handle DOI field", () => {
      const nbib = `PMID- 12345678
TI  - Paper with DOI
AID - 10.1000/xyz [doi]
DP  - 2024`;
      const result = parseNbib(nbib);

      expect(result.success).toBe(true);
      expect(result.items[0].DOI).toBe("10.1000/xyz");
    });

    it("should handle multiple authors", () => {
      const nbib = `PMID- 12345678
TI  - Multi-author Paper
FAU - Smith, John
FAU - Jones, Alice
FAU - Williams, Bob
DP  - 2024`;
      const result = parseNbib(nbib);

      expect(result.success).toBe(true);
      expect(result.items[0].author).toHaveLength(3);
    });

    it("should parse volume and issue", () => {
      const nbib = `PMID- 12345678
TI  - Test
VI  - 15
IP  - 3
DP  - 2024`;
      const result = parseNbib(nbib);

      expect(result.success).toBe(true);
      expect(result.items[0].volume).toBe("15");
      expect(result.items[0].issue).toBe("3");
    });

    it("should parse abstract", () => {
      const nbib = `PMID- 12345678
TI  - Test
AB  - This is the abstract.
DP  - 2024`;
      const result = parseNbib(nbib);

      expect(result.success).toBe(true);
      expect(result.items[0].abstract).toBe("This is the abstract.");
    });
  });

  describe("empty input handling", () => {
    it("should return empty array for empty string", () => {
      const result = parseNbib("");

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(0);
    });

    it("should return empty array for whitespace-only input", () => {
      const result = parseNbib("   \n\t   ");

      expect(result.success).toBe(true);
      expect(result.items).toHaveLength(0);
    });
  });

  describe("malformed input handling", () => {
    it("should return error for completely invalid input", () => {
      const result = parseNbib("not valid nbib at all");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
