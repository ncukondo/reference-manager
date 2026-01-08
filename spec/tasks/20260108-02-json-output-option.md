# Task: JSON Output Option for add/remove/update Commands

## Purpose

Add `--output json` option to `add`, `remove`, and `update` commands for external tool integration.
This enables machine-readable output with detailed information about operation results.

## References

- Spec: `spec/features/json-output.md`
- Related: `spec/features/add.md`, `spec/architecture/cli.md`
- Existing: `src/features/duplicate/types.ts` (DuplicateType already exists)

## Architecture Decisions

### Layer Placement (MCP-compatible)

JSON output formatting is placed in **features layer** (`src/features/operations/`) to enable reuse by:
- CLI (`src/cli/`)
- HTTP Server (`src/server/`)
- MCP Server (`src/mcp/`)

```
src/features/operations/
├── json-output.ts       # NEW: JSON output types and formatters
├── add.ts               # Extend types: SkippedItem, FailedItem, AddedItem
├── remove.ts            # Extend RemoveResult
└── update.ts            # Extend UpdateOperationResult
```

### Naming Convention

Use existing code's naming convention:
- `DuplicateType`: `"doi" | "pmid" | "isbn" | "isbn-title" | "title-author-year"` (hyphen-case)
- Update spec to match implementation (hyphen-case instead of snake_case)

## TDD Workflow

For each step:
1. Write failing test
2. Write minimal implementation to pass
3. Clean up, pass lint/typecheck, verify tests still pass

---

## Phase 1: Type Extensions (No Dependencies)

### Step 1.1: Add FailureReason to fetcher/importer layers

`FailureReason` defined in `fetcher.ts` (lowest layer), re-exported through `importer.ts` and `add.ts`.

- [x] Define `FailureReason` type in `fetcher.ts`
- [x] Extend `FetchResult` and `PmidFetchResult` with `reason` field
- [x] Update `fetchDoi`, `fetchIsbn`, `fetchPmids`, `buildPmidResult` to set appropriate reason
- [x] Extend `ImportItemResult` in `importer.ts` with `reason` field
- [x] Update all error returns in `importer.ts` with appropriate reason
- [x] Re-export `FailureReason` from `importer.ts` and `add.ts`
- [x] Lint/Type check/Tests pass

### Step 1.2: Extend FailedItem with reason

Location: `src/features/operations/add.ts`

- [x] Implement: Add `reason: FailureReason` to FailedItem interface
- [x] Update processImportResult to use reason from ImportItemResult
- [x] Update tests to verify reason is included
- [x] Verify: `npm run test:unit` / Lint/Type check pass

### Step 1.3: Extend SkippedItem with duplicateType

Location: `src/features/operations/add.ts`

- [x] Implement: Add `duplicateType: DuplicateType` to SkippedItem interface
- [x] Update processImportResult to include duplicate type from detection result
- [x] Update tests to verify duplicateType is included
- [x] Verify: `npm run test:unit` / Lint/Type check pass

### Step 1.4: Add isbn-title to DuplicateType

Location: `src/features/duplicate/types.ts`

- [x] Add `"isbn-title"` to DuplicateType union
- [x] Update detector.ts to return `"isbn-title"` for chapter type ISBN+title matches
- [x] Update test to expect `"isbn-title"` type
- [x] Verify: `npm run test:unit` / Lint/Type check pass

### Step 1.5: Extend AddedItem with uuid

Location: `src/features/operations/add.ts`

- [x] Write test: Verify AddedItem has `uuid` property
- [x] Implement: Add `uuid: string` to AddedItem interface
- [x] Update processImportResult to include UUID from added item
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check

---

## Phase 2: JSON Output Formatters (Depends on Phase 1)

### Step 2.1: Create JSON output types

Location: `src/features/operations/json-output.ts` (NEW)

- [x] Write test: `src/features/operations/json-output.test.ts`
  - Test AddJsonOutput type structure
  - Test RemoveJsonOutput type structure
  - Test UpdateJsonOutput type structure
- [x] Implement: Create types as defined in spec
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check

### Step 2.2: Implement formatAddJsonOutput

Location: `src/features/operations/json-output.ts`

- [x] Write test:
  - Basic output without --full
  - Output with --full (includes item)
  - Summary counts
  - Empty results
- [x] Implement: `formatAddJsonOutput(result: AddReferencesResult, full: boolean): AddJsonOutput`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check

### Step 2.3: Implement formatRemoveJsonOutput

Location: `src/features/operations/json-output.ts`

- [x] Write test:
  - Success case
  - Failure case (not found)
  - With --full
