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

### Option A: Return CslItem[] for JSON format ✓ (Implemented)

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

- [x] Write test: `src/features/operations/search.test.ts` (or existing test file)
  - Test that JSON format returns properly structured JSON
- [x] Write E2E test: `src/cli/json-output.e2e.test.ts`
  - Test `ref search --json` produces valid, non-escaped JSON items
- [x] Implement fix in `src/features/operations/search.ts` and `src/cli/commands/search.ts`
- [x] Verify: `npm run test`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Fix list JSON output

- [x] Write test for list JSON output
- [x] Implement fix in `src/features/operations/list.ts` and `src/cli/commands/list.ts`
- [x] Verify: `npm run test`

### Step 3: Verify existing tests still pass

- [x] Review and update any tests that depend on the old behavior
  - Updated: `src/features/operations/search.test.ts`
  - Updated: `src/features/operations/list.test.ts`
  - Updated: `src/mcp/tools/list.test.ts`
- [x] Run full test suite

## Completion Checklist

- [x] All tests pass (`npm run test`)
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)
- [x] Manual verification:
  - [x] `ref search --json "query"` outputs properly formatted JSON
  - [x] `ref list --json` outputs properly formatted JSON
  - [x] JSON can be parsed by `jq` without issues
- [x] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
