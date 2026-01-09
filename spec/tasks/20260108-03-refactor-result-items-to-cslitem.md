# Task: Refactor SearchResult/ListResult items to always be CslItem[]

## Purpose

Improve type safety and separation of concerns by making `SearchResult.items` and `ListResult.items` always return `CslItem[]` (raw data), moving string formatting to the CLI layer only.

Currently, `items` has type `string[] | CslItem[]` depending on the format, which reduces type safety and mixes data retrieval with presentation formatting in the operations layer.

## Background

This follows PR #29 which fixed double-escaped JSON output. The current implementation uses a union type as a workaround. This refactoring provides a cleaner long-term solution.

## References

- Related PR: #29 (fix double-escaped JSON)
- Files: `src/features/operations/search.ts`, `src/features/operations/list.ts`
- CLI: `src/cli/commands/search.ts`, `src/cli/commands/list.ts`
- MCP: `src/mcp/tools/search.ts`, `src/mcp/tools/list.ts`
- Existing formatters: `src/features/format/`

## Design

### Current Architecture

```
Operations層 (searchReferences/listReferences)
    ↓ formatItems() でフォーマット
    ↓ items: string[] | CslItem[]
    ├── CLI commands → 出力
    ├── Server routes → JSON response
    └── MCP tools → format: "pretty" → JSON response (string[]をJSON化)
```

### Target Architecture

```
Operations層 (searchReferences/listReferences)
    ↓ items: CslItem[] (常に生データ)
    ├── CLI commands → formatItems() → string出力
    ├── Server routes → JSON response (CslItem[]をそのまま)
    └── MCP tools → JSON response (CslItem[]をそのまま、format引数なし)
```

### Key Changes

1. `SearchResult.items` / `ListResult.items` = `CslItem[]` (always)
2. Remove `format` parameter from operations
3. Move `formatItems()` to `src/features/format/items.ts`
4. CLI applies formatting at output time using `formatItems()`
5. **MCP removes `format` parameter and always returns raw `CslItem[]`** (LLM can process structured data directly)
6. Server returns raw `CslItem[]`

### Design Rationale: MCP returns raw data only

- LLM can process structured data (`CslItem[]`) directly
- LLM can format data itself if user requests specific format (e.g., BibTeX)
- Raw data provides more information than pre-formatted strings
- Simpler MCP interface (no format parameter needed)

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

## Steps

### Step 1: Create formatItems in features/format

- [x] Create `src/features/format/items.ts`
- [x] Write tests: `src/features/format/items.test.ts`
  - Test formatting CslItem[] to bibtex strings
  - Test formatting CslItem[] to pretty strings
  - Test formatting CslItem[] to ids-only strings
  - Test formatting CslItem[] to uuid strings
  - Test returning CslItem[] for json format
- [x] Move formatting logic from operations to this module
- [x] Export from `src/features/format/index.ts`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check: `npm run lint && npm run typecheck`

### Step 2: Update SearchResult interface and searchReferences

- [x] Update `SearchResult.items` type to `CslItem[]`
- [x] Remove `format` parameter from `SearchOperationOptions`
- [x] Remove `formatItems()` call from `searchReferences`
- [x] Update `searchReferences` to always return raw CslItem[]
- [x] Update tests in `src/features/operations/search.test.ts`
- [x] Verify: `npm run test:unit`
- Note: typecheck will fail until CLI/MCP are updated in Steps 4-6

### Step 3: Update ListResult interface and listReferences

- [x] Update `ListResult.items` type to `CslItem[]`
- [x] Remove `format` parameter from `ListOptions`
- [x] Remove `formatItems()` call from `listReferences`
- [x] Update `listReferences` to always return raw CslItem[]
- [x] Update tests in `src/features/operations/list.test.ts`
- [x] Verify: `npm run test:unit`

### Step 4: Update CLI search command

- [x] Import `formatItems` from `@/features/format`
- [x] Update `executeSearch` to apply formatting before output
- [x] Update `formatSearchOutput` to handle CslItem[] input
- [x] Remove `as string[]` cast (no longer needed)
- [x] Update tests
- [x] Verify: `npm run test:unit`

### Step 5: Update CLI list command

- [x] Import `formatItems` from `@/features/format`
- [x] Update `executeList` to apply formatting before output
- [x] Update `formatListOutput` to handle CslItem[] input
- [x] Remove `as string[]` cast
- [x] Update tests
- [x] Verify: `npm run test:unit`

### Step 6: Update MCP tools (remove format parameter)

- [x] Update `src/mcp/tools/search.ts`:
  - Remove `format` from input schema (search doesn't have it currently)
  - Ensure raw CslItem[] is returned
- [x] Update `src/mcp/tools/list.ts`:
  - Remove `format` from input schema
  - Always return raw CslItem[]
- [x] Update MCP tests
- [x] Verify: `npm run test:unit`

### Step 7: Update Server routes (if needed)

- [x] Review `src/server/routes/search.ts` - should return raw data
- [x] Review `src/server/routes/list.ts` - should return raw data
- [x] Update `ServerClient` if interface changed
- [x] Update tests
- [x] Verify: `npm run test:unit`

### Step 8: E2E verification

- [x] Run full E2E tests: `npm run test:e2e`
- [x] Manual verification:
  - [x] `ref search --json "query"` outputs proper JSON (CslItem[])
  - [x] `ref search --bibtex "query"` outputs bibtex
  - [x] `ref search "query"` outputs pretty format (default)
  - [x] `ref list --json` outputs proper JSON (CslItem[])
  - [x] `ref list` outputs pretty format (default)
  - [x] MCP search tool returns CslItem[] in JSON
  - [x] MCP list tool returns CslItem[] in JSON (no format param)

## Completion Checklist

- [x] All tests pass (`npm run test`)
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)
- [x] E2E tests pass (`npm run test:e2e`)
- [x] Manual verification completed
- [x] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
