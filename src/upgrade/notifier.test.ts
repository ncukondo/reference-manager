import { PassThrough } from "node:stream";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReleaseInfo } from "./check.js";
import type * as NotifierModule from "./notifier.js";

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

async function freshNotifier(): Promise<typeof NotifierModule> {
  vi.resetModules();
  return await import("./notifier.js");
}

describe("notifier", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("does not start a check when stdout is not a TTY", async () => {
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    const getLatest = vi.fn(async () => release("0.34.0"));
    const { stream, output } = captureStream();

    await maybeStartUpdateCheck("list", {
      isTty: false,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    expect(getLatest).not.toHaveBeenCalled();
    flushUpdateNotice();
    expect(output()).toBe("");
  });

  it("does not start a check when REFERENCE_MANAGER_NO_UPDATE_CHECK=1", async () => {
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    const getLatest = vi.fn(async () => release("0.34.0"));
    const { stream, output } = captureStream();

    await maybeStartUpdateCheck("list", {
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

  it("does not start a check when noUpdateCheck=true (e.g. --no-update-check)", async () => {
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    const getLatest = vi.fn(async () => release("0.34.0"));
    const { stream, output } = captureStream();

    await maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
      noUpdateCheck: true,
    });

    expect(getLatest).not.toHaveBeenCalled();
    flushUpdateNotice();
    expect(output()).toBe("");
  });

  it.each(["upgrade", "completion", "mcp", "server"])(
    "does not start a check for the '%s' command",
    async (command) => {
      const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
      const getLatest = vi.fn(async () => release("0.34.0"));
      const { stream, output } = captureStream();

      await maybeStartUpdateCheck(command, {
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
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    const getLatest = vi.fn(async () => release("0.34.0"));
    const { stream, output } = captureStream();

    await maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    expect(getLatest).toHaveBeenCalledTimes(1);
    flushUpdateNotice();

    const text = output();
    expect(text).toContain("0.33.4");
    expect(text).toContain("0.34.0");
    expect(text).toContain("ref upgrade");
  });

  it("prints nothing when the running version equals the latest", async () => {
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    const getLatest = vi.fn(async () => release("0.33.4"));
    const { stream, output } = captureStream();

    await maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    flushUpdateNotice();
    expect(output()).toBe("");
  });

  it("prints nothing when the check returns null (network failure)", async () => {
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    const getLatest = vi.fn(async () => null);
    const { stream, output } = captureStream();

    await maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    flushUpdateNotice();
    expect(output()).toBe("");
  });

  it("returns synchronously without awaiting the async check", async () => {
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    let resolveCheck: (v: ReleaseInfo) => void = () => {};
    const pending = new Promise<ReleaseInfo>((r) => {
      resolveCheck = r;
    });
    const getLatest = vi.fn(() => pending);
    const { stream, output } = captureStream();

    const before = Date.now();
    const checkDone = maybeStartUpdateCheck("list", {
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
    await checkDone;
  });

  it("does not throw when the check rejects", async () => {
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    const getLatest = vi.fn(async () => {
      throw new Error("boom");
    });
    const { stream, output } = captureStream();

    await maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    expect(() => flushUpdateNotice()).not.toThrow();
    expect(output()).toBe("");
  });

  it("registers the process 'exit' listener only once across repeated calls", async () => {
    const { maybeStartUpdateCheck } = await freshNotifier();
    const getLatest = vi.fn(async () => release("0.34.0"));
    const { stream } = captureStream();

    const before = process.listenerCount("exit");

    for (let i = 0; i < 5; i++) {
      await maybeStartUpdateCheck("list", {
        isTty: true,
        env: {},
        currentVersion: "0.33.4",
        getLatest,
        output: stream,
      });
    }

    const after = process.listenerCount("exit");
    expect(after - before).toBe(1);
  });

  it("does not double-print when flush is called twice", async () => {
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    const getLatest = vi.fn(async () => release("0.34.0"));
    const { stream, output } = captureStream();

    await maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.33.4",
      getLatest,
      output: stream,
    });

    flushUpdateNotice();
    const first = output();
    flushUpdateNotice();
    expect(output()).toBe(first);
  });
});
