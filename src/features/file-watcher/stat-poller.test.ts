import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatPoller } from "./stat-poller";

/** Poll until the predicate holds or the timeout elapses. */
async function waitFor(fn: () => boolean, timeoutMs = 1500): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fn()) return;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`waitFor timed out after ${timeoutMs}ms`);
}

describe("StatPoller", () => {
  let tempDir: string;
  let filePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "stat-poller-test-"));
    filePath = path.join(tempDir, "references.json");
    await fs.writeFile(filePath, "[]");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("lifecycle", () => {
    it("is not running before start()", () => {
      const poller = new StatPoller(filePath, 50);
      expect(poller.isRunning()).toBe(false);
    });

    it("is running after start() and stopped after stop()", async () => {
      const poller = new StatPoller(filePath, 50);
      await poller.start();
      expect(poller.isRunning()).toBe(true);
      poller.stop();
      expect(poller.isRunning()).toBe(false);
    });

    it("is safe to call start() twice and stop() twice", async () => {
      const poller = new StatPoller(filePath, 50);
      await poller.start();
      await poller.start();
      expect(poller.isRunning()).toBe(true);
      poller.stop();
      poller.stop();
      expect(poller.isRunning()).toBe(false);
    });

    it("does not start when the path is a directory", async () => {
      const poller = new StatPoller(tempDir, 50);
      await poller.start();
      expect(poller.isRunning()).toBe(false);
      poller.stop();
    });

    it("exposes the interval", () => {
      const poller = new StatPoller(filePath, 1234);
      expect(poller.getIntervalMs()).toBe(1234);
    });
  });

  describe("change detection", () => {
    it("emits 'change' with the path when the file content changes", async () => {
      const poller = new StatPoller(filePath, 50);
      const onChange = vi.fn();
      poller.on("change", onChange);
      await poller.start();

      try {
        await fs.writeFile(filePath, '[{"id": "changed"}]');
        await waitFor(() => onChange.mock.calls.length > 0);
        expect(onChange).toHaveBeenCalledWith(filePath);
      } finally {
        poller.stop();
      }
    });

    it("emits 'change' when the file is replaced by an atomic rename with identical size", async () => {
      // Cloud sync clients (OneDrive, Dropbox) replace the file via rename and can
      // preserve the original mtime from the other machine. Size is identical here
      // and mtime is pinned to the old value, so only the inode differs.
      const poller = new StatPoller(filePath, 50);
      const onChange = vi.fn();
      poller.on("change", onChange);
      await poller.start();

      try {
        const before = await fs.stat(filePath);
        const tmp = path.join(tempDir, "references.json.tmp");
        await fs.writeFile(tmp, "{}"); // same byte length as "[]"
        await fs.utimes(tmp, before.atime, before.mtime);
        await fs.rename(tmp, filePath);

        await waitFor(() => onChange.mock.calls.length > 0);
        expect(onChange).toHaveBeenCalledWith(filePath);
      } finally {
        poller.stop();
      }
    });

    it("does not emit when nothing changes", async () => {
      const poller = new StatPoller(filePath, 30);
      const onChange = vi.fn();
      poller.on("change", onChange);
      await poller.start();

      try {
        await new Promise((r) => setTimeout(r, 200));
        expect(onChange).not.toHaveBeenCalled();
      } finally {
        poller.stop();
      }
    });

    it("emits once per change, not once per tick", async () => {
      const poller = new StatPoller(filePath, 30);
      const onChange = vi.fn();
      poller.on("change", onChange);
      await poller.start();

      try {
        await fs.writeFile(filePath, '[{"id": "once"}]');
        await waitFor(() => onChange.mock.calls.length > 0);
        await new Promise((r) => setTimeout(r, 150));
        expect(onChange).toHaveBeenCalledTimes(1);
      } finally {
        poller.stop();
      }
    });

    it("emits when the file disappears and again when it reappears", async () => {
      const poller = new StatPoller(filePath, 30);
      const onChange = vi.fn();
      poller.on("change", onChange);
      await poller.start();

      try {
        await fs.rm(filePath);
        await waitFor(() => onChange.mock.calls.length >= 1);

        await fs.writeFile(filePath, "[]");
        await waitFor(() => onChange.mock.calls.length >= 2);
      } finally {
        poller.stop();
      }
    });

    it("starts on a missing file and emits when it is created", async () => {
      const missing = path.join(tempDir, "later.json");
      const poller = new StatPoller(missing, 30);
      const onChange = vi.fn();
      poller.on("change", onChange);
      await poller.start();

      try {
        expect(poller.isRunning()).toBe(true);
        await fs.writeFile(missing, "[]");
        await waitFor(() => onChange.mock.calls.length > 0);
        expect(onChange).toHaveBeenCalledWith(missing);
      } finally {
        poller.stop();
      }
    });

    it("does not emit after stop()", async () => {
      const poller = new StatPoller(filePath, 30);
      const onChange = vi.fn();
      poller.on("change", onChange);
      await poller.start();
      poller.stop();

      await fs.writeFile(filePath, '[{"id": "after-stop"}]');
      await new Promise((r) => setTimeout(r, 150));
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});
