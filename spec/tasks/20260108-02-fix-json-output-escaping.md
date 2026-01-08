# Task: Fix JSON Output Double Escaping

## Purpose

Fix the `--json` output of `search` and `list` commands which currently produces double-escaped JSON strings in the `items` array.

## Problem

**Current behavior:**
```json
{"items":["{\"id\":\"cleland-2025\",\"type\":\"article-journal\",...}"],"total":1,...}
```

**Expected behavior:**
```json
{"items":[{"id":"cleland-2025","type":"article-journal",...}],"total":1,...}
```

## Root Cause

Double JSON encoding occurs:
1. `src/features/operations/search.ts:60-61`: `JSON.stringify(item)` converts each item to string
2. `src/cli/commands/search.ts:136-143`: `JSON.stringify({ items: result.items })` escapes the strings again

## References

- Related: `src/features/operations/search.ts`, `src/features/operations/list.ts`
- Related: `src/cli/commands/search.ts`, `src/cli/commands/list.ts`

## Solution

Modify `formatItems()` to return raw `CslItem[]` for JSON format, and only stringify at the CLI output layer.

### Option A: Return CslItem[] for JSON format

Change `SearchResult` and `ListResult` to support either `string[]` or `CslItem[]`:

```typescript
export interface SearchResult {
  items: string[] | CslItem[];
  // ...
}
```

Or use discriminated union based on format.

### Option B: Add rawItems field

Add a separate field for raw items when JSON format is requested.

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: Fix search JSON output

- [ ] Write test: `src/features/operations/search.test.ts` (or existing test file)
  - Test that JSON format returns properly structured JSON
- [ ] Write E2E test: `src/cli/json-output.e2e.test.ts`
  - Test `ref search --json` produces valid, non-escaped JSON items
- [ ] Implement fix in `src/features/operations/search.ts` and `src/cli/commands/search.ts`
- [ ] Verify: `npm run test`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Fix list JSON output

- [ ] Write test for list JSON output
- [ ] Implement fix in `src/features/operations/list.ts` and `src/cli/commands/list.ts`
- [ ] Verify: `npm run test`

### Step 3: Verify existing tests still pass

- [ ] Review and update any tests that depend on the old behavior
- [ ] Run full test suite

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification:
  - [ ] `ref search --json "query"` outputs properly formatted JSON
  - [ ] `ref list --json` outputs properly formatted JSON
  - [ ] JSON can be parsed by `jq` without issues
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
