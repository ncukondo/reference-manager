import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * chokidar is replaced with a watcher that reports 'ready' and then stays
 * silent forever. This is exactly what happens on a WSL drvfs (9p) mount or a
 * cloud-synced folder updated from another machine: the native watcher is
 * healthy but never sees the change. Everything observed below therefore
 * comes from FileWatcher's stat-based fallback.
 */
vi.mock("chokidar", async () => {
  const { EventEmitter } = await import("node:events");
  class SilentWatcher extends EventEmitter {
    close(): Promise<void> {
      return Promise.resolve();
    }
  }
  return {
    default: {
      watch: () => {
        const w = new SilentWatcher();
        setImmediate(() => w.emit("ready"));
        return w;
      },
    },
  };
});

import { FileWatcher } from "./file-watcher";

async function waitFor(fn: () => boolean, timeoutMs = 2000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

describe("FileWatcher stat polling fallback (native events silent)", () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-watcher-fallback-test-"));
    filePath = path.join(tempDir, "references.json");
    await fs.writeFile(filePath, "[]");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("runs the stat fallback by default", async () => {
    const watcher = new FileWatcher(filePath, { pollIntervalMs: 50, debounceMs: 20 });
    expect(watcher.isStatPollingActive()).toBe(false);
    await watcher.start();
    try {
      expect(watcher.isStatPollingActive()).toBe(true);
    } finally {
      watcher.close();
    }
  });

  it("emits 'change' for an external edit that produced no native event", async () => {
    const watcher = new FileWatcher(filePath, { pollIntervalMs: 50, debounceMs: 20 });
    const onChange = vi.fn();
    watcher.on("change", onChange);
    await watcher.start();

    try {
      await fs.writeFile(filePath, '[{"id": "from-other-pc"}]');
      await waitFor(() => onChange.mock.calls.length > 0);
      expect(onChange).toHaveBeenCalledWith(filePath);
    } finally {
      watcher.close();
    }
  });

  it("emits 'parsed' with the new content through the fallback path", async () => {
    const watcher = new FileWatcher(filePath, { pollIntervalMs: 50, debounceMs: 20 });
    const onParsed = vi.fn();
    watcher.on("parsed", onParsed);
    await watcher.start();

    try {
      await fs.writeFile(filePath, '[{"id": "synced"}]');
      await waitFor(() => onParsed.mock.calls.length > 0);
      expect(onParsed).toHaveBeenCalledWith(filePath, [{ id: "synced" }]);
    } finally {
      watcher.close();
    }
  });

  it("uses pollIntervalMs for the fallback cadence", async () => {
    const watcher = new FileWatcher(filePath, { pollIntervalMs: 40, debounceMs: 10 });
    const onChange = vi.fn();
    watcher.on("change", onChange);
    await watcher.start();

    try {
      const started = Date.now();
      await fs.writeFile(filePath, '[{"id": "fast"}]');
      await waitFor(() => onChange.mock.calls.length > 0);
      // One poll tick + debounce, with generous slack for CI.
      expect(Date.now() - started).toBeLessThan(1000);
    } finally {
      watcher.close();
    }
  });

  it("does not run the stat fallback when usePolling is on (chokidar polls instead)", async () => {
    const watcher = new FileWatcher(filePath, {
      usePolling: true,
      pollIntervalMs: 50,
      debounceMs: 20,
    });
    await watcher.start();
    try {
      expect(watcher.isStatPollingActive()).toBe(false);
    } finally {
      watcher.close();
    }
  });

  it("stops the fallback on close()", async () => {
    const watcher = new FileWatcher(filePath, { pollIntervalMs: 30, debounceMs: 10 });
    const onChange = vi.fn();
    watcher.on("change", onChange);
    await watcher.start();
    watcher.close();
    expect(watcher.isStatPollingActive()).toBe(false);

    await fs.writeFile(filePath, '[{"id": "after-close"}]');
    await new Promise((r) => setTimeout(r, 150));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("does not poll a directory path", async () => {
    const watcher = new FileWatcher(tempDir, { pollIntervalMs: 30, debounceMs: 10 });
    await watcher.start();
    try {
      expect(watcher.isStatPollingActive()).toBe(false);
    } finally {
      watcher.close();
    }
  });
});
