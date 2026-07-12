# Task: Rename Duplicate normalizeIsbn Functions

## Purpose

Two `normalizeIsbn` functions exist with different behavior (issue #12): `src/features/import/normalizer.ts:85` parses user input (requires and strips the `ISBN:` prefix), while `src/features/duplicate/detector.ts:104` does simple hyphen/space removal for comparison. Same name, different semantics — rename for clarity.

## References

- Issue: #12
- Related: `src/features/import/normalizer.ts`, `src/features/duplicate/detector.ts`, and all call sites (`importer.ts`, `import/detector.ts`, etc.)

## Approach

Pure rename refactor (no behavior change), per the issue's proposal:

- `normalizer.ts`: `normalizeIsbn` → `parseIsbnInput`
- `duplicate/detector.ts`: `normalizeIsbn` → `normalizeIsbnForComparison` (stays private)

Check current call sites before renaming — the code has grown since the issue was filed (arXiv/ERIC work); update every import and usage.

## Steps

### Step 1: Rename and update call sites

- [ ] Rename both functions and update all imports/usages (grep for `normalizeIsbn`)
- [ ] Update any test names referencing the old names
- [ ] Verify Green: `npm run test:unit` (existing tests keep passing — no behavior change, no new tests needed)
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] No remaining references to the old names (`grep -rn normalizeIsbn src/` only matches the comparison helper if kept internal)
- [ ] Close linked issue (include `Closes #12` in PR description)
- [ ] Move this file to `spec/tasks/completed/`
