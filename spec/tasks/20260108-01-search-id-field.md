# Task: Search ID Field Support

## Purpose

Add citation key (`id` field) to the search target fields and support `id:` prefix for explicit ID search. Currently, the search command does not search the `id` field, making it impossible to find references by their citation key.

## References

- Spec: `spec/features/search.md`
- Related: `src/features/search/matcher.ts`, `src/features/search/tokenizer.ts`

## Changes Required

### 1. Add `id` to STANDARD_SEARCH_FIELDS and ID_FIELDS

The `id` field should be searched as an ID field (exact match, case-insensitive).

**Note**: All ID fields (DOI, PMID, PMCID, ISBN, id) use case-insensitive exact matching.

### 2. Add `id:` prefix support

Add `id` to the valid field prefixes in the tokenizer.

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: Add `id:` prefix to tokenizer

- [x] Write test: `src/features/search/tokenizer.test.ts`
  - Test that `id:smith2023` is tokenized with `field: "id"`
- [x] Implement: `src/features/search/tokenizer.ts`
  - Add `"id"` to valid field prefixes
- [x] Verify: `npm run test:unit -- tokenizer`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Add `id` to searchable fields

- [x] Write test: `src/features/search/matcher.test.ts`
  - Test exact `id:` prefix search (e.g., `id:smith2023`)
  - Test case-insensitive `id:` search (e.g., `id:SMITH2023`)
  - Test that partial `id:` does not match
  - Test that `id` is included in multi-field search
  - Test DOI case-insensitive matching
- [x] Implement: `src/features/search/matcher.ts`
  - Add `"id"` to `ID_FIELDS`, `FIELD_MAP`, and `STANDARD_SEARCH_FIELDS`
  - Change all ID fields to case-insensitive exact matching
- [x] Verify: `npm run test:unit -- matcher`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 3: Update spec documentation

- [x] Update `spec/features/search.md`
  - Add `id:` to field prefixes list
  - Add `id` to ID Fields section
  - Update ID Fields to case-insensitive matching

### Step 4: E2E test

- [ ] Add E2E test for CLI search with `id:` prefix
- [ ] Verify: `npm run test:e2e`

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `ref search 'id:some-key'`
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
