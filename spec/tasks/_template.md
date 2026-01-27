# Task: [Feature Name]

## Purpose

[Brief description of what this task accomplishes and why it's needed]

## References

- Spec: `spec/features/xxx.md`
- Related: `src/xxx/`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: [Description]

- [ ] Write test: `src/xxx/xxx.test.ts`
- [ ] Create stub: `src/xxx/xxx.ts` (export interfaces and functions with `throw new Error("Not implemented")`)
- [ ] Verify Red: `npm run test:unit -- xxx.test.ts` (tests fail with "Not implemented")
- [ ] Implement: Write actual logic
- [ ] Verify Green: `npm run test:unit -- xxx.test.ts` (all tests pass)
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: [Description]

- [ ] Write test
- [ ] Create stub
- [ ] Verify Red
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

## Manual Verification

<!-- Delete this section if not applicable. See spec/guidelines/testing.md for details. -->

**Script**: `test-fixtures/test-<feature>.sh`

Create a verification script following the pattern in `spec/guidelines/testing.md`.

Non-TTY tests (automated):
- [ ] [describe test and expected output]
- [ ] [describe test and expected output]

TTY-required tests (run manually in a terminal):
- [ ] [describe test and expected output]

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-<feature>.sh` (if applicable)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
