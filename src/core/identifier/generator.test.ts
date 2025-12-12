import { describe, it, expect } from "vitest";
import type { CslItem } from "../csl-json/types";
import { generateId, generateIdWithCollisionCheck } from "./generator";

describe("ID Generator", () => {
  describe("generateId", () => {
    it("should generate ID from author, year, and title", () => {
      const item: CslItem = {
        id: "temp",
        type: "article-journal",
        title: "Machine Learning in Medical Diagnosis",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023, 5, 15]] },
      };

      const result = generateId(item);
      expect(result).toBe("smith-2023");
    });

    it("should use first author family name", () => {
      const item: CslItem = {
        id: "temp",
        type: "article-journal",
        title: "Deep Learning",
        author: [
          { family: "Garcia", given: "Maria" },
          { family: "Lopez", given: "Carlos" },
        ],
        issued: { "date-parts": [[2020]] },
      };

      const result = generateId(item);
      expect(result).toBe("garcia-2020");
    });

    it("should handle multi-word author names with underscores", () => {
      const item: CslItem = {
        id: "temp",
        type: "article-journal",
        title: "Test Article",
        author: [{ family: "Van Der Berg", given: "Anna" }],
        issued: { "date-parts": [[2023]] },
      };

      const result = generateId(item);
      expect(result).toBe("van_der_berg-2023");
    });

    it("should handle non-ASCII author names", () => {
      const item: CslItem = {
        id: "temp",
        type: "article-journal",
        title: "深層学習による画像認識",
        author: [{ family: "田中", given: "太郎" }],
        issued: { "date-parts": [[2022]] },
      };

      const result = generateId(item);
      // Non-ASCII characters in both author and title are removed
      // Since both become empty strings, fallback to anon-year
      expect(result).toBe("anon-2022");
    });

    describe("Fallbacks", () => {
      it("should use 'anon' when no author", () => {
        const item: CslItem = {
          id: "temp",
          type: "article-journal",
          title: "Statistical Methods for Clinical Trials",
          issued: { "date-parts": [[2020]] },
        };

        const result = generateId(item);
        // Title slug truncated to 32 chars
        expect(result).toBe("anon-2020-statistical_methods_for_clinical");
      });

      it("should use 'nd' when no year", () => {
        const item: CslItem = {
          id: "temp",
          type: "article-journal",
          title: "Neural Networks Theory",
          author: [{ family: "Chen", given: "Wei" }],
        };

        const result = generateId(item);
        expect(result).toBe("chen-nd-neural_networks_theory");
      });

      it("should handle no author and no year", () => {
        const item: CslItem = {
          id: "temp",
          type: "article-journal",
          title: "Machine Learning Applications",
        };

        const result = generateId(item);
        // Title slug truncated to 32 chars
        expect(result).toBe("anon-nd-machine_learning_applications");
      });

      it("should use 'untitled' when no title", () => {
        const item: CslItem = {
          id: "temp",
          type: "article-journal",
          author: [{ family: "Brown", given: "Michael" }],
          issued: { "date-parts": [[2019]] },
        };

        const result = generateId(item);
        expect(result).toBe("brown-2019");
      });

      it("should handle no author, no year, no title", () => {
        const item: CslItem = {
          id: "temp",
          type: "article-journal",
        };

        const result = generateId(item);
        expect(result).toBe("anon-nd-untitled");
      });
    });

    describe("Edge Cases", () => {
      it("should handle author with only given name", () => {
        const item: CslItem = {
          id: "temp",
          type: "article-journal",
          title: "Test Article",
          author: [{ given: "John" }],
          issued: { "date-parts": [[2023]] },
        };

        const result = generateId(item);
        // Should fallback to Anon if no family name
        expect(result).toBe("anon-2023-test_article");
      });

      it("should handle author with literal name", () => {
        const item: CslItem = {
          id: "temp",
          type: "article-journal",
          title: "WHO Report",
          author: [{ literal: "World Health Organization" }],
          issued: { "date-parts": [[2023]] },
        };

        const result = generateId(item);
        expect(result).toBe("world_health_organization-2023");
      });

      it("should handle title with special characters", () => {
        const item: CslItem = {
          id: "temp",
          type: "article-journal",
          title: "COVID-19: A Case Study!",
          author: [{ family: "Jones", given: "Sarah" }],
          issued: { "date-parts": [[2020]] },
        };

        const result = generateId(item);
        expect(result).toBe("jones-2020");
      });

      it("should handle very long titles (truncate slug to 32 chars)", () => {
        const item: CslItem = {
          id: "temp",
          type: "article-journal",
          title: "This is a very long title that should be truncated to a reasonable length for the identifier",
          issued: { "date-parts": [[2023]] },
        };

        const result = generateId(item);
        // Title slug truncated to 32 chars
        expect(result).toBe("anon-2023-this_is_a_very_long_title_that_s");
        expect(result.length).toBeLessThanOrEqual(80); // reasonable max length
      });

      it("should handle partial date (only year)", () => {
        const item: CslItem = {
          id: "temp",
          type: "book",
          title: "Introduction to Data Science",
          author: [{ family: "Wilson", given: "Robert" }],
          issued: { "date-parts": [[2021]] },
        };

        const result = generateId(item);
        expect(result).toBe("wilson-2021");
      });

      it("should handle empty date-parts array", () => {
        const item: CslItem = {
          id: "temp",
          type: "article-journal",
          title: "Test",
          author: [{ family: "Test", given: "Author" }],
          issued: { "date-parts": [] },
        };

        const result = generateId(item);
        expect(result).toBe("test-nd-test");
      });
    });
  });

  describe("generateIdWithCollisionCheck", () => {
    it("should return base ID when no collision", () => {
      const item: CslItem = {
        id: "temp",
        type: "article-journal",
        title: "Machine Learning",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
      };

      const existingIds = ["jones-2023", "brown-2022"];
      const result = generateIdWithCollisionCheck(item, existingIds);
      expect(result).toBe("smith-2023");
    });

    it("should append 'a' for first collision", () => {
      const item: CslItem = {
        id: "temp",
        type: "article-journal",
        title: "Machine Learning",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
      };

      const existingIds = ["smith-2023"];
      const result = generateIdWithCollisionCheck(item, existingIds);
      expect(result).toBe("smith-2023a");
    });

    it("should append 'b', 'c', etc. for multiple collisions", () => {
      const item: CslItem = {
        id: "temp",
        type: "article-journal",
        title: "Machine Learning",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
      };

      const existingIds = ["smith-2023", "smith-2023a", "smith-2023b"];
      const result = generateIdWithCollisionCheck(item, existingIds);
      expect(result).toBe("smith-2023c");
    });

    it("should continue with 'aa', 'ab' after 'z'", () => {
      const item: CslItem = {
        id: "temp",
        type: "article-journal",
        title: "Machine Learning",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
      };

      // Create IDs from smith-2023 to smith-2023z
      const existingIds = ["smith-2023"];
      for (let i = 0; i < 26; i++) {
        existingIds.push(`smith-2023${String.fromCharCode(97 + i)}`); // a-z
      }

      const result = generateIdWithCollisionCheck(item, existingIds);
      expect(result).toBe("smith-2023aa");
    });

    it("should handle empty existing IDs array", () => {
      const item: CslItem = {
        id: "temp",
        type: "article-journal",
        title: "Machine Learning",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
      };

      const result = generateIdWithCollisionCheck(item, []);
      expect(result).toBe("smith-2023");
    });

    it("should be case-insensitive for collision check", () => {
      const item: CslItem = {
        id: "temp",
        type: "article-journal",
        title: "Machine Learning",
        author: [{ family: "Smith", given: "John" }],
        issued: { "date-parts": [[2023]] },
      };

      const existingIds = ["Smith-2023", "SMITH-2023a"];
      const result = generateIdWithCollisionCheck(item, existingIds);
      // Should detect collision even with different case
      expect(result).toBe("smith-2023b");
    });

    it("should handle collision with fallback IDs", () => {
      const item: CslItem = {
        id: "temp",
        type: "article-journal",
        title: "Statistical Methods",
        issued: { "date-parts": [[2020]] },
      };

      const existingIds = ["anon-2020-statistical_methods"];
      const result = generateIdWithCollisionCheck(item, existingIds);
      expect(result).toBe("anon-2020-statistical_methodsa");
    });
  });
});
