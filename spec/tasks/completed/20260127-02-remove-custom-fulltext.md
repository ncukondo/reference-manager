# Task: Remove `custom.fulltext` Completely

## Purpose

Remove all legacy `custom.fulltext` references from codebase and specs. Pre-release phase, no backward compatibility needed.

## Prerequisites

- `20260127-01-pr45-followup-refactor.md` should be completed first (Step 2 establishes shared `MANAGED_CUSTOM_FIELDS` without `fulltext`)

## References

- Prior task: `spec/tasks/20260127-01-pr45-followup-refactor.md`
- Related: `src/features/edit/json-serializer.ts`, `src/features/edit/yaml-serializer.ts`
- Related: `src/features/operations/remove.ts`, `src/core/csl-json/types.ts`
- Related: `src/features/fulltext/manager.ts`, `src/features/fulltext/index.ts`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Remove `custom.fulltext` from production code

**Files to modify:**

1. `src/features/edit/json-serializer.ts`:
   - Remove `fulltext` from `ProtectedFields` interface
   - Remove `if (custom.fulltext)` block from `extractProtectedFields`

2. `src/features/edit/yaml-serializer.ts`:
   - Remove `if (custom.fulltext)` block from `createProtectedComment`

3. `src/features/operations/remove.ts`:
   - `getFulltextAttachmentTypes` (line 38-62): remove legacy block (lines 42-48: `const fulltext = item.custom?.fulltext; if (fulltext?.pdf)...`), keep attachments block
   - `deleteFulltextFiles` (line 68-107): remove legacy block (lines 72-78), keep attachments block

4. `src/core/csl-json/types.ts`:
   - Remove `CslFulltextSchema` definition (lines 23-26)
   - Remove `fulltext: CslFulltextSchema.optional()` from `CslCustomSchema` (line 38)

5. `src/features/fulltext/manager.ts`:
   - Delete entire file (dead code — not instantiated in production)

6. `src/features/fulltext/index.ts`:
   - Remove `FulltextManager`, `FulltextIOError`, `FulltextNotAttachedError`,
     `AttachOptions`, `AttachResult`, `DetachOptions`, `DetachResult` exports

- [x] Update `json-serializer.ts`
- [x] Update `yaml-serializer.ts`
- [x] Update `remove.ts` (remove legacy blocks, keep attachments blocks)
- [x] Update `types.ts`
- [x] Delete `manager.ts` (dead code)
- [x] Update `fulltext/index.ts` exports
- [x] Verify Green
- [x] Lint/Type check

### Step 2: Remove `custom.fulltext` from tests

**Files to modify:**

1. `src/core/csl-json/validator.test.ts`:
   - Remove "fulltext field in custom" describe block (lines 231-321)

2. `src/features/edit/json-serializer.test.ts`:
   - Remove test asserting `_protected.fulltext`

3. `src/features/edit/yaml-serializer.test.ts`:
   - Remove test "shows fulltext in comment block when present" (lines 59-74)

4. `src/features/operations/change-details.test.ts`:
   - Remove fulltext ignore test (existing test for `"should ignore fulltext custom field"`)

5. `src/features/fulltext/manager.test.ts`:
   - Delete entire file

- [x] Update `validator.test.ts`
- [x] Update `json-serializer.test.ts`
- [x] Update `yaml-serializer.test.ts`
- [x] Update `change-details.test.ts`
- [x] Delete `manager.test.ts`
- [x] Verify Green
- [x] Lint/Type check

### Step 3: Remove `custom.fulltext` from specs

**Files to modify:**

1. `spec/features/edit.md`:
   - Remove `custom.fulltext` row from protected fields table (line 163)

2. `spec/architecture/cli.md`:
   - Remove `custom.fulltext` from protected fields list (line 216)

- [x] Update `spec/features/edit.md`
- [x] Update `spec/architecture/cli.md`

## Completion Checklist

- [x] All tests pass (`npm run test`)
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)
- [x] CHANGELOG.md updated
- [x] Move this file to `spec/tasks/completed/`
