# Task: Fix Server Autostart in Bun-Compiled Binary

## Purpose

Fix server autostart and daemon mode spawning when running as a bun-compiled single binary. The current code uses `spawn(process.execPath, [process.argv[1], ...])` which assumes a runtime+script model (e.g., `node script.js`). In bun-compiled binaries, `process.execPath` IS the binary itself, so the spawn pattern needs adjustment.

## References

- Related: `src/cli/server-detection.ts` (autostart spawn)
- Related: `src/cli/commands/server.ts` (daemon mode spawn)
- Related: Phase 44 (Single-Binary Distribution)

## Problem

Two functions spawn child processes incorrectly for compiled binaries:

1. `server-detection.ts:startServerDaemon()` — auto-starts server when no portfile exists
2. `commands/server.ts:startServerDaemon()` — handles `--daemon` flag

Both do:
```typescript
const binaryPath = process.argv[1] || process.execPath;
spawn(process.execPath, [binaryPath, "server", "start", "--library", ...])
```

In bun-compiled binaries, `process.execPath === process.argv[1]` (both point to the compiled binary). This causes the spawned process to receive an extra argument, breaking command parsing.

## Fix

Extract a shared utility `getCliSpawnArgs(cliArgs)` that returns the correct `[command, args]` tuple based on whether we're running as a compiled binary or under a runtime.

Detection: In compiled binaries, `process.argv[1] === process.execPath` (no separate script file).

## Steps

### Step 1: Create `getCliSpawnArgs` utility with tests

- [x] Write test: `src/cli/spawn-args.test.ts`
- [x] Create stub: `src/cli/spawn-args.ts`
- [x] Verify Red
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 2: Update `server-detection.ts` to use `getCliSpawnArgs`

- [x] Update `startServerDaemon` in `server-detection.ts`
- [x] Update test in `server-detection.test.ts`
- [x] Verify Green
- [x] Lint/Type check

### Step 3: Update `commands/server.ts` to use `getCliSpawnArgs`

- [x] Update `startServerDaemon` in `commands/server.ts`
- [x] Update test in `commands/server.test.ts`
- [x] Verify Green
- [x] Lint/Type check

## Completion Checklist

- [x] All tests pass (`npm run test`)
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
