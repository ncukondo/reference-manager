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

- Watch-based reload
- Polling fallback only
- Debounce: 500 ms
- Poll interval: 5 s
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
