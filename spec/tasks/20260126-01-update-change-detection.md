# Task: Update Change Detection

## Purpose

Add change detection to update operations so that:
- `ref edit` without changes reports "No changes" instead of "Updated"
- `ref update --set field=same_value` reports "No changes"
- Results accurately distinguish between "changed", "unchanged", "not found", and "ID collision"

## References

- Spec: `spec/core/data-model.md` (UpdateResult)
- Spec: `spec/features/edit.md` (EditCommandResult)
- Related: `src/core/library.ts`, `src/cli/commands/edit.ts`, `src/cli/commands/update.ts`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: UpdateResult Interface Changes

Update `UpdateResult` interface in `src/core/library-interface.ts`:
- Add `errorType?: 'not_found' | 'id_collision'`
- Remove `idCollision?: boolean` (replaced by `errorType`)
- Update JSDoc comments

- [x] Update interface definition
- [x] Update all usages of `idCollision` to `errorType === 'id_collision'`
- [x] Update existing tests
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Change Detection in Library.updateReference

Add change detection logic to `src/core/library.ts`:
- Compare existing item with updates (excluding protected fields)
- Return `updated: false` with `item` when no changes detected
- Only update `timestamp` when actual changes occur

- [x] Write test: `src/core/library.test.ts` - add "should return updated=false when no changes" test
- [x] Implement change detection in `updateReference`
- [x] Verify Green: `npm run test:unit -- library.test.ts`
- [x] Lint/Type check

### Step 3: Update Command Output

Update `ref update` output in `src/cli/commands/update.ts` and `src/features/operations/json-output.ts`:
- Handle "no changes" case in text output
- Handle "no changes" case in JSON output

- [x] Write test: `src/cli/commands/update.test.ts` - add output format tests
- [x] Update `formatUpdateOutput` function
- [x] Update `formatUpdateJsonOutput` function
- [x] Verify Green: `npm run test:unit -- update.test.ts`
- [x] Lint/Type check

### Step 4: EditCommandResult Interface

Create new result types in `src/cli/commands/edit.ts`:
- Define `EditItemState` type
- Define `EditItemResult` interface with `id`, `state`, `item?`, `oldItem?`
- Update `EditCommandResult` to use `results: EditItemResult[]`

- [ ] Define new interfaces
- [ ] Update existing tests for new interface
- [ ] Lint/Type check

### Step 5: Edit Command Change Detection

Update `src/cli/commands/edit.ts`:
- Modify `updateEditedItem` to use `UpdateResult` properly
- Track each item's state (updated/unchanged/not_found/id_collision)
- Populate `item` and `oldItem` fields

- [ ] Write test: `src/cli/commands/edit.test.ts` - add change detection tests
- [ ] Update `executeEditCommand` function
- [ ] Update `updateEditedItem` function
- [ ] Verify Green: `npm run test:unit -- edit.test.ts`
- [ ] Lint/Type check

### Step 6: Edit Command Output

Update `ref edit` output:
- Show "Updated X of Y references"
- List updated items
- List failed items with reasons

- [ ] Update `formatEditOutput` function
- [ ] Write E2E test if applicable
- [ ] Verify Green
- [ ] Lint/Type check

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification:
  - [ ] `ref edit <id>` without changes shows "No changes"
  - [ ] `ref update --set title="same"` shows "No changes" when title is same
  - [ ] `ref edit` with some changes shows correct counts
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
