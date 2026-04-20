import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReleaseInfo } from "./check.js";
import {
  __pendingForTesting,
  __resetForTesting,
  flushUpdateNotice,
  maybeStartUpdateCheck,
} from "./notifier.js";

function captureStream(): { stream: NodeJS.WritableStream; output: () => string } {
  const stream = new PassThrough();
  let buf = "";
  stream.on("data", (chunk) => {
    buf += String(chunk);
  });
  return { stream, output: () => buf };
}

function release(latest: string): ReleaseInfo {
  return {
    checkedAt: "2026-04-20T12:00:00Z",
    latest,
    url: `https://github.com/ncukondo/reference-manager/releases/tag/v${latest}`,
  };
}

describe("notifier", () => {
  beforeEach(() => {
    __resetForTesting();
  });

  afterEach(() => {
    __resetForTesting();
  });

  it("does not start a check when stdout is not a TTY", async () => {
    const getLatest = vi.fn(async () => release("0.34.0"));
    const { stream, output } = captureStream();

    maybeStartUpdateCheck("list", {
      isTty: false,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    expect(getLatest).not.toHaveBeenCalled();
    expect(__pendingForTesting()).toBeNull();
    flushUpdateNotice();
    expect(output()).toBe("");
  });

  it("does not start a check when REFERENCE_MANAGER_NO_UPDATE_CHECK=1", () => {
    const getLatest = vi.fn(async () => release("0.34.0"));
    const { stream, output } = captureStream();

    maybeStartUpdateCheck("list", {
      isTty: true,
      env: { REFERENCE_MANAGER_NO_UPDATE_CHECK: "1" },
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    expect(getLatest).not.toHaveBeenCalled();
    flushUpdateNotice();
    expect(output()).toBe("");
  });

  it.each(["upgrade", "completion", "mcp", "server"])(
    "does not start a check for the '%s' command",
    (command) => {
      const getLatest = vi.fn(async () => release("0.34.0"));
      const { stream, output } = captureStream();

      maybeStartUpdateCheck(command, {
        isTty: true,
        env: {},
        currentVersion: "0.33.4",
        getLatest,
        output: stream,
      });

      expect(getLatest).not.toHaveBeenCalled();
      flushUpdateNotice();
      expect(output()).toBe("");
    }
  );

  it("prints a notice to the configured stream when a newer version is available", async () => {
    const getLatest = vi.fn(async () => release("0.34.0"));
    const { stream, output } = captureStream();

    maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    expect(getLatest).toHaveBeenCalledTimes(1);
    await __pendingForTesting();
    flushUpdateNotice();

    const text = output();
    expect(text).toContain("0.33.4");
    expect(text).toContain("0.34.0");
    expect(text).toContain("ref upgrade");
  });

  it("prints nothing when the running version equals the latest", async () => {
    const getLatest = vi.fn(async () => release("0.33.4"));
    const { stream, output } = captureStream();

    maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    await __pendingForTesting();
    flushUpdateNotice();

    expect(output()).toBe("");
  });

  it("prints nothing when the check returns null (network failure)", async () => {
    const getLatest = vi.fn(async () => null);
    const { stream, output } = captureStream();

    maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    await __pendingForTesting();
    flushUpdateNotice();

    expect(output()).toBe("");
  });

  it("returns synchronously without awaiting the async check", () => {
    let resolveCheck: (v: ReleaseInfo) => void = () => {};
    const pending = new Promise<ReleaseInfo>((r) => {
      resolveCheck = r;
    });
    const getLatest = vi.fn(() => pending);
    const { stream, output } = captureStream();

    const before = Date.now();
    maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });
    const after = Date.now();

    expect(after - before).toBeLessThan(50);

    // Check has not resolved yet, so flush should print nothing.
    flushUpdateNotice();
    expect(output()).toBe("");

    resolveCheck(release("0.34.0"));
  });

  it("does not throw when the check rejects", async () => {
    const getLatest = vi.fn(async () => {
      throw new Error("boom");
    });
    const { stream, output } = captureStream();

    maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    await __pendingForTesting();
    expect(() => flushUpdateNotice()).not.toThrow();
    expect(output()).toBe("");
  });

  it("does not double-print when flush is called twice", async () => {
    const getLatest = vi.fn(async () => release("0.34.0"));
    const { stream, output } = captureStream();

    maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    await __pendingForTesting();
    flushUpdateNotice();
    const first = output();
    flushUpdateNotice();
    expect(output()).toBe(first);
  });
});
