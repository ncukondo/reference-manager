# Task: Edit Validation Pipeline

## Purpose

Implement the two-stage validation pipeline, error annotation, and retry loop for the edit command as specified in `spec/features/edit.md` (Validation Pipeline, Validation Error Handling).

## References

- Spec: `spec/features/edit.md` (Validation Pipeline, Validation Error Handling sections)
- Prerequisite: `spec/tasks/20260127-01-pr45-followup-refactor.md` (Step 2 establishes shared `MANAGED_CUSTOM_FIELDS`)
- Related: `src/features/edit/`, `src/cli/commands/edit.ts`
- Related: `spec/guidelines/validation.md` (Zod validation patterns)

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Edit-format date validator

Create a new module for pre-transform validation of edit-format fields.

**New file:** `src/features/edit/edit-validator.ts`

- Function: `validateEditFormat(items: Record<string, unknown>[]): EditValidationResult`
- Validates date fields (`issued`, `accessed`) against `ISO_DATE_REGEX` (`/^\d{4}(-\d{2})?(-\d{2})?$/`)
- Returns per-item errors with field paths and human-readable messages
- Error message format: `"Invalid date format (use YYYY, YYYY-MM, or YYYY-MM-DD)"`
- Items without errors have no entry in the error result

**Type:**
```typescript
interface EditValidationError {
  field: string;
  message: string;
}

interface EditValidationResult {
  valid: boolean;
  errors: Map<number, EditValidationError[]>; // index → errors
}
```

**Test cases (`src/features/edit/edit-validator.test.ts`):**
- Valid dates: `"2024"`, `"2024-03"`, `"2024-03-15"` → no error
- Invalid dates: `"hello"`, `"2024/03/15"`, `"03-2024"` → error
- Missing date fields (undefined) → no error (optional fields)
- Partial: only `issued` invalid, `accessed` valid → error on `issued` only
- Multiple items: mixed valid and invalid → correct per-item errors

- [x] Create `src/features/edit/edit-validator.ts`
- [x] Create `src/features/edit/edit-validator.test.ts`
- [x] Verify Green
- [x] Lint/Type check

### Step 2: CSL schema validation integration

Add post-transform validation against the CSL schema.

**File:** `src/features/edit/edit-validator.ts`

- Function: `validateCslItems(items: Record<string, unknown>[]): EditValidationResult`
- Transforms date fields first, then validates each item against `CslItemSchema` (Zod)
- Translates Zod error paths and messages to human-readable format (e.g., `author: Expected array, received string`)
- Combined function: `validateEditedItems(items: Record<string, unknown>[]): EditValidationResult`
  - Runs Stage 1 (edit-format); if any errors, returns immediately
  - If Stage 1 passes, runs Stage 2 (CSL schema)

**Test cases (`src/features/edit/edit-validator.test.ts`):**
- Type error (e.g., `author` as string instead of array) → schema error
- Missing required field (e.g., `type`) → schema error with "Required"
- Mixed valid/invalid items → correct per-item errors
- Stage 1 failure short-circuits Stage 2 → only edit-format errors returned
- All valid → `{ valid: true, errors: empty }`

- [x] Add `validateCslItems` to `edit-validator.ts`
- [x] Add `validateEditedItems` to `edit-validator.ts`
- [x] Add tests
- [x] Verify Green
- [x] Lint/Type check

### Step 3: Error annotation — YAML

Add error annotation support to YAML serialization for the re-edit loop.

**File:** `src/features/edit/yaml-serializer.ts`

- Add function to serialize items with error annotations
- Inserts file-top summary comments (`# ⚠ Validation Errors (N of M entries)`)
- Inserts per-entry `# ⚠ Errors:` comment block before errored entries
- Entries without errors: only protected field comments (no error block)
- Error comments are stripped on re-parse (existing `#` comment stripping handles this)

**Test cases:**
- Single errored entry → file-top summary + per-entry error block
- Multiple errored entries → correct summary count, each with own error block
- No-error entries → unchanged (protected field comments only)
- Mixed: some with errors, some without → correct interleaving
- Re-parse of annotated file → error comments stripped cleanly

- [x] Add error annotation function to `yaml-serializer.ts`
- [x] Add tests
- [x] Verify Green
- [x] Lint/Type check

### Step 4: Error annotation — JSON

Add error annotation support to JSON serialization for the re-edit loop.

**File:** `src/features/edit/json-serializer.ts`

- Add function to insert `_errors` key (array of error message strings) into items with errors
- Update `deserializeFromJson` to strip `_errors` key alongside `_protected`
- Items without errors: no `_errors` key

**Test cases:**
- Single errored item → `_errors` array with correct messages
- Multiple errored items → each has own `_errors`
- No-error items → no `_errors` key present
- Deserialization strips `_errors` → parsed items have no `_errors`

- [x] Add error annotation function to `json-serializer.ts`
- [x] Update `deserializeFromJson` to strip `_errors`
- [x] Add tests
- [x] Verify Green
- [x] Lint/Type check

### Step 5: Retry loop in executeEdit

Restructure `executeEdit` to support validation failure → error display → prompt → re-edit loop.

**File:** `src/cli/commands/edit.ts`

- After parsing edited content, run `validateEditedItems()`
- On validation failure:
  1. Display terminal error summary (entry count, field names per entry)
  2. Show interactive prompt (re-edit / restore original / abort)
  3. Based on choice:
     - **Re-edit**: Re-serialize current items with error annotations, write to temp file, re-open editor
     - **Restore original**: Re-serialize original items (no errors), write to temp file, re-open editor
     - **Abort**: Set `aborted: true` in result, exit loop
- On validation success: proceed to update
- Maintain temp file across loop iterations; delete on exit
- Update `EditCommandResult` if needed (ensure `aborted` flag covers this path)

**Test cases (mock editor + validator):**
- Validation passes on first try → no prompt, straight to update
- Validation fails → re-edit → passes on second try → update
- Validation fails → restore original → passes → update
- Validation fails → abort → no update, result has `aborted: true`
- Multiple validation failures → loop continues until resolve or abort

- [ ] Add validation call after parse in `executeEdit`
- [ ] Add terminal error display
- [ ] Add interactive prompt (re-edit / restore / abort)
- [ ] Handle re-edit with error annotations (YAML and JSON)
- [ ] Handle restore original
- [ ] Handle abort
- [ ] Add tests
- [ ] Verify Green
- [ ] Lint/Type check

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
