# Task: Refactor SearchResult/ListResult items to always be CslItem[]

## Purpose

Improve type safety and separation of concerns by making `SearchResult.items` and `ListResult.items` always return `CslItem[]` (raw data), moving string formatting to the presentation layer (CLI/MCP).

Currently, `items` has type `string[] | CslItem[]` depending on the format, which reduces type safety and mixes data retrieval with presentation formatting in the operations layer.

## Background

This follows PR #29 which fixed double-escaped JSON output. The current implementation uses a union type as a workaround. This refactoring provides a cleaner long-term solution.

## References

- Related PR: #29 (fix double-escaped JSON)
- Files: `src/features/operations/search.ts`, `src/features/operations/list.ts`
- CLI: `src/cli/commands/search.ts`, `src/cli/commands/list.ts`
- MCP: `src/mcp/tools/search.ts`, `src/mcp/tools/list.ts`

## Design

### Current Architecture

```
Operations層 (searchReferences/listReferences)
    ↓ formatItems() でフォーマット
    ↓ items: string[] | CslItem[]
    ├── CLI commands → 出力
    ├── Server routes → JSON response
    └── MCP tools → JSON response
```

### Target Architecture

```
Operations層 (searchReferences/listReferences)
    ↓ items: CslItem[] (常に生データ)
    ├── CLI commands → formatItems() → 出力
    ├── Server routes → JSON response (生データのまま)
    └── MCP tools → formatItems() → JSON response
```

### Key Changes

1. `SearchResult.items` / `ListResult.items` = `CslItem[]` (always)
2. Remove `format` parameter from operations (or make it only affect sorting/filtering, not output format)
3. Move `formatItems()` to shared utility module
4. CLI/MCP apply formatting at output time

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: Create shared formatter utility

- [ ] Create `src/shared/formatters/reference-formatter.ts`
- [ ] Write tests: `src/shared/formatters/reference-formatter.test.ts`
  - Test formatting CslItem[] to bibtex strings
  - Test formatting CslItem[] to pretty strings
  - Test formatting CslItem[] to CSL YAML strings
- [ ] Move formatting logic from operations to shared module
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Update SearchResult interface and searchReferences

- [ ] Update `SearchResult.items` type to `CslItem[]`
- [ ] Remove `format` parameter from `SearchOperationOptions` (or rename to clarify it's not for output)
- [ ] Update `searchReferences` to always return raw CslItem[]
- [ ] Update tests in `src/features/operations/search.test.ts`
- [ ] Verify: `npm run test:unit`

### Step 3: Update ListResult interface and listReferences

- [ ] Update `ListResult.items` type to `CslItem[]`
- [ ] Remove `format` parameter from `ListOptions` (or rename)
- [ ] Update `listReferences` to always return raw CslItem[]
- [ ] Update tests in `src/features/operations/list.test.ts`
- [ ] Verify: `npm run test:unit`

### Step 4: Update CLI search command

- [ ] Update `executeSearch` to apply formatting before output
- [ ] Update `formatSearchOutput` to use shared formatter
- [ ] Remove `as string[]` cast (no longer needed)
- [ ] Update tests
- [ ] Verify: `npm run test:unit`

### Step 5: Update CLI list command

- [ ] Update `executeList` to apply formatting before output
- [ ] Update `formatListOutput` to use shared formatter
- [ ] Remove `as string[]` cast
- [ ] Update tests
- [ ] Verify: `npm run test:unit`

### Step 6: Update MCP tools

- [ ] Update `src/mcp/tools/search.ts` to apply formatting
- [ ] Update `src/mcp/tools/list.ts` to apply formatting
- [ ] Update MCP tests
- [ ] Verify: `npm run test:unit`

### Step 7: Update Server routes (if needed)

- [ ] Review `src/server/routes/search.ts` - should return raw data
- [ ] Review `src/server/routes/list.ts` - should return raw data
- [ ] Update `ServerClient` if interface changed
- [ ] Update tests
- [ ] Verify: `npm run test:unit`

### Step 8: E2E verification

- [ ] Run full E2E tests: `npm run test:e2e`
- [ ] Manual verification:
  - [ ] `ref search --json "query"` outputs proper JSON
  - [ ] `ref search --format bibtex "query"` outputs bibtex
  - [ ] `ref list --json` outputs proper JSON
  - [ ] `ref list --format pretty` outputs pretty format

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Manual verification completed
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
