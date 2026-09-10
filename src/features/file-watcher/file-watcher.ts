import { EventEmitter } from "node:events";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import { StatPoller } from "./stat-poller.js";

/**
 * Options for FileWatcher
 */
export interface FileWatcherOptions {
  /** Debounce time in milliseconds (default: 500) */
  debounceMs?: number;
  /**
   * Poll interval in milliseconds (default: 5000).
   * Used by chokidar's polling mode when `usePolling` is on, and by the
   * always-on stat fallback otherwise.
   */
  pollIntervalMs?: number;
  /**
   * Replace native file system events with chokidar's polling mode
   * (`fs.watchFile`). Use this on mounts where `fs.watch` itself fails.
   * When off (default), native events are used and a lightweight `fs.stat`
   * fallback runs alongside them so that changes which never produce a native
   * event — cloud sync from another machine, WSL drvfs (9p) mounts — are still
   * picked up within one poll interval.
   */
  usePolling?: boolean;
  /** Retry delay in milliseconds for JSON parse (default: 200) */
  retryDelayMs?: number;
  /** Maximum number of retries for JSON parse (default: 10) */
  maxRetries?: number;
}

// Default values from spec
const DEFAULT_DEBOUNCE_MS = 500;
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_RETRY_DELAY_MS = 200;
const DEFAULT_MAX_RETRIES = 10;

/**
 * Check if a file should be ignored based on spec patterns
 * Ignored patterns:
 * - *.tmp
 * - *.bak
 * - *.conflict.*
 * - *.lock
 * - editor swap files (.swp, ~)
 */
function shouldIgnore(filePath: string): boolean {
  const basename = path.basename(filePath);

  // *.tmp files
  if (basename.endsWith(".tmp")) return true;

  // *.bak files
  if (basename.endsWith(".bak")) return true;

  // *.conflict.* files (contains .conflict. in name)
  if (basename.includes(".conflict.")) return true;

  // *.lock files
  if (basename.endsWith(".lock")) return true;

  // Vim swap files (.*.swp)
  if (basename.startsWith(".") && basename.endsWith(".swp")) return true;

  // Editor backup files (*~)
  if (basename.endsWith("~")) return true;

  return false;
}

/**
 * FileWatcher watches a file or directory for changes and emits events.
 *
 * Change detection combines two sources, both debounced through the same
 * path so a change seen by both fires once:
 * - chokidar (native events, or its own polling when `usePolling` is set)
 * - a stat-based fallback ({@link StatPoller}) that only runs when
 *   `usePolling` is off and the watched path is a file
 *
 * Events:
 * - 'change': Emitted when a watched file changes (after debounce)
 * - 'error': Emitted when a watch error occurs
 * - 'ready': Emitted when watching has started
 * - 'parsed': Emitted when JSON file is successfully parsed
 * - 'parseError': Emitted when JSON parse fails after all retries
 */
export class FileWatcher extends EventEmitter {
  private readonly watchPath: string;
  private readonly debounceMs: number;
  private readonly pollIntervalMs: number;
  private readonly usePolling: boolean;
  private readonly retryDelayMs: number;
  private readonly maxRetries: number;

  private watcher: FSWatcher | null = null;
  private statPoller: StatPoller | null = null;
  private watching = false;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(watchPath: string, options?: FileWatcherOptions) {
    super();
    this.watchPath = watchPath;
    this.debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS;
    this.pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.usePolling = options?.usePolling ?? false;
    this.retryDelayMs = options?.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    this.maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    if (this.watching) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.watcher = chokidar.watch(this.watchPath, {
        ignored: shouldIgnore,
        persistent: true,
        usePolling: this.usePolling,
        interval: this.pollIntervalMs,
        ignoreInitial: true,
        awaitWriteFinish: false,
      });

      this.watcher.on("ready", () => {
        this.watching = true;
        this.startStatFallback()
          .catch((error: unknown) => {
            this.emitErrorIfListened(error);
          })
          .finally(() => {
            this.emit("ready");
            resolve();
          });
      });

      this.watcher.on("error", (error: unknown) => {
        this.emit("error", error);
        if (!this.watching) {
          reject(error);
        }
      });

      this.watcher.on("change", (filePath: string) => {
        this.handleFileChange(filePath);
      });

      this.watcher.on("add", (filePath: string) => {
        this.handleFileChange(filePath);
      });
    });
  }

  /**
   * Start the stat-based fallback unless chokidar is already polling.
   * StatPoller declines to run on a directory path.
   */
  private async startStatFallback(): Promise<void> {
    if (this.usePolling || this.statPoller) return;

    const poller = new StatPoller(this.watchPath, this.pollIntervalMs);
    poller.on("change", (filePath: string) => {
      this.handleFileChange(filePath);
    });
    poller.on("error", (error: unknown) => {
      this.emitErrorIfListened(error);
    });
    await poller.start();

    if (poller.isRunning()) {
      this.statPoller = poller;
    }
  }

  /**
   * Emit 'error' only when someone is listening; an unhandled 'error' event
   * would throw and take the host process down.
   */
  private emitErrorIfListened(error: unknown): void {
    if (this.listenerCount("error") > 0) {
      this.emit("error", error);
    }
  }

  /**
   * Handle file change with debouncing
   */
  private handleFileChange(filePath: string): void {
    // Clear existing timer for this file
    const existingTimer = this.debounceTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounced timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      this.emit("change", filePath);
      this.tryParseJsonFile(filePath);
    }, this.debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Try to parse JSON file with retries
   */
  private async tryParseJsonFile(filePath: string): Promise<void> {
    // Only parse .json files
    if (path.extname(filePath).toLowerCase() !== ".json") {
      return;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const parsed = JSON.parse(content);
        this.emit("parsed", filePath, parsed);
        return;
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelayMs);
        }
      }
    }

    this.emit("parseError", filePath, lastError);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Stop watching for file changes
   */
  close(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.statPoller) {
      this.statPoller.stop();
      this.statPoller = null;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    this.watching = false;
  }

  /**
   * Get the watched path
   */
  getPath(): string {
    return this.watchPath;
  }

  /**
   * Check if the watcher is currently active
   */
  isWatching(): boolean {
    return this.watching;
  }

  /**
   * Whether the stat-based fallback poll is running.
   * False when `usePolling` is on, when the path is a directory, or after close().
   */
  isStatPollingActive(): boolean {
    return this.statPoller?.isRunning() ?? false;
  }

  /**
   * Get the debounce time in milliseconds
   */
  getDebounceMs(): number {
    return this.debounceMs;
  }

  /**
   * Get the poll interval in milliseconds
   */
  getPollIntervalMs(): number {
    return this.pollIntervalMs;
  }

  /**
   * Get the retry delay in milliseconds
   */
  getRetryDelayMs(): number {
    return this.retryDelayMs;
  }

  /**
   * Get the maximum number of retries
   */
  getMaxRetries(): number {
    return this.maxRetries;
  }
}
