import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { scanDuplicates, suggestKeeper } from "./scanner.js";

function item(id: string, overrides: Partial<CslItem> = {}): CslItem {
  const { custom, ...rest } = overrides;
  return {
    id,
    type: "article-journal",
    title: id,
    custom: { uuid: `uuid-${id}`, created_at: "2026-01-01T00:00:00.000Z", ...custom },
    ...rest,
  };
}

function ids(groups: ReturnType<typeof scanDuplicates>): string[][] {
  return groups.map((g) => g.items.map((i) => i.id).sort());
}

describe("scanDuplicates", () => {
  it("groups records sharing a DOI", () => {
    const groups = scanDuplicates([
      item("A", { DOI: "10.1080/13562517.2020.1782372" }),
      item("B", { DOI: "10.1080/13562517.2020.1782372" }),
      item("C", { DOI: "10.1000/other" }),
    ]);

    expect(ids(groups)).toEqual([["A", "B"]]);
    expect(groups[0]?.types).toEqual(["doi"]);
    expect(groups[0]?.keys.doi).toBe("10.1080/13562517.2020.1782372");
  });

  it("normalizes DOI URL prefixes before comparing", () => {
    const groups = scanDuplicates([
      item("A", { DOI: "https://doi.org/10.1000/x" }),
      item("B", { DOI: "doi:10.1000/x" }),
    ]);

    expect(ids(groups)).toEqual([["A", "B"]]);
  });

  it("groups by PMID, arXiv, ERIC and Scopus ids", () => {
    const groups = scanDuplicates([
      item("P1", { PMID: "123" }),
      item("P2", { PMID: "123" }),
      item("A1", { custom: { uuid: "uuid-A1", arxiv_id: "2301.13867v1" } }),
      item("A2", { custom: { uuid: "uuid-A2", arxiv_id: "2301.13867v3" } }),
      item("E1", { custom: { uuid: "uuid-E1", eric_id: "EJ1" } }),
      item("E2", { custom: { uuid: "uuid-E2", eric_id: "EJ1" } }),
      item("S1", { custom: { uuid: "uuid-S1", scopus_id: "2-s2.0-1" } }),
      item("S2", { custom: { uuid: "uuid-S2", scopus_id: "2-s2.0-1" } }),
    ]);

    expect(ids(groups).sort()).toEqual([
      ["A1", "A2"],
      ["E1", "E2"],
      ["P1", "P2"],
      ["S1", "S2"],
    ]);
  });

  it("ignores records with no value for any scanned key", () => {
    expect(scanDuplicates([item("A"), item("B")])).toEqual([]);
  });

  it("merges groups that share a member into one", () => {
    // A and B match by DOI; B and C match by PMID — all three are the same work
    const groups = scanDuplicates([
      item("A", { DOI: "10.1/x" }),
      item("B", { DOI: "10.1/x", PMID: "99" }),
      item("C", { PMID: "99" }),
    ]);

    expect(ids(groups)).toEqual([["A", "B", "C"]]);
    expect(groups[0]?.types).toEqual(["doi", "pmid"]);
  });

  it("reports the largest group first", () => {
    const groups = scanDuplicates([
      item("A", { DOI: "10.1/pair" }),
      item("B", { DOI: "10.1/pair" }),
      item("C", { PMID: "7" }),
      item("D", { PMID: "7" }),
      item("E", { PMID: "7" }),
    ]);

    expect(groups[0]?.items).toHaveLength(3);
    expect(groups[1]?.items).toHaveLength(2);
  });

  describe("key selection", () => {
    const library = [
      item("T1", { issued: { "date-parts": [[2024]] }, author: [{ family: "Smith", given: "J" }] }),
      item("T2", {
        title: "T1",
        issued: { "date-parts": [[2024]] },
        author: [{ family: "Smith", given: "J" }],
      }),
    ];

    // Title + author + year is the noisiest rule in detector.ts; across a whole library it
    // reports errata and translations, so it stays opt-in.
    it("does not group by title by default", () => {
      expect(scanDuplicates(library)).toEqual([]);
    });

    it("groups by title when asked", () => {
      expect(ids(scanDuplicates(library, { by: ["title"] }))).toEqual([["T1", "T2"]]);
    });

    it("honours a restricted key list", () => {
      const groups = scanDuplicates(
        [item("A", { DOI: "10.1/x", PMID: "5" }), item("B", { PMID: "5" })],
        { by: ["doi"] }
      );

      expect(groups).toEqual([]);
    });
  });

  describe("ISBN rules", () => {
    it("groups books sharing an ISBN", () => {
      const groups = scanDuplicates([
        item("B1", { type: "book", ISBN: "978-0-306-40615-7" }),
        item("B2", { type: "book", ISBN: "9780306406157" }),
      ]);

      expect(ids(groups)).toEqual([["B1", "B2"]]);
    });

    // Otherwise every edited volume would surface as one N-way duplicate of its own chapters.
    it("does not group different chapters of the same book", () => {
      const groups = scanDuplicates([
        item("C1", { type: "chapter", ISBN: "9780306406157", title: "Chapter One" }),
        item("C2", { type: "chapter", ISBN: "9780306406157", title: "Chapter Two" }),
      ]);

      expect(groups).toEqual([]);
    });

    it("groups the same chapter imported twice", () => {
      const groups = scanDuplicates([
        item("C1", { type: "chapter", ISBN: "9780306406157", title: "Chapter One" }),
        item("C2", { type: "chapter", ISBN: "9780306406157", title: "Chapter One" }),
      ]);

      expect(ids(groups)).toEqual([["C1", "C2"]]);
    });

    it("does not group a book with its own chapter", () => {
      const groups = scanDuplicates([
        item("Book", { type: "book", ISBN: "9780306406157", title: "The Whole Book" }),
        item("Chap", { type: "chapter", ISBN: "9780306406157", title: "Chapter One" }),
      ]);

      expect(groups).toEqual([]);
    });
  });

  describe("already-resolved groups", () => {
    const linked = [
      item("Old", {
        DOI: "10.1/x",
        custom: { uuid: "uuid-Old", superseded_by: "uuid-New", superseded_reason: "duplicate" },
      }),
      item("New", { DOI: "10.1/x", custom: { uuid: "uuid-New" } }),
    ];

    // Without this the same pairs would be reported again on every run, forever.
    it("are hidden by default", () => {
      expect(scanDuplicates(linked)).toEqual([]);
    });

    it("are reported with includeResolved, and flagged", () => {
      const groups = scanDuplicates(linked, { includeResolved: true });

      expect(ids(groups)).toEqual([["New", "Old"]]);
      expect(groups[0]?.resolved).toBe(true);
    });

    it("still reports a group where a pointer leads outside it", () => {
      const groups = scanDuplicates([
        item("Old", {
          DOI: "10.1/x",
          custom: { uuid: "uuid-Old", superseded_by: "uuid-elsewhere" },
        }),
        item("New", { DOI: "10.1/x", custom: { uuid: "uuid-New" } }),
      ]);

      expect(ids(groups)).toEqual([["New", "Old"]]);
      expect(groups[0]?.resolved).toBe(false);
    });

    it("still reports a three-way group with only one pointer set", () => {
      const groups = scanDuplicates([
        item("A", { DOI: "10.1/x", custom: { uuid: "uuid-A", superseded_by: "uuid-C" } }),
        item("B", { DOI: "10.1/x", custom: { uuid: "uuid-B" } }),
        item("C", { DOI: "10.1/x", custom: { uuid: "uuid-C" } }),
      ]);

      expect(groups[0]?.resolved).toBe(false);
    });
  });
});

