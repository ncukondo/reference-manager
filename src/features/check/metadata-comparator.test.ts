import { describe, expect, it } from "vitest";
import type { RemoteMetadata } from "./crossref-client.js";
import { compareMetadata } from "./metadata-comparator.js";

describe("compareMetadata", () => {
  describe("classification", () => {
    it("should return no_change when metadata matches", () => {
      const local = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith", given: "John" }],
        "container-title": "Journal of AI",
        type: "article-journal",
        page: "123-145",
        volume: "42",
        issue: "3",
      };
      const remote: RemoteMetadata = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith", given: "John" }],
        containerTitle: "Journal of AI",
        type: "journal-article",
        page: "123-145",
        volume: "42",
        issue: "3",
      };

      const result = compareMetadata(local, remote);
      expect(result.classification).toBe("no_change");
      expect(result.changedFields).toHaveLength(0);
      expect(result.fieldDiffs).toHaveLength(0);
    });

    it("should classify as metadata_mismatch when title is completely different", () => {
      const local = {
        title: "Quantum Mechanics in Modern Physics",
        author: [{ family: "Smith" }],
      };
      const remote: RemoteMetadata = {
        title: "Economic Growth in Developing Countries",
        author: [{ family: "Smith" }],
      };

      const result = compareMetadata(local, remote);
      expect(result.classification).toBe("metadata_mismatch");
      expect(result.changedFields).toContain("title");
    });

    it("should classify as metadata_mismatch when authors are completely different", () => {
      const local = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith" }, { family: "Jones" }],
      };
      const remote: RemoteMetadata = {
        title: "A Study of Machine Learning",
        author: [{ family: "Brown" }, { family: "Davis" }],
      };

      const result = compareMetadata(local, remote);
      expect(result.classification).toBe("metadata_mismatch");
      expect(result.changedFields).toContain("author");
    });

    it("should classify as metadata_outdated when only publication fields differ", () => {
      const local = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith" }],
      };
      const remote: RemoteMetadata = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith" }],
        page: "123-145",
        volume: "42",
      };

      const result = compareMetadata(local, remote);
      expect(result.classification).toBe("metadata_outdated");
      expect(result.changedFields).toContain("page");
      expect(result.changedFields).toContain("volume");
    });

    it("should classify as metadata_outdated when identity fields have minor changes", () => {
      const local = {
        title: "Effect of Drug X on Blood Pressure",
        author: [{ family: "Smith" }, { family: "Jones" }],
      };
      const remote: RemoteMetadata = {
        title: "Effect of Drug X on Blood Pressure: A Randomized Trial",
        author: [{ family: "Smith" }, { family: "Jones" }, { family: "Brown" }],
      };

      const result = compareMetadata(local, remote);
      expect(result.classification).toBe("metadata_outdated");
    });

    it("should classify as metadata_mismatch when both title and author mismatch", () => {
      const local = {
        title: "A Study of Quantum Physics",
        author: [{ family: "Smith" }],
      };
      const remote: RemoteMetadata = {
        title: "Economic Trends in Asia",
        author: [{ family: "Brown" }],
      };

      const result = compareMetadata(local, remote);
      expect(result.classification).toBe("metadata_mismatch");
    });

    it("should classify as metadata_outdated when container-title changes but title is similar", () => {
      const local = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith" }],
        "container-title": "Proc. of ICML",
      };
      const remote: RemoteMetadata = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith" }],
        containerTitle: "Proceedings of ICML 2024",
      };

      const result = compareMetadata(local, remote);
      // container-title change with similar title → outdated
      expect(result.classification).toBe("metadata_outdated");
    });

    it("should classify as metadata_outdated when issued date changes", () => {
      const local = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith" }],
        issued: { "date-parts": [[2024]] },
      };
      const remote: RemoteMetadata = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith" }],
        issued: { "date-parts": [[2024, 6, 15]] },
      };

      const result = compareMetadata(local, remote);
      expect(result.classification).toBe("metadata_outdated");
      expect(result.changedFields).toContain("issued");
    });
  });

  describe("fieldDiffs", () => {
    it("should include field diffs for changed fields", () => {
      const local = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith" }],
      };
      const remote: RemoteMetadata = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith" }],
        page: "123-145",
        volume: "42",
      };

      const result = compareMetadata(local, remote);
      expect(result.fieldDiffs).toHaveLength(2);

      const pageDiff = result.fieldDiffs.find((d) => d.field === "page");
      expect(pageDiff).toBeDefined();
      expect(pageDiff?.local).toBeNull();
      expect(pageDiff?.remote).toBe("123-145");

      const volumeDiff = result.fieldDiffs.find((d) => d.field === "volume");
      expect(volumeDiff).toBeDefined();
      expect(volumeDiff?.local).toBeNull();
      expect(volumeDiff?.remote).toBe("42");
    });

    it("should show title diff when title changes", () => {
      const local = {
        title: "Old Title",
        author: [{ family: "Smith" }],
      };
      const remote: RemoteMetadata = {
        title: "Completely New Title About Different Things",
        author: [{ family: "Brown" }],
      };

      const result = compareMetadata(local, remote);
      const titleDiff = result.fieldDiffs.find((d) => d.field === "title");
      expect(titleDiff).toBeDefined();
      expect(titleDiff?.local).toBe("Old Title");
      expect(titleDiff?.remote).toBe("Completely New Title About Different Things");
    });

    it("should show author diff when authors change", () => {
      const local = {
        title: "A Study",
        author: [{ family: "Smith" }],
      };
      const remote: RemoteMetadata = {
        title: "Different Study Entirely About Other Topics",
        author: [{ family: "Brown" }, { family: "Jones" }],
      };

      const result = compareMetadata(local, remote);
      const authorDiff = result.fieldDiffs.find((d) => d.field === "author");
      expect(authorDiff).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("should handle missing local fields", () => {
      const local = {
        title: "A Study",
      };
      const remote: RemoteMetadata = {
        title: "A Study",
        author: [{ family: "Smith" }],
        page: "123",
      };

      const result = compareMetadata(local, remote);
      // Missing author → skip author comparison, page added → outdated
      expect(result.classification).toBe("metadata_outdated");
    });

    it("should handle missing remote metadata fields", () => {
      const local = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith" }],
        page: "123-145",
      };
      const remote: RemoteMetadata = {
        title: "A Study of Machine Learning",
        author: [{ family: "Smith" }],
      };

      // Remote missing page → page diff
      const result = compareMetadata(local, remote);
      expect(result.changedFields).toContain("page");
    });

    it("should return no_change when both have minimal matching data", () => {
      const local = {
        title: "A Study",
      };
      const remote: RemoteMetadata = {
        title: "A Study",
      };

      const result = compareMetadata(local, remote);
      expect(result.classification).toBe("no_change");
    });

    it("should handle type mapping between CSL and Crossref", () => {
      // CSL uses "article-journal", Crossref uses "journal-article"
      const local = {
        title: "A Study",
        type: "article-journal",
      };
      const remote: RemoteMetadata = {
        title: "A Study",
        type: "journal-article",
      };

      const result = compareMetadata(local, remote);
      // Type mapping should recognize these as equivalent
      expect(result.changedFields).not.toContain("type");
    });

    it("should handle additional type mappings (monograph → book)", () => {
      const local = {
        title: "A Book",
        type: "book",
      };
      const remote: RemoteMetadata = {
        title: "A Book",
        type: "monograph",
      };

      const result = compareMetadata(local, remote);
      expect(result.changedFields).not.toContain("type");
    });

    it("should handle additional type mappings (dissertation → thesis)", () => {
      const local = {
        title: "A Thesis",
        type: "thesis",
      };
      const remote: RemoteMetadata = {
        title: "A Thesis",
        type: "dissertation",
      };

      const result = compareMetadata(local, remote);
      expect(result.changedFields).not.toContain("type");
    });

    it("should detect type diff for unmapped Crossref types", () => {
      const local = {
        title: "A Study",
        type: "article-journal",
      };
      const remote: RemoteMetadata = {
        title: "A Study",
        type: "standard",
      };

      const result = compareMetadata(local, remote);
      // "standard" is not in CROSSREF_TO_CSL_TYPE, so it passes through as-is
      expect(result.changedFields).toContain("type");
    });

    it("should handle both local and remote having empty fields", () => {
      const local = {};
      const remote: RemoteMetadata = {};

      const result = compareMetadata(local, remote);
      expect(result.classification).toBe("no_change");
      expect(result.changedFields).toHaveLength(0);
    });
  });
});
