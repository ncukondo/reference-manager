import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import { buildUuidIndex } from "./resolver.js";
import { collectSupersededWarnings, formatSupersededWarning } from "./warning.js";

function item(id: string, uuid: string, custom: Record<string, unknown> = {}): CslItem {
  return {
    id,
    type: "article-journal",
    title: id,
    custom: {
      uuid,
      created_at: "2026-01-01T00:00:00.000Z",
      timestamp: "2026-01-01T00:00:00.000Z",
      ...custom,
    },
  };
}

function mark(uuid: string, reason = "duplicate"): Record<string, unknown> {
  return {
    superseded_by: uuid,
    superseded_reason: reason,
    superseded_at: "2026-08-07T00:00:00.000Z",
  };
}

describe("formatSupersededWarning", () => {
  it("names the successor by citation key", () => {
    const a = item("Carless2020-yj", "uuid-a", mark("uuid-b"));
    const b = item("Carless2023-yt", "uuid-b");
    expect(formatSupersededWarning(a, buildUuidIndex([a, b]))).toBe(
      "[SUPERSEDED] Carless2020-yj -> Carless2023-yt (duplicate)"
    );
  });

  it("resolves through a chain to the final successor", () => {
    const a = item("A", "uuid-a", mark("uuid-b"));
    const b = item("B", "uuid-b", mark("uuid-c", "published_version"));
    const c = item("C", "uuid-c");
    // The reason shown is the starting record's own reason, not the intermediate one.
    expect(formatSupersededWarning(a, buildUuidIndex([a, b, c]))).toBe(
      "[SUPERSEDED] A -> C (duplicate)"
    );
  });

  it("names the missing uuid when the pointer dangles", () => {
    const a = item("A", "uuid-a", mark("uuid-gone"));
    expect(formatSupersededWarning(a, buildUuidIndex([a]))).toBe(
      "[SUPERSEDED] A -> <missing: uuid-gone> (duplicate)"
    );
  });

  it("flags a cycle rather than presenting the chain as resolved", () => {
    const a = item("A", "uuid-a", mark("uuid-b"));
    const b = item("B", "uuid-b", mark("uuid-a"));
    expect(formatSupersededWarning(a, buildUuidIndex([a, b]))).toBe(
      "[SUPERSEDED] A -> B (duplicate, superseded chain has a cycle)"
    );
  });

  it("falls back to the reason default on a pointer-only mark", () => {
    const a = item("A", "uuid-a", { superseded_by: "uuid-b" });
    const b = item("B", "uuid-b");
    expect(formatSupersededWarning(a, buildUuidIndex([a, b]))).toBe("[SUPERSEDED] A -> B (other)");
  });

  it("returns null for an unmarked reference", () => {
    const a = item("A", "uuid-a");
    expect(formatSupersededWarning(a, buildUuidIndex([a]))).toBeNull();
  });
});

describe("collectSupersededWarnings", () => {
  const a = item("A", "uuid-a", mark("uuid-c"));
  const b = item("B", "uuid-b");
  const c = item("C", "uuid-c");

  it("returns one line per superseded reference, in input order", () => {
    expect(collectSupersededWarnings([a, b, c], [a, b, c])).toEqual([
      "[SUPERSEDED] A -> C (duplicate)",
    ]);
  });

  it("returns an empty array when nothing is superseded", () => {
    expect(collectSupersededWarnings([b, c], [a, b, c])).toEqual([]);
  });

  // The successor may sit outside the shown subset — resolution must use the whole library.
  it("resolves against the full library, not just the shown items", () => {
    expect(collectSupersededWarnings([a], [a, b, c])).toEqual(["[SUPERSEDED] A -> C (duplicate)"]);
  });
});
