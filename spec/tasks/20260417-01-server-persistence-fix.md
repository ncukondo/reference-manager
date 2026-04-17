# Task: Fix Server Mutation Persistence (#93)

## Purpose

Server mutations are not persisted to `library.json`. When the HTTP server is running, changes via `ref add` are applied in memory but never written to disk. Server stop/crash causes silent data loss.

## References

- Issue: #93
- Related: `src/server/routes/references.ts`, `src/server/index.ts`, `src/cli/commands/server.ts`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Root Cause Analysis

| Route | Operation | `save()` called? |
|-------|-----------|:----------------:|
| POST `/api/references/` | `library.add()` direct | **No** |
| POST `/api/add/` | `addReferences()` op | Yes |
| PUT `/api/references/uuid,id` | `updateReference()` op | Yes |
| DELETE `/api/references/uuid,id` | `removeReference()` op | Yes |
| Shutdown (SIGINT/SIGTERM) | cleanup handler | **No** |
| `server stop` | portfile removal only | **No** |

## Steps

### Step 1: Add `library.save()` to POST `/api/references/` route

The direct `library.add()` call at `src/server/routes/references.ts:57` does not persist to disk.

- [x] Write test: `src/server/routes/references.test.ts` — verify that POST creates a reference AND persists it to disk
- [x] Implement: Add `await library.save()` after `library.add()` in the POST handler
- [x] Verify Green: `npm run test:unit -- references.test.ts`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Flush library on server shutdown (SIGINT/SIGTERM)

The cleanup handler at `src/cli/commands/server.ts:101-107` calls `dispose()` but not `library.save()`.

- [ ] Write test: verify that `dispose()` or cleanup triggers a save
- [ ] Implement: Update `startServerWithFileWatcher` to return `library` so cleanup can call `library.save()`, or add save to `dispose()`
- [ ] Verify Green
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Send SIGTERM on `server stop`

`serverStop()` at `src/cli/commands/server.ts:138-149` only removes the portfile without signaling the server process. The server process keeps running.

- [ ] Write test: verify `serverStop` sends SIGTERM to the server process
- [ ] Implement: Read PID from portfile and send `process.kill(pid, 'SIGTERM')` before removing portfile
- [ ] Verify Green
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Close linked issue (include `Closes #93` in PR description)
- [ ] Move this file to `spec/tasks/completed/`
