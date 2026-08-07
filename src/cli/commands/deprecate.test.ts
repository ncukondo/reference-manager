import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CslItem } from "../../core/csl-json/types.js";
import type { ExecutionContext } from "../execution-context.js";
import {
  type DeprecateCommandResult,
  executeDeprecate,
  formatDeprecateOutput,
  validateDeprecateOptions,
} from "./deprecate.js";

const mockDeprecateReference = vi.fn();
vi.mock("../../features/operations/deprecate.js", () => ({
  deprecateReference: (...args: unknown[]) => mockDeprecateReference(...args),
}));

function item(id: string, uuid: string, custom: Record<string, unknown> = {}): CslItem {
  return { id, type: "article-journal", title: id, custom: { uuid, ...custom } };
}

describe("validateDeprecateOptions", () => {
  it("accepts --to on its own", () => {
    expect(validateDeprecateOptions({ to: "B" })).toBeNull();
  });

  it("accepts --to with a known reason", () => {
    expect(validateDeprecateOptions({ to: "B", reason: "duplicate" })).toBeNull();
    expect(validateDeprecateOptions({ to: "B", reason: "published_version" })).toBeNull();
    expect(validateDeprecateOptions({ to: "B", reason: "other" })).toBeNull();
  });

  it("accepts --unset on its own", () => {
    expect(validateDeprecateOptions({ unset: true })).toBeNull();
  });

  it("rejects --to together with --unset", () => {
    expect(validateDeprecateOptions({ to: "B", unset: true })).toBe(
      "Cannot use --to and --unset together."
    );
  });

  it("rejects neither --to nor --unset", () => {
    expect(validateDeprecateOptions({})).toBe(
      "Nothing to do. Use --to <id> to set a successor, or --unset to clear one."
    );
  });

  it("rejects --reason with --unset", () => {
    expect(validateDeprecateOptions({ unset: true, reason: "duplicate" })).toBe(
      "--reason has no meaning with --unset."
    );
  });

  it("rejects an unknown reason", () => {
    expect(validateDeprecateOptions({ to: "B", reason: "merged" })).toBe(
      "Invalid --reason: merged. Expected one of: duplicate, published_version, other."
    );
  });
});

describe("executeDeprecate", () => {
  const context = { library: {} } as unknown as ExecutionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeprecateReference.mockResolvedValue({ applied: true });
  });

  it("passes the successor and reason through", async () => {
    await executeDeprecate({ identifier: "A", target: "B", reason: "duplicate" }, context);

    expect(mockDeprecateReference).toHaveBeenCalledWith(context.library, {
      identifier: "A",
      idType: "id",
      target: "B",
      reason: "duplicate",
      unset: false,
    });
  });

  it("passes uuid lookup through", async () => {
    await executeDeprecate({ identifier: "uuid-a", target: "uuid-b", idType: "uuid" }, context);

    expect(mockDeprecateReference).toHaveBeenCalledWith(
      context.library,
      expect.objectContaining({ idType: "uuid" })
    );
  });

  it("omits target and reason when clearing", async () => {
    await executeDeprecate({ identifier: "A", unset: true }, context);

    expect(mockDeprecateReference).toHaveBeenCalledWith(context.library, {
      identifier: "A",
      idType: "id",
      unset: true,
    });
  });
});

describe("formatDeprecateOutput", () => {
  it("reports a mark that was set", () => {
    const result: DeprecateCommandResult = {
      applied: true,
      item: item("A", "uuid-a", { superseded_reason: "duplicate" }),
      target: item("B", "uuid-b"),
    };

    expect(formatDeprecateOutput(result, "A")).toBe("Marked A as superseded by B (duplicate).");
  });

  it("reports a mark that was cleared", () => {
    const result: DeprecateCommandResult = { applied: true, item: item("A", "uuid-a") };

    expect(formatDeprecateOutput(result, "A")).toBe("Cleared the superseded mark from A.");
  });

  it("reports a no-op unset", () => {
    const result: DeprecateCommandResult = {
      applied: false,
      item: item("A", "uuid-a"),
      noop: true,
    };

    expect(formatDeprecateOutput(result, "A")).toBe("A is not marked as superseded.");
  });

  // The reference may have been looked up by uuid, so report the citation key the library
  // actually holds rather than echoing the identifier back.
  it("names the reference by its citation key, not the identifier given", () => {
    const result: DeprecateCommandResult = {
      applied: true,
      item: item("Carless2020-yj", "uuid-a", { superseded_reason: "other" }),
      target: item("Carless2023-yt", "uuid-b"),
    };

    expect(formatDeprecateOutput(result, "uuid-a")).toBe(
      "Marked Carless2020-yj as superseded by Carless2023-yt (other)."
    );
  });
});
