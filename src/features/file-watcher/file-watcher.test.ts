import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileWatcher } from "./file-watcher";

describe("FileWatcher", () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    // Create temp directory for test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-watcher-test-"));
    testFilePath = path.join(tempDir, "references.json");
    await fs.writeFile(testFilePath, "[]");
  });

  afterEach(async () => {
    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe("constructor and options", () => {
    it("should create watcher with default options", () => {
      const watcher = new FileWatcher(testFilePath);
      expect(watcher).toBeInstanceOf(FileWatcher);
      watcher.close();
    });

    it("should accept custom debounce time", () => {
      const watcher = new FileWatcher(testFilePath, { debounceMs: 1000 });
      expect(watcher).toBeInstanceOf(FileWatcher);
      watcher.close();
    });

    it("should accept custom poll interval", () => {
      const watcher = new FileWatcher(testFilePath, { pollIntervalMs: 10000 });
      expect(watcher).toBeInstanceOf(FileWatcher);
      watcher.close();
    });

    it("should accept polling mode option", () => {
      const watcher = new FileWatcher(testFilePath, { usePolling: true });
      expect(watcher).toBeInstanceOf(FileWatcher);
      watcher.close();
    });
  });

  describe("ignored patterns", () => {
    it("should ignore .tmp files", async () => {
      const callback = vi.fn();
      const watcher = new FileWatcher(tempDir, { debounceMs: 50 });
      watcher.on("change", callback);

      await watcher.start();

      // Create a .tmp file
      const tmpFile = path.join(tempDir, "test.tmp");
      await fs.writeFile(tmpFile, "temp content");

      // Wait for potential callback
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(callback).not.toHaveBeenCalled();
      watcher.close();
    });

    it("should ignore .bak files", async () => {
      const callback = vi.fn();
      const watcher = new FileWatcher(tempDir, { debounceMs: 50 });
      watcher.on("change", callback);

      await watcher.start();

      // Create a .bak file
      const bakFile = path.join(tempDir, "test.bak");
      await fs.writeFile(bakFile, "backup content");

      // Wait for potential callback
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(callback).not.toHaveBeenCalled();
      watcher.close();
    });

    it("should ignore .conflict.* files", async () => {
      const callback = vi.fn();
      const watcher = new FileWatcher(tempDir, { debounceMs: 50 });
      watcher.on("change", callback);

      await watcher.start();

      // Create a .conflict. file
      const conflictFile = path.join(tempDir, "test.conflict.json");
      await fs.writeFile(conflictFile, "conflict content");

      // Wait for potential callback
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(callback).not.toHaveBeenCalled();
      watcher.close();
    });

    it("should ignore .lock files", async () => {
      const callback = vi.fn();
      const watcher = new FileWatcher(tempDir, { debounceMs: 50 });
      watcher.on("change", callback);

      await watcher.start();

      // Create a .lock file
      const lockFile = path.join(tempDir, "test.lock");
      await fs.writeFile(lockFile, "lock content");

      // Wait for potential callback
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(callback).not.toHaveBeenCalled();
      watcher.close();
    });

    it("should ignore editor swap files (.swp)", async () => {
      const callback = vi.fn();
      const watcher = new FileWatcher(tempDir, { debounceMs: 50 });
      watcher.on("change", callback);

      await watcher.start();

      // Create a .swp file (vim swap)
      const swpFile = path.join(tempDir, ".test.swp");
      await fs.writeFile(swpFile, "swap content");

      // Wait for potential callback
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(callback).not.toHaveBeenCalled();
      watcher.close();
    });

    it("should ignore editor swap files (~)", async () => {
      const callback = vi.fn();
      const watcher = new FileWatcher(tempDir, { debounceMs: 50 });
      watcher.on("change", callback);

      await watcher.start();

      // Create a ~ file (editor backup)
      const tildeFile = path.join(tempDir, "test.json~");
      await fs.writeFile(tildeFile, "tilde content");

      // Wait for potential callback
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(callback).not.toHaveBeenCalled();
      watcher.close();
    });
  });

  describe("change detection", () => {
    it("should detect .json file changes", async () => {
      const callback = vi.fn();
      const watcher = new FileWatcher(tempDir, { debounceMs: 50 });
      watcher.on("change", callback);

      await watcher.start();

      // Modify the JSON file
      await fs.writeFile(testFilePath, '[{"id": "test"}]');

      // Wait for debounced callback
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(testFilePath);
      watcher.close();
    });

    it("should debounce rapid changes", async () => {
      const callback = vi.fn();
      const watcher = new FileWatcher(tempDir, { debounceMs: 100 });
      watcher.on("change", callback);

      await watcher.start();

      // Rapidly modify the file multiple times
      await fs.writeFile(testFilePath, '[{"id": "test1"}]');
      await new Promise((resolve) => setTimeout(resolve, 20));
      await fs.writeFile(testFilePath, '[{"id": "test2"}]');
      await new Promise((resolve) => setTimeout(resolve, 20));
      await fs.writeFile(testFilePath, '[{"id": "test3"}]');

      // Wait for debounced callback
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Should only be called once due to debouncing
      expect(callback).toHaveBeenCalledTimes(1);
      watcher.close();
    });

    it("should use default debounce of 500ms", () => {
      const watcher = new FileWatcher(testFilePath);
      expect(watcher.getDebounceMs()).toBe(500);
      watcher.close();
    });
  });

  describe("polling fallback", () => {
    it("should support polling mode", async () => {
      const callback = vi.fn();
      const watcher = new FileWatcher(tempDir, {
        usePolling: true,
        pollIntervalMs: 100,
        debounceMs: 50,
      });
      watcher.on("change", callback);

      await watcher.start();

      // Modify the JSON file
      await fs.writeFile(testFilePath, '[{"id": "polled"}]');

      // Wait for poll interval + debounce
      await new Promise((resolve) => setTimeout(resolve, 250));

      expect(callback).toHaveBeenCalled();
      watcher.close();
    });

    it("should use default poll interval of 5000ms", () => {
      const watcher = new FileWatcher(testFilePath, { usePolling: true });
      expect(watcher.getPollIntervalMs()).toBe(5000);
      watcher.close();
    });
  });

  describe("event emitter", () => {
    it("should have error event listener capability", () => {
      const errorCallback = vi.fn();
      const watcher = new FileWatcher(tempDir);
      watcher.on("error", errorCallback);

      // Manually emit error to verify listener works
      const testError = new Error("Test error");
      watcher.emit("error", testError);

      expect(errorCallback).toHaveBeenCalledWith(testError);
      watcher.close();
    });

    it("should emit 'ready' event when watching starts", async () => {
      const readyCallback = vi.fn();
      const watcher = new FileWatcher(tempDir);
      watcher.on("ready", readyCallback);

      await watcher.start();

      expect(readyCallback).toHaveBeenCalled();
      watcher.close();
    });
  });

  describe("close", () => {
    it("should stop watching after close", async () => {
      const callback = vi.fn();
      const watcher = new FileWatcher(tempDir, { debounceMs: 50 });
      watcher.on("change", callback);

      await watcher.start();
      watcher.close();

      // Modify the file after close
      await fs.writeFile(testFilePath, '[{"id": "after-close"}]');

      // Wait for potential callback
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(callback).not.toHaveBeenCalled();
    });

    it("should be safe to call close multiple times", () => {
      const watcher = new FileWatcher(testFilePath);
      expect(() => {
        watcher.close();
        watcher.close();
        watcher.close();
      }).not.toThrow();
    });
  });

  describe("getPath", () => {
    it("should return the watched path", () => {
      const watcher = new FileWatcher(testFilePath);
      expect(watcher.getPath()).toBe(testFilePath);
      watcher.close();
    });
  });

  describe("isWatching", () => {
    it("should return false before start", () => {
      const watcher = new FileWatcher(testFilePath);
      expect(watcher.isWatching()).toBe(false);
      watcher.close();
    });

    it("should return true after start", async () => {
      const watcher = new FileWatcher(tempDir);
      await watcher.start();
      expect(watcher.isWatching()).toBe(true);
      watcher.close();
    });

    it("should return false after close", async () => {
      const watcher = new FileWatcher(tempDir);
      await watcher.start();
      watcher.close();
      expect(watcher.isWatching()).toBe(false);
    });
  });
});

