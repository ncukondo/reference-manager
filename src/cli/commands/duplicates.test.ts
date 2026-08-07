import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { DuplicateGroup } from "../../features/duplicate/scanner.js";
import {
  type DuplicatesCommandResult,
  formatDuplicatesJsonOutput,
  formatDuplicatesOutput,
  parseByOption,
} from "./duplicates.js";

function item(id: string, overrides: Partial<CslItem> = {}): CslItem {
  return {
    id,
    type: "article-journal",
    title: `Title of ${id}`,
    custom: { uuid: `uuid-${id}` },
    ...overrides,
  };
}

function group(overrides: Partial<DuplicateGroup> = {}): DuplicateGroup {
  return {
    types: ["doi"],
    keys: { doi: "10.1/x" },
    items: [
      item("Carless2020-yj", { issued: { "date-parts": [[2020]] } }),
      item("Carless2023-yt", { issued: { "date-parts": [[2023]] } }),
    ],
    resolved: false,
    ...overrides,
  };
}

function result(overrides: Partial<DuplicatesCommandResult> = {}): DuplicatesCommandResult {
  return { groups: [group()], scanned: 6109, ...overrides };
}

describe("parseByOption", () => {
  it("returns an empty list when the option is absent", () => {
    expect(parseByOption(undefined)).toEqual([]);
  });

  it("parses a comma-separated list", () => {
    expect(parseByOption("doi,pmid,isbn")).toEqual(["doi", "pmid", "isbn"]);
  });

  it("tolerates spaces around entries", () => {
    expect(parseByOption("doi, pmid")).toEqual(["doi", "pmid"]);
  });

  it("rejects an unknown key", () => {
    expect(parseByOption("doi,issn")).toBe(
      "Unknown --by value: issn. Expected one or more of: doi, pmid, isbn, arxiv, eric, scopus, title."
    );
  });

  it("names every unknown key", () => {
    expect(parseByOption("issn,wibble")).toContain("Unknown --by values: issn, wibble");
  });

  it("rejects a list that parses to nothing", () => {
    expect(parseByOption(",,")).toContain("Empty --by list");
  });
});

describe("formatDuplicatesOutput", () => {
  it("reports a clean library with the scan size", () => {
    expect(formatDuplicatesOutput(result({ groups: [], scanned: 6109 }))).toBe(
      "No duplicates found among 6109 references."
    );
  });

  it("names what matched and lists the members", () => {
    const output = formatDuplicatesOutput(result());

    expect(output).toContain("1. doi=10.1/x");
    expect(output).toContain("Carless2020-yj (2020)  Title of Carless2020-yj");
    expect(output).toContain("Carless2023-yt (2023)  Title of Carless2023-yt");
  });

  // The redundant count is what the user is deciding about, not the group count.
  it("counts redundant records, not group members", () => {
    const output = formatDuplicatesOutput(
      result({
        groups: [
          group(),
          group({ items: [item("A"), item("B"), item("C")], keys: { doi: "10.1/y" } }),
        ],
      })
    );

    expect(output).toContain("2 duplicate groups, 3 redundant records, among 6109 references.");
  });

  it("flags a group that is already linked", () => {
    expect(formatDuplicatesOutput(result({ groups: [group({ resolved: true })] }))).toContain(
      "[already linked]"
    );
  });

  it("points at --fix", () => {
    expect(formatDuplicatesOutput(result())).toContain("Run with --fix in a terminal");
  });

  it("lists every contributing key type", () => {
    const output = formatDuplicatesOutput(
      result({ groups: [group({ types: ["doi", "pmid"], keys: { doi: "10.1/x", pmid: "99" } })] })
    );

    expect(output).toContain("doi=10.1/x, pmid=99");
  });
});

describe("formatDuplicatesJsonOutput", () => {
  it("carries the counts and the group detail", () => {
    const json = formatDuplicatesJsonOutput(result());

    expect(json.scanned).toBe(6109);
    expect(json.groupCount).toBe(1);
    expect(json.redundantCount).toBe(1);
    expect(json.groups[0]?.types).toEqual(["doi"]);
    expect(json.groups[0]?.keys).toEqual({ doi: "10.1/x" });
    expect(json.groups[0]?.items).toEqual([
      {
        id: "Carless2020-yj",
        uuid: "uuid-Carless2020-yj",
        title: "Title of Carless2020-yj",
        year: 2020,
      },
      {
        id: "Carless2023-yt",
        uuid: "uuid-Carless2023-yt",
        title: "Title of Carless2023-yt",
        year: 2023,
      },
    ]);
  });

  it("omits fields the record does not have", () => {
    const json = formatDuplicatesJsonOutput(
      result({ groups: [group({ items: [{ id: "A", type: "article-journal" }, item("B")] })] })
    );

    expect(json.groups[0]?.items[0]).toEqual({ id: "A" });
  });

  it("reports an empty scan", () => {
    const json = formatDuplicatesJsonOutput(result({ groups: [], scanned: 12 }));

    expect(json).toEqual({ scanned: 12, groupCount: 0, redundantCount: 0, groups: [] });
  });
});
