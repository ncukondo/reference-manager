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

describe("isNewerVersion", () => {
  it.each([
    // [latest, current, expected]
    ["0.34.0", "0.33.4", true],
    ["0.33.4", "0.33.4", false],
    ["0.34.0", "0.35.0", false],
    ["0.10.0", "0.9.0", true],
    ["1.0.0", "1.0.0-beta.1", true],
    ["1.0.0-rc.1", "1.0.0", false],
    ["1.0.0-beta.2", "1.0.0-beta.1", true],
    ["1.0.0-beta.1", "1.0.0-beta.2", false],
    ["1.0.0-alpha.1", "1.0.0-alpha", true],
    ["1.0.0-beta", "1.0.0-alpha", true],
    ["1.0.0-rc.10", "1.0.0-rc.9", true],
    ["1.0", "0.9.9", true],
  ])("isNewerVersion(%s, %s) -> %s", async (latest, current, expected) => {
    const { isNewerVersion } = await freshNotifier();
    expect(isNewerVersion(latest, current)).toBe(expected);
  });

  it("falls back to plain inequality for unparseable versions", async () => {
    const { isNewerVersion } = await freshNotifier();
    expect(isNewerVersion("nightly", "0.33.4")).toBe(true);
    expect(isNewerVersion("nightly", "nightly")).toBe(false);
  });
});

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

  it("default check calls getLatestVersion with no overrides, keeping the 3s timeout", async () => {
    const getLatestVersion = vi.fn(async () => release("0.34.0"));
    vi.doMock("./check.js", () => ({ getLatestVersion }));
    try {
      const { maybeStartUpdateCheck } = await freshNotifier();
      const { stream } = captureStream();

      await maybeStartUpdateCheck("list", {
        isTty: true,
        env: {},
        currentVersion: "0.33.4",
        output: stream,
      });

      expect(getLatestVersion).toHaveBeenCalledTimes(1);
      // No timeoutMs override: the passive notifier path must keep the
      // conservative default from check.ts (3s), unlike explicit `ref upgrade`.
      expect(getLatestVersion).toHaveBeenCalledWith();
    } finally {
      vi.doUnmock("./check.js");
    }
  });

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
    // The notice must use ASCII-only characters so it renders on legacy
    // Windows terminals (cmd.exe / non-UTF-8 code pages).
    // biome-ignore lint/suspicious/noControlCharactersInRegex: intentional ASCII-range check
    expect(text).toMatch(/^[\x00-\x7f]*$/);
    expect(text).not.toContain("✨");
    expect(text).not.toContain("→");
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

  it("prints nothing when the running version is ahead of the latest release", async () => {
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    const getLatest = vi.fn(async () => release("0.34.0"));
    const { stream, output } = captureStream();

    await maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.35.0",
      getLatest,
      output: stream,
    });

    flushUpdateNotice();
    expect(output()).toBe("");
  });

  it("compares version components numerically, not lexically", async () => {
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    // Lexically "0.10.0" < "0.9.0"; numerically it is newer.
    const getLatest = vi.fn(async () => release("0.10.0"));
    const { stream, output } = captureStream();

    await maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "0.9.0",
      getLatest,
      output: stream,
    });

    flushUpdateNotice();
    expect(output()).toContain("0.10.0");
  });

  it("notifies when the latest release finalizes the running pre-release", async () => {
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    const getLatest = vi.fn(async () => release("1.0.0"));
    const { stream, output } = captureStream();

    await maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "1.0.0-beta.1",
      getLatest,
      output: stream,
    });

    flushUpdateNotice();
    expect(output()).toContain("1.0.0");
  });

  it("prints nothing when the latest release is a pre-release of the running version", async () => {
    const { maybeStartUpdateCheck, flushUpdateNotice } = await freshNotifier();
    const getLatest = vi.fn(async () => release("1.0.0-rc.1"));
    const { stream, output } = captureStream();

    await maybeStartUpdateCheck("list", {
      isTty: true,
      env: {},
      currentVersion: "1.0.0",
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