describe("FileWatcher - JSON parse retry", () => {
  let tempDir: string;
  let testFilePath: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "file-watcher-retry-"));
    testFilePath = path.join(tempDir, "references.json");
    await fs.writeFile(testFilePath, "[]");
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should retry JSON parse on failure", async () => {
    const watcher = new FileWatcher(tempDir, {
      debounceMs: 50,
      retryDelayMs: 50,
      maxRetries: 3,
    });

    const parseCallback = vi.fn();
    const errorCallback = vi.fn();
    watcher.on("parsed", parseCallback);
    watcher.on("parseError", errorCallback);

    await watcher.start();

    // Write invalid JSON first
    await fs.writeFile(testFilePath, "invalid json{");

    // Wait a bit for retries to start
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Now fix the JSON (simulating file write completion)
    await fs.writeFile(testFilePath, '[{"id": "fixed"}]');

    // Wait for successful parse
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Should eventually succeed
    expect(parseCallback).toHaveBeenCalled();
    watcher.close();
  });

  it("should emit parseError after max retries exceeded", async () => {
    const watcher = new FileWatcher(tempDir, {
      debounceMs: 50,
      retryDelayMs: 50,
      maxRetries: 3,
    });

    const errorCallback = vi.fn();
    watcher.on("parseError", errorCallback);

    await watcher.start();

    // Write invalid JSON that won't be fixed
    await fs.writeFile(testFilePath, "permanently invalid json{");

    // Wait for all retries (3 retries * 50ms + debounce)
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(errorCallback).toHaveBeenCalled();
    watcher.close();
  });

  it("should use default retry settings (200ms * 10 retries)", () => {
    const watcher = new FileWatcher(testFilePath);
    expect(watcher.getRetryDelayMs()).toBe(200);
    expect(watcher.getMaxRetries()).toBe(10);
    watcher.close();
  });
});
