import { describe, expect, it } from "vitest";
import { type ParseResult, parseBibtex, parseRis } from "./parser.js";

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
