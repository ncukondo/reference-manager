import { EventEmitter } from "node:events";
import * as fs from "node:fs/promises";

/**
 * The subset of `fs.Stats` that identifies a file version.
 *
 * `ino` catches atomic replaces (write-to-temp + rename) even when the sync
 * client preserves the source machine's mtime and the byte length is the same.
 * `null` means the file does not currently exist.
 */
interface FileSignature {
  ino: number;
  size: number;
  mtimeMs: number;
}

async function readSignature(filePath: string): Promise<FileSignature | null> {
  try {
    const stat = await fs.stat(filePath);
    return { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function sameSignature(a: FileSignature | null, b: FileSignature | null): boolean {
  if (a === null || b === null) return a === b;
  return a.ino === b.ino && a.size === b.size && a.mtimeMs === b.mtimeMs;
}

/**
 * StatPoller periodically stats a single file and emits 'change' when its
 * identity (inode), size, or modification time differs from the last
 * observation.
 *
 * It exists as a fallback for environments where native file-system events
 * are not delivered: cloud-synced folders (OneDrive, Dropbox, Google Drive)
 * updated from another machine, and network / WSL drvfs (9p) mounts that
 * never emit inotify events for changes made on the host side.
 *
 * A directory path is not polled: directory mtime only tracks entry
 * add/remove, not content edits, so it would produce noise without value.
 *
 * Events:
 * - 'change' (path): the file's stat signature changed since the last tick
 * - 'error' (error): stat failed for a reason other than ENOENT
 */
export class StatPoller extends EventEmitter {
  private readonly filePath: string;
  private readonly intervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private lastSignature: FileSignature | null = null;
  private tickInFlight = false;

  constructor(filePath: string, intervalMs: number) {
    super();
    this.filePath = filePath;
    this.intervalMs = intervalMs;
  }

  /**
   * Seed the baseline signature and begin polling.
   * Resolves without starting when the path is a directory.
   */
  async start(): Promise<void> {
    if (this.timer) return;

    try {
      const stat = await fs.stat(this.filePath);
      if (stat.isDirectory()) return;
      this.lastSignature = { ino: stat.ino, size: stat.size, mtimeMs: stat.mtimeMs };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      this.lastSignature = null;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
    // Never keep the process alive just for the poll.
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  isRunning(): boolean {
    return this.timer !== null;
  }

  getIntervalMs(): number {
    return this.intervalMs;
  }

  private async tick(): Promise<void> {
    // A slow stat (network mount) must not pile up overlapping ticks.
    if (this.tickInFlight) return;
    this.tickInFlight = true;

    try {
      const current = await readSignature(this.filePath);
      // stop() may have run while the stat was pending.
      if (!this.timer) return;

      if (!sameSignature(current, this.lastSignature)) {
        this.lastSignature = current;
        this.emit("change", this.filePath);
      }
    } catch (error) {
      // An 'error' emit with no listener throws; a poll must never take the
      // host process down.
      if (this.listenerCount("error") > 0) {
        this.emit("error", error);
      }
    } finally {
      this.tickInFlight = false;
    }
  }
}
