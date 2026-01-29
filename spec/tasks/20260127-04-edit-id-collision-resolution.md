# Task: Edit ID Collision Auto-Resolution

## Purpose

Enable automatic ID collision resolution for `ref edit` (and align `ref update` CLI behavior with the server).
When a user edits a reference's ID to one that already exists, the system should auto-resolve
by appending a suffix (e.g., `Smith-2020a`) instead of failing, and clearly report the change.

## Prerequisites

- `20260127-01-pr45-followup-refactor.md` Steps 3 & 4 should be completed first (they modify `toEditItemResult` and `updateEditedItem` in `edit.ts`, which this task also modifies)

## References

- Spec: `spec/features/edit.md` (EditItemResult, Output Format, Error Handling)
- Spec: `spec/features/json-output.md` (UpdateJsonOutput)
- Related: `src/cli/commands/edit.ts`, `src/cli/commands/update.ts`
- Related: `src/core/library.ts` (resolveIdCollision, resolveNewId)
- Related: `src/features/operations/update.ts` (updateReference)

## Background

- `Library.resolveNewId` supports `onIdCollision: "suffix"` to auto-resolve ID collisions
- HTTP server routes already default to `"suffix"`
- CLI commands (`ref edit`, `ref update`) default to `"fail"`, causing errors on collision
- `EditItemResult` lacks `idChanged`/`newId` fields, so even if auto-resolution were enabled,
  the result would not be reported to the user

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Add `idChanged`/`newId` to EditItemResult

Extend `EditItemResult` interface and update `toEditItemResult` to propagate
`idChanged`/`newId` from `UpdateResult`.

**Changes:**
- `src/cli/commands/edit.ts`: Add `idChanged?: boolean` and `newId?: string` to `EditItemResult`
- `src/cli/commands/edit.ts`: Update `toEditItemResult` to set these fields from `UpdateResult`

**Tests:**
- `src/cli/commands/edit.test.ts`: Test `toEditItemResult` returns `idChanged`/`newId` when present in `UpdateResult`

- [x] Write test
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 2: Enable `onIdCollision: "suffix"` for edit command

Pass `onIdCollision: "suffix"` in `updateEditedItem` calls to `library.update()`.

**Changes:**
- `src/cli/commands/edit.ts`: Pass `{ idType: "uuid", onIdCollision: "suffix" }` in `updateEditedItem`

**Tests:**
- `src/cli/commands/edit.test.ts`: Test that ID collision is resolved (state is `"updated"` with `idChanged: true`)

- [x] Write test
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 3: Update `formatEditOutput` for ID changes

Show `(was: <original>)` notation for items where ID was auto-resolved.

**Changes:**
- `src/cli/commands/edit.ts`: Update `formatEditOutput` to display resolved IDs
- `src/cli/commands/edit.ts`: Update `executeEditCommand` to use `newId` for `updatedIds`

**Tests:**
- `src/cli/commands/edit.test.ts`: Test output formatting with `idChanged` items

- [x] Write test
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 4: Enable `onIdCollision: "suffix"` for update command

Pass `onIdCollision: "suffix"` in update command's `executeUpdate`.

**Changes:**
- `src/cli/commands/update.ts`: Pass `onIdCollision: "suffix"` to `library.update()`
- `src/cli/commands/update.ts`: Update `formatUpdateOutput` collision path (now resolves instead of failing)

**Tests:**
- `src/cli/commands/update.test.ts`: Test that ID collision is resolved with suffix
- `src/cli/commands/update.test.ts`: Update existing collision error tests

- [x] Write test
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 5: Update existing tests

Update tests that expect `id_collision` failure behavior to reflect new auto-resolution behavior.

**Tests to update:**
- `src/cli/commands/edit.test.ts`: `id_collision` state formatting tests
- `src/cli/commands/update.test.ts`: ID collision result formatting tests
- `src/features/operations/update.test.ts`: `updateReference` collision tests (default changes)
- `src/features/operations/json-output.test.ts`: JSON collision error tests

- [ ] Update tests
- [ ] Verify Green: `npm test`
- [ ] Lint/Type check

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