describe("suggestKeeper", () => {
  // The real case from #108: an online-first record and its version of record, which is the one
  // that gained volume, issue and page numbers.
  it("prefers the more complete record", () => {
    const onlineFirst = item("Carless2020-yj", {
      DOI: "10.1/x",
      issued: { "date-parts": [[2020]] },
    });
    const versionOfRecord = item("Carless2023-yt", {
      DOI: "10.1/x",
      volume: "28",
      issue: "5",
      page: "1024-1042",
      issued: { "date-parts": [[2023]] },
    });

    expect(suggestKeeper([onlineFirst, versionOfRecord]).id).toBe("Carless2023-yt");
    expect(suggestKeeper([versionOfRecord, onlineFirst]).id).toBe("Carless2023-yt");
  });

  it("falls back to the later publication year when completeness ties", () => {
    const older = item("Old", { issued: { "date-parts": [[2020]] } });
    const newer = item("New", { issued: { "date-parts": [[2023]] } });

    expect(suggestKeeper([older, newer]).id).toBe("New");
  });

  it("never suggests a record that is already superseded", () => {
    const marked = item("Marked", {
      volume: "1",
      page: "1-2",
      abstract: "rich",
      custom: { uuid: "uuid-Marked", superseded_by: "uuid-Plain" },
    });
    const plain = item("Plain");

    expect(suggestKeeper([marked, plain]).id).toBe("Plain");
  });

  // Repeated runs must pre-select the same record, or --fix would look nondeterministic.
  it("is stable when everything else ties", () => {
    const first = item("A", { custom: { uuid: "uuid-A", created_at: "2026-01-01T00:00:00.000Z" } });
    const second = item("B", {
      custom: { uuid: "uuid-B", created_at: "2026-02-01T00:00:00.000Z" },
    });

    expect(suggestKeeper([first, second]).id).toBe("A");
    expect(suggestKeeper([second, first]).id).toBe("A");
  });
});
