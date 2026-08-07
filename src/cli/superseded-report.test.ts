import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../core/csl-json/types.js";
import type { ExecutionContext } from "./execution-context.js";
import { reportSuperseded } from "./superseded-report.js";

function item(id: string, uuid: string, custom: Record<string, unknown> = {}): CslItem {
  return { id, type: "article-journal", title: id, custom: { uuid, ...custom } };
}

function mark(uuid: string, reason = "duplicate"): Record<string, unknown> {
  return {
    superseded_by: uuid,
    superseded_reason: reason,
    superseded_at: "2026-08-07T00:00:00.000Z",
  };
}

describe("reportSuperseded", () => {
  let stderr: string[];
  let stdout: string[];
  let getAll: ReturnType<typeof vi.fn>;
  let context: ExecutionContext;

  function useLibrary(items: CslItem[]): void {
    getAll = vi.fn().mockResolvedValue(items);
    context = { library: { getAll } } as unknown as ExecutionContext;
  }

  beforeEach(() => {
    stderr = [];
    stdout = [];
    vi.spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderr.push(String(chunk));
      return true;
    });
    vi.spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdout.push(String(chunk));
      return true;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("writes one line per superseded reference", async () => {
    const old = item("Carless2020-yj", "uuid-old", mark("uuid-new"));
    const current = item("Carless2023-yt", "uuid-new");
    useLibrary([old, current]);

    const count = await reportSuperseded([old, current], context);

    expect(count).toBe(1);
    expect(stderr).toEqual(["[SUPERSEDED] Carless2020-yj -> Carless2023-yt (duplicate)\n"]);
  });

  // stdout is the contract for piping into pandoc, jq, and friends.
  it("never writes to stdout", async () => {
    const old = item("A", "uuid-old", mark("uuid-new"));
    useLibrary([old, item("B", "uuid-new")]);

    await reportSuperseded([old], context);

    expect(stdout).toEqual([]);
  });

  it("appends a summary line when one is given", async () => {
    const old = item("A", "uuid-old", mark("uuid-new"));
    useLibrary([old, item("B", "uuid-new")]);

    await reportSuperseded([old], context, { summary: (n) => `${n} included.` });

    expect(stderr.at(-1)).toBe("1 included.\n");
  });

  it("resolves against the whole library, not just the shown items", async () => {
    const old = item("A", "uuid-old", mark("uuid-new"));
    useLibrary([old, item("B", "uuid-new")]);

    await reportSuperseded([old], context);

    expect(stderr[0]).toContain("-> B");
  });

  // Every read command calls this, so the unmarked case must not cost a library fetch.
  it("does not fetch the library when nothing is superseded", async () => {
    useLibrary([item("A", "uuid-a")]);

    const count = await reportSuperseded([item("A", "uuid-a")], context);

    expect(count).toBe(0);
    expect(getAll).not.toHaveBeenCalled();
    expect(stderr).toEqual([]);
  });

  it("writes nothing in silent mode", async () => {
    const old = item("A", "uuid-old", mark("uuid-new"));
    useLibrary([old, item("B", "uuid-new")]);

    const count = await reportSuperseded([old], context, { silent: true });

    expect(count).toBe(0);
    expect(stderr).toEqual([]);
    expect(getAll).not.toHaveBeenCalled();
  });

  it("returns zero for an empty item list", async () => {
    useLibrary([]);

    expect(await reportSuperseded([], context)).toBe(0);
  });
});
