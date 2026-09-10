# File Monitoring & Reload

## Purpose

File monitoring enables the library to automatically reload when the CSL-JSON file is modified externally:

- **User direct edits**: Manual editing of the CSL-JSON file with text editor
- **Cloud sync updates**: Changes synced via OneDrive, Dropbox, Google Drive, etc.
- **External tools**: Modifications by other tools (e.g., Zotero export, scripts)

**Not for**: Changes made by the application itself (self-writes must be ignored)

## Monitoring

- Library file monitored with `chokidar`
- Reload triggered only by canonical CSL file change
- Ignored patterns:
  - `*.tmp`
  - `*.bak`
  - `*.conflict.*`
  - `*.lock`
  - editor swap files

### Two Detection Sources

Native file-system events alone are not enough. They are never delivered in
several situations that matter for a library kept in a cloud-synced folder:

- **WSL drvfs (9p) mounts** (`/mnt/c/.../OneDrive/library.json`): inotify emits
  nothing for changes made on the Windows side, so a sync from another PC is
  invisible to a server running inside WSL.
- **Cloud sync clients** (OneDrive, Dropbox, Google Drive) that replace the file
  via write-to-temp + rename, sometimes preserving the source machine's mtime.
- **Network mounts** where `fs.watch` succeeds but stays silent.

`FileWatcher` therefore combines two sources. Both feed the same debounce, so a
change seen by both fires once, and `Library.reload()`'s hash check drops it if
the content is unchanged.

| Source | When | Detects |
|--------|------|---------|
| chokidar native events | `use_polling = false` (default) | Changes the OS reports |
| `StatPoller` fallback | `use_polling = false` and the watched path is a file | `fs.stat` every `poll_interval_ms`; fires when inode, size, or mtime differ from the last tick |
| chokidar polling (`fs.watchFile`) | `use_polling = true` | Everything, by polling; `StatPoller` is skipped |

The stat fallback compares the **inode** as well as size and mtime so that an
atomic replace with identical length and a preserved mtime is still noticed.
It stats, never reads: hashing a multi-megabyte library every tick over 9p is
too slow, and the content hash is checked once in `reload()` anyway.

The fallback's timer is `unref()`'d. It never keeps the process alive on its
own, and a slow stat (network mount) does not pile up overlapping ticks.

### `watch.use_polling`

Set `use_polling = true` only when native watching fails outright (some NFS
and 9p setups raise on `fs.watch`). For the ordinary cloud-sync case the
default is enough: native events cover local edits instantly, and the stat
fallback catches synced changes within one poll interval.

```toml
[watch]
poll_interval_ms = 5000   # stat fallback cadence, and fs.watchFile interval when polling
use_polling = false       # true: chokidar polling only, no native events
```

## Self-Write Detection

To avoid reloading after the application's own write operations:

### Hash-Based Detection

1. **After load/write**: Calculate and store file hash (SHA-256)
2. **On change event**: Calculate new file hash
3. **Compare hashes**:
   - Same hash → Self-write, **skip reload**
   - Different hash → External change, **reload**

### Implementation

```typescript
class Library {
  private currentHash: string | null = null;

  async load(filePath: string): Promise<void> {
    // Load library
    const content = await readFile(filePath);
    this.currentHash = await hashFile(filePath);
    // ... parse and build index
  }

  async save(filePath: string): Promise<void> {
    // Save library
    await writeFile(filePath, content);
    // Update hash after write
    this.currentHash = await hashFile(filePath);
  }

  async handleFileChange(filePath: string): Promise<void> {
    const newHash = await hashFile(filePath);

    if (newHash === this.currentHash) {
      // Self-write detected, skip reload
      logger.debug("File change detected but hash matches (self-write), skipping reload");
      return;
    }

    // External change detected, reload
    logger.info("External file change detected, reloading library");
    await this.load(filePath);
  }
}
```

### Benefits

- **Reliable**: Hash comparison is deterministic
- **No race conditions**: Works regardless of timing
- **No false positives**: Only reloads on actual content changes
- **Simple**: No complex timing logic needed

## Reload Policy

- Watch-based reload, with an always-on stat fallback (see Two Detection Sources)
- Debounce: 500 ms
- Poll interval: 5 s (`watch.poll_interval_ms`)
- `watch.use_polling`: `false` (native events + stat fallback) by default
- JSON parse retry:
  - 200 ms × 10
- During reload:
  - Old index continues serving requests

## Use Cases

### Server Mode (Primary)

File watching is **always enabled** in server mode:
- Server runs continuously
- Responds to API requests
- Must reflect latest library state
- External changes (user edits, cloud sync) trigger reload

### CLI Mode

File watching is **not used** in CLI mode:
- Commands execute and exit immediately
- No need for continuous monitoring
- Library loaded once at start, used, then discarded
