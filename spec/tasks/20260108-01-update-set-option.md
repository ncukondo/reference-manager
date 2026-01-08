# Task: Update Command --set Option

## Purpose

Implement the `--set` option for the `ref update` command, allowing users to update reference fields directly from the command line without creating a JSON file.

This addresses the gap between README documentation and actual implementation.

## References

- Spec: `spec/architecture/cli.md` (Update Command section)
- Related: `src/cli/commands/update.ts`, `src/cli/index.ts`

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: SetOperation Interface and parseSetOption Function ✅

- [x] Write test: `src/cli/commands/update.test.ts`
  - Test parsing `field=value` syntax
  - Test parsing `field+=value` (add to array)
  - Test parsing `field-=value` (remove from array)
  - Test parsing `field=` (clear field)
  - Test error cases (invalid syntax)
- [x] Implement: `src/cli/commands/update.ts`
  - Add `SetOperation` interface
  - Add `parseSetOption()` function
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: applySetOperations Function

- [ ] Write test: `src/cli/commands/update.test.ts`
  - Test simple field updates (title, abstract, DOI, etc.)
  - Test array field replace (custom.tags=a,b,c)
  - Test array field add (custom.tags+=x)
  - Test array field remove (custom.tags-=x)
  - Test author parsing (author=Family, Given)
  - Test multiple authors (author=Smith, John; Doe, Jane)
  - Test date raw format (issued.raw=2024-03-15)
  - Test ID change (id=new-key)
  - Test field clear (abstract=)
- [ ] Implement: `src/cli/commands/update.ts`
  - Add `applySetOperations()` function
  - Add `parseAuthorValue()` helper
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: CLI Integration

- [ ] Update: `src/cli/index.ts`
  - Add `.option("--set <field=value>", "...", collect)` to update command
  - Modify `handleUpdateAction()` to process --set options
  - Add validation: --set and [file] are mutually exclusive
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 4: E2E Tests

- [ ] Write test: `src/cli/update.e2e.test.ts` (or add to existing)
  - Test basic field update via --set
  - Test multiple --set options
  - Test array operations
  - Test author setting
  - Test ID change
  - Test error: --set with file argument
- [ ] Verify: `npm run test:e2e`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
