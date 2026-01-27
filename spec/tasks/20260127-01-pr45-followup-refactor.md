# Task: PR #45 Follow-up Refactor

## Purpose

Code quality fixes identified during PR #45 review:
- Extract duplicated `isEqual` to shared utility
- Unify `PROTECTED_CUSTOM_FIELDS` with two-level architecture
- Include `oldItem` in `id_collision` edit result
- Fallback to ID-based update when UUID missing in edit flow

## References

- PR: #45 (feat: add update change detection)
- Related: `src/utils/object.ts`, `src/core/library.ts`, `src/core/library-interface.ts`
- Related: `src/features/operations/change-details.ts`, `src/cli/commands/edit.ts`
- Related: `src/features/edit/json-serializer.ts`, `src/features/edit/yaml-serializer.ts`
- Follow-up: `spec/tasks/20260127-02-remove-custom-fulltext.md`

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Extract `isEqual` to shared utility

Extract identical `isEqual` implementations from `library.ts` and `change-details.ts` into `src/utils/object.ts`.

**Files:**
- `src/utils/object.ts` — add `isEqual(a: unknown, b: unknown): boolean`
- `src/utils/index.ts` — re-export `isEqual`
- `src/utils/object.test.ts` — new test file
- `src/core/library.ts` — import from utils, replace `this.isEqual(...)` with `isEqual(...)`, delete private method (lines 425-443)
- `src/features/operations/change-details.ts` — import from utils, delete local function (lines 12-30)

**Test cases for `object.test.ts`:**
- Identical primitives, different types, null/undefined handling
- Flat and nested arrays, flat and nested objects, mixed structures

- [ ] Add `isEqual` to `src/utils/object.ts`
- [ ] Re-export from `src/utils/index.ts`
- [ ] Create `src/utils/object.test.ts`
- [ ] Update `src/core/library.ts`: import `isEqual`, remove private method
- [ ] Update `src/features/operations/change-details.ts`: import `isEqual`, remove local function
- [ ] Verify Green
- [ ] Lint/Type check

### Step 2: Share protected fields with two-level architecture

Define shared constants in `library-interface.ts` and update all consumers.

**Design: Two levels**

| Constant | Fields | Purpose |
|----------|--------|---------|
| `PROTECTED_CUSTOM_FIELDS` | `uuid`, `created_at`, `timestamp` | Library change detection exclusion |
| `MANAGED_CUSTOM_FIELDS` | above + `attachments` | User display/edit exclusion |

Key decisions:
- `fulltext` NOT in either set (being fully removed in separate task `20260127-02-remove-custom-fulltext.md`)
- `tags` NOT in either set (user-editable)
- `attachments` NOT in `PROTECTED` (library must detect attachment changes for writes via `library.update()`)

**Files:**
- `src/core/library-interface.ts` — add exported constants after `UpdateResult`
- `src/core/library.ts` — import `PROTECTED_CUSTOM_FIELDS`, remove `private static readonly PROTECTED_CUSTOM_FIELDS`
- `src/features/operations/change-details.ts` — import `MANAGED_CUSTOM_FIELDS`, replace local constant
- `src/cli/commands/edit.ts` — import `MANAGED_CUSTOM_FIELDS`, replace local `PROTECTED_FIELDS` (line 71)
- `src/cli/commands/update.ts` — derive `PROTECTED_FIELDS` from `MANAGED_CUSTOM_FIELDS`:
  ```typescript
  const PROTECTED_FIELDS = new Set([...MANAGED_CUSTOM_FIELDS].map((f) => `custom.${f}`));
  ```
- `src/features/edit/json-serializer.ts` — import `MANAGED_CUSTOM_FIELDS`, use `.has()` in `filterCustomFields`
- `src/features/edit/yaml-serializer.ts` — import `MANAGED_CUSTOM_FIELDS`, use `.has()` in `filterCustomFields`

- [ ] Add constants to `library-interface.ts`
- [ ] Update `library.ts`
- [ ] Update `change-details.ts`
- [ ] Update `edit.ts`
- [ ] Update `update.ts`
- [ ] Update `json-serializer.ts`
- [ ] Update `yaml-serializer.ts`
- [ ] Add `attachments` ignore test in `change-details.test.ts`
- [ ] Verify Green
- [ ] Lint/Type check

### Step 3: Include `oldItem` in `id_collision` result

In `toEditItemResult` (edit.ts lines 149-153), the error case does not include `oldItem` even though it's available as a parameter. The spec says `id_collision` should have `oldItem`.

**File:** `src/cli/commands/edit.ts`

Change error case to include `oldItem`:
```typescript
if (!result.updated) {
  return {
    id: editedId,
    state: result.errorType === "id_collision" ? "id_collision" : "not_found",
    oldItem,  // add this
  };
}
```

- [ ] Update `toEditItemResult` in `edit.ts`
- [ ] Add test in `edit.test.ts` verifying `id_collision` result includes `oldItem`
- [ ] Verify Green
- [ ] Lint/Type check

### Step 4: Fallback to ID-based update when UUID missing

In `updateEditedItem` (edit.ts lines 188-190), when item exists but has no UUID, it returns `not_found` which is misleading. Fall back to ID-based update instead. `Reference` constructor auto-generates UUID via `ensureCustomMetadata()`.

**File:** `src/cli/commands/edit.ts`

Replace early `not_found` return (lines 188-196):
```typescript
const matchedUuid = getUuidFromItem(matchedOriginal);
const updates = mergeWithProtectedFields(matchedOriginal, editedItem);

if (matchedUuid) {
  const result = await context.library.update(matchedUuid, updates, { idType: "uuid" });
  return toEditItemResult(editedId, result, matchedOriginal);
}

// Fallback: update by ID (UUID auto-generated by Reference constructor)
const result = await context.library.update(editedId, updates, { idType: "id" });
return toEditItemResult(editedId, result, matchedOriginal);
```

- [ ] Update `updateEditedItem` in `edit.ts`
- [ ] Add test in `edit.test.ts` with UUID-less item, verify `idType: "id"` fallback
- [ ] Verify Green
- [ ] Lint/Type check

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
