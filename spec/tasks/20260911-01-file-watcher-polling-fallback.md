# Task: File Watcher Polling Fallback for Cloud-Synced Libraries

## Purpose

In server mode (HTTP / MCP) the library file is watched with chokidar so that external edits are
reloaded. The watcher relies on native file-system events only. When `library.json` lives on a
cloud-synced folder (OneDrive, Dropbox, Google Drive) and the change arrives from another PC, native
events are frequently not delivered — most notably when the folder is reached through a WSL drvfs
(9p) mount, which never emits inotify events for changes made on the Windows side. The in-memory
library then silently diverges from the file, and the next mutation on the server overwrites the
other PC's changes.

`config.watch.pollIntervalMs` already exists but is inert: `FileWatcher` accepts `usePolling`, yet
neither `startServerWithFileWatcher` nor `createMcpContext` sets it, and there is no config key for
it. `spec/features/file-monitoring.md` promises a "polling fallback" that does not exist.

## References

- Spec: `spec/features/file-monitoring.md`
- Related: `src/features/file-watcher/file-watcher.ts`, `src/server/index.ts`,
  `src/mcp/context.ts`, `src/config/{schema,defaults,loader,key-parser}.ts`,
  `src/features/config/show.ts`

## Decisions

1. **Always-on stat fallback.** `FileWatcher` runs a lightweight `fs.stat` poll every
   `pollIntervalMs` alongside native watching. It fires a change when `mtimeMs` or `size` differs
   from the last observed value (or when the file appears/disappears). `Library.reload()` already
   dedupes via content hash, so a duplicate native + poll event is harmless. Stat is cheap even
   on 9p; hashing the file every tick is not.
2. **`watch.use_polling` config key** (camelCase `usePolling`, default `false`). When `true`,
   chokidar's native watching is replaced by its own polling mode (`fs.watchFile`). This is the
   escape hatch for mounts where `fs.watch` itself fails (some NFS/9p setups). When `usePolling`
   is on, the stat fallback is skipped because chokidar already polls.
3. **MCP passes `pollIntervalMs` too.** `createMcpContext` currently drops it.

## Non-Goals

- Conflict resolution between server-side dirty state and an external change (`reload()` keeps
  discarding dirty state; unchanged).
- Content-hash polling.

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Stat-based polling fallback in `FileWatcher`

- [ ] Write test: `src/features/file-watcher/file-watcher.test.ts`
      - with `usePolling: false`, a change that produces no native event (simulate by stubbing
        chokidar via `vi.mock`, or by pausing the chokidar watcher) is still emitted within
        `pollIntervalMs` + `debounceMs`
      - a file whose mtime and size are unchanged does not fire
      - self-writes still end in `reload()` returning `false` (hash unchanged) — covered at the
        server level in Step 3
      - `close()` stops the poll timer (no events after close, no open handles)
      - with `usePolling: true` the stat poll is not started (chokidar polls instead)
- [ ] Implement: `startStatPoll()` / `stopStatPoll()` in `FileWatcher`, seeded with the initial
      `stat` at `start()`, timer `unref()`'d so it never keeps the process alive
- [ ] Verify Green: `npm run test:unit -- file-watcher.test.ts`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: `watch.use_polling` config key

- [ ] Write test: `src/config/loader.test.ts` (default `false`, TOML `use_polling = true` and
      `usePolling = true` both load), `src/features/config/show.test.ts` (`use_polling` shown),
      `src/config/key-parser.test.ts` (`watch.use_polling` is a boolean key)
- [ ] Implement: `watchConfigSchema`, `partialConfigSchema`, `defaultConfig`, `loader.ts`,
      `key-parser.ts` registry, `show.ts`
- [ ] Verify Green
- [ ] Lint/Type check

### Step 3: Wire config into server and MCP watchers

- [ ] Write test: `src/server/index.test.ts` and `src/mcp/context.test.ts` — with
      `watch.usePolling = true`, an external write is reloaded; `pollIntervalMs` from config is
      forwarded (assert via `fileWatcher.getPollIntervalMs()`)
- [ ] Implement: pass `usePolling` (server + MCP) and `pollIntervalMs` (MCP) to `FileWatcher`
- [ ] Verify Green
- [ ] Lint/Type check

### Step 4: Spec and docs

- [ ] Update `spec/features/file-monitoring.md`: describe the stat fallback, the `use_polling`
      key, and the cloud-sync / WSL rationale
- [ ] Add `watch.use_polling` to the config key table in `spec/features/config-command.md` if
      the watch section is listed there
- [ ] CHANGELOG.md entry under Unreleased / Fixed

## Completion Checklist

- [ ] All tests pass (`npm run test:all`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
