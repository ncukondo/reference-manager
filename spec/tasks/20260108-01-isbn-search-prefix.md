# Task: ISBN Search Field Prefix

## Purpose

Add `isbn:` field prefix support to the search functionality. This allows users to search references by ISBN, which is already documented in `spec/features/search.md` but not yet implemented.

## References

- Spec: `spec/features/search.md`
- Related: `src/features/search/types.ts`, `src/features/search/matcher.ts`

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: Add `isbn` to FieldSpecifier type

- [x] Update type: `src/features/search/types.ts`
  - Add `"isbn"` to `FieldSpecifier` union type
- [x] Verify: `npm run typecheck`

### Step 2: Add ISBN field matching logic

- [x] Write test: `src/features/search/matcher.test.ts`
  - Test `isbn:` prefix matches ISBN field exactly
  - Test case-insensitive ISBN matching (for X check digit)
- [x] Implement: `src/features/search/matcher.ts`
  - Add ISBN to ID_FIELDS set
  - Add isbn to FIELD_MAP
  - ISBN matching is case-insensitive (for X check digit in ISBN-10)
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Add tokenizer test for isbn prefix

- [x] Write test: `src/features/search/tokenizer.test.ts`
  - Test `isbn:978-4-00-000000-0` tokenization
- [x] Add isbn to VALID_FIELDS in tokenizer.ts
- [x] Verify: `npm run test:unit`

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `ref search "isbn:978-..."` works
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