- [x] Implement: `formatRemoveJsonOutput(result: RemoveResult, id: string, full: boolean): RemoveJsonOutput`
- [x] Verify: `npm run test:unit`
- [x] Lint/Type check

### Step 2.4: Implement formatUpdateJsonOutput

Location: `src/features/operations/json-output.ts`

- [ ] Write test:
  - Success case
  - ID change case
  - Failure case
  - With --full (before/after)
- [ ] Implement: `formatUpdateJsonOutput(result: UpdateOperationResult, id: string, full: boolean, before?: CslItem): UpdateJsonOutput`
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check

---

## Phase 3: CLI - add Command (Depends on Phase 2)

### Step 3.1: Add --output and --full options

Location: `src/cli/index.ts`, `src/cli/commands/add.ts`

- [ ] Write test: `src/cli/commands/add.test.ts`
  - Test option parsing
  - Test --output json produces valid JSON to stdout
  - Test --output text (default) produces text to stderr
  - Test --full includes item data
- [ ] Implement:
  - Add `.option("--output <format>", "Output format: json|text", "text")`
  - Add `.option("-o <format>", "Short for --output")`
  - Add `.option("--full", "Include full CSL-JSON data in JSON output")`
- [ ] Update handleAddAction to switch output based on format
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check

---

## Phase 4: CLI - remove Command (Depends on Phase 2)

### Step 4.1: Extend RemoveResult for JSON output

Location: `src/features/operations/remove.ts`

- [ ] Write test: `src/features/operations/remove.test.ts`
  - Verify RemoveResult includes necessary fields
- [ ] Implement: Ensure `removedItem` includes uuid and title
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check

### Step 4.2: Add --output and --full options to remove

Location: `src/cli/index.ts`

- [ ] Write test: `src/cli/commands/remove.test.ts` (create if needed)
  - Test --output json
  - Test --full
  - Test error case JSON output
- [ ] Implement: Add options and output logic
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check

---

## Phase 5: CLI - update Command (Depends on Phase 2)

### Step 5.1: Extend UpdateOperationResult for JSON output

Location: `src/features/operations/update.ts`

- [ ] Write test: `src/features/operations/update.test.ts`
  - Verify result includes necessary fields for JSON output
- [ ] Implement: Ensure result includes uuid, title, before state if needed
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check

### Step 5.2: Add --output and --full options to update

Location: `src/cli/index.ts`

- [ ] Write test: `src/cli/commands/update.test.ts` (create if needed)
  - Test --output json
  - Test --full (before/after)
  - Test ID change case
  - Test error case
- [ ] Implement: Add options and output logic
- [ ] Verify: `npm run test:unit`
- [ ] Lint/Type check

---

## Phase 6: E2E Tests (Depends on Phases 3-5)

### Step 6.1: add command E2E tests

Location: `src/cli/json-output.e2e.test.ts` (NEW)

- [ ] Write tests:
  - `ref add <pmid> -o json` produces valid JSON
  - `ref add <doi> -o json --full` includes item data
  - Duplicate skip includes duplicateType
  - Failed import includes reason
  - Multiple inputs with mixed results
  - Exit code verification
- [ ] Verify: `npm run test:e2e`

### Step 6.2: remove command E2E tests

Location: `src/cli/json-output.e2e.test.ts`

- [ ] Write tests:
  - `ref remove <id> -o json` produces valid JSON
  - `ref remove <id> -o json --full` includes removed item
  - Not found case
  - Exit code verification
- [ ] Verify: `npm run test:e2e`

### Step 6.3: update command E2E tests

Location: `src/cli/json-output.e2e.test.ts`

- [ ] Write tests:
  - `ref update <id> --set "title=X" -o json` produces valid JSON
  - `ref update <id> --set "title=X" -o json --full` includes before/after
  - ID change case
  - Not found case
  - Exit code verification
- [ ] Verify: `npm run test:e2e`

---

## Phase 7: Documentation and Cleanup

### Step 7.1: Update spec with implementation details

- [ ] Update `spec/features/json-output.md` if naming changed (e.g., hyphen-case)
- [ ] Verify spec matches implementation

### Step 7.2: Export types from index

Location: `src/features/operations/index.ts`

- [ ] Export JSON output types and formatters
- [ ] Verify: `npm run build`

---

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Manual verification:
  - [ ] `ref add 12345678 -o json` works
  - [ ] `ref add 12345678 -o json --full` works
  - [ ] `ref remove <id> -o json` works
  - [ ] `ref update <id> --set "title=X" -o json` works
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
