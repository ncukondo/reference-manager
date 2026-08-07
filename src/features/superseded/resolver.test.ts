import { describe, expect, it } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import {
  buildUuidIndex,
  getSupersededMark,
  isSuperseded,
  resolveFinalSuccessor,
  resolveSuccessor,
} from "./resolver.js";

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

describe("getSupersededMark", () => {
  it("returns the mark when superseded_by is present", () => {
    expect(getSupersededMark(item("A", "uuid-a", mark("uuid-b")))).toEqual({
      supersededBy: "uuid-b",
      reason: "duplicate",
      at: "2026-08-07T00:00:00.000Z",
    });
  });

  it("returns null for an unmarked reference", () => {
    expect(getSupersededMark(item("A", "uuid-a"))).toBeNull();
  });

  it("returns null when the item has no custom block", () => {
    expect(getSupersededMark({ id: "A", type: "article-journal" })).toBeNull();
  });

  // Hand-edited or foreign data may carry only the pointer. The pointer is the part that
  // matters, so it is honoured; the descriptive fields fall back.
  it("defaults a missing reason to other", () => {
    expect(getSupersededMark(item("A", "uuid-a", { superseded_by: "uuid-b" }))).toEqual({
      supersededBy: "uuid-b",
      reason: "other",
      at: undefined,
    });
  });

  it("treats an empty superseded_by as unmarked", () => {
    expect(getSupersededMark(item("A", "uuid-a", { superseded_by: "" }))).toBeNull();
    expect(getSupersededMark(item("A", "uuid-a", { superseded_by: "   " }))).toBeNull();
  });

  it("ignores a reason or timestamp without a pointer", () => {
    expect(
      getSupersededMark(item("A", "uuid-a", { superseded_reason: "duplicate", superseded_at: "x" }))
    ).toBeNull();
  });
});

describe("isSuperseded", () => {
  it("reflects the presence of a pointer", () => {
    expect(isSuperseded(item("A", "uuid-a", mark("uuid-b")))).toBe(true);
    expect(isSuperseded(item("A", "uuid-a"))).toBe(false);
  });
});

describe("buildUuidIndex", () => {
  it("indexes items by uuid", () => {
    const a = item("A", "uuid-a");
    const b = item("B", "uuid-b");
    const index = buildUuidIndex([a, b]);
    expect(index.get("uuid-a")).toBe(a);
    expect(index.get("uuid-b")).toBe(b);
  });

  it("skips items without a uuid", () => {
    const index = buildUuidIndex([{ id: "A", type: "article-journal" }]);
    expect(index.size).toBe(0);
  });
});

describe("resolveSuccessor", () => {
  const a = item("A", "uuid-a", mark("uuid-b"));
  const b = item("B", "uuid-b");

  it("returns the successor", () => {
    expect(resolveSuccessor(a, buildUuidIndex([a, b]))).toEqual({ target: b, dangling: false });
  });

  it("reports a dangling pointer when the uuid is absent", () => {
    expect(resolveSuccessor(a, buildUuidIndex([a]))).toEqual({ target: null, dangling: true });
  });

  it("returns null for an unmarked reference", () => {
    expect(resolveSuccessor(b, buildUuidIndex([a, b]))).toBeNull();
  });
});

describe("resolveFinalSuccessor", () => {
  it("follows a single hop", () => {
    const a = item("A", "uuid-a", mark("uuid-b"));
    const b = item("B", "uuid-b");
    expect(resolveFinalSuccessor(a, buildUuidIndex([a, b]))).toEqual({
      target: b,
      dangling: false,
      cycle: false,
      hops: 1,
    });
  });

  it("follows a chain to its end", () => {
    const a = item("A", "uuid-a", mark("uuid-b"));
    const b = item("B", "uuid-b", mark("uuid-c"));
    const c = item("C", "uuid-c");
    expect(resolveFinalSuccessor(a, buildUuidIndex([a, b, c]))).toEqual({
      target: c,
      dangling: false,
      cycle: false,
      hops: 2,
    });
  });

  it("reports the last resolvable record when the chain dangles", () => {
    const a = item("A", "uuid-a", mark("uuid-b"));
    const b = item("B", "uuid-b", mark("uuid-missing"));
    expect(resolveFinalSuccessor(a, buildUuidIndex([a, b]))).toEqual({
      target: b,
      dangling: true,
      cycle: false,
      hops: 1,
    });
  });

  it("reports a dangling first hop with no target", () => {
    const a = item("A", "uuid-a", mark("uuid-missing"));
    expect(resolveFinalSuccessor(a, buildUuidIndex([a]))).toEqual({
      target: null,
      dangling: true,
      cycle: false,
      hops: 0,
    });
  });

  // `ref deprecate` rejects cycles, but a hand-edited library.json can still contain one and
  // must not hang the CLI.
  it("terminates on a two-record cycle", () => {
    const a = item("A", "uuid-a", mark("uuid-b"));
    const b = item("B", "uuid-b", mark("uuid-a"));
    const result = resolveFinalSuccessor(a, buildUuidIndex([a, b]));
    expect(result?.cycle).toBe(true);
    expect(result?.target).toBe(b);
  });

  it("terminates on a self-reference", () => {
    const a = item("A", "uuid-a", mark("uuid-a"));
    const result = resolveFinalSuccessor(a, buildUuidIndex([a]));
    expect(result?.cycle).toBe(true);
  });

  it("terminates on a longer cycle", () => {
    const a = item("A", "uuid-a", mark("uuid-b"));
    const b = item("B", "uuid-b", mark("uuid-c"));
    const c = item("C", "uuid-c", mark("uuid-a"));
    const result = resolveFinalSuccessor(a, buildUuidIndex([a, b, c]));
    expect(result?.cycle).toBe(true);
    expect(result?.target).toBe(c);
  });

  it("returns null for an unmarked reference", () => {
    const a = item("A", "uuid-a");
    expect(resolveFinalSuccessor(a, buildUuidIndex([a]))).toBeNull();
  });
});
