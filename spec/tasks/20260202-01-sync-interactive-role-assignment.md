# Task: Sync Interactive Role Assignment

## Purpose

When `ref attach sync` encounters files with non-standard filenames (e.g., journal-downloaded PDFs like `mmc1.pdf`, `PIIS0092867424000011.pdf`), they are classified as `role: "other"` with no way for the user to correct the assignment. This task adds:

1. **Context-based smart inference** — suggest likely roles based on existing attachments and file type
2. **Interactive role assignment** — prompt the user to confirm or change roles for ambiguous files (TTY)
3. **Rename offer** — after role assignment, offer to rename files to match the naming convention

## Background

Current behavior:
- `inferFromFilename` in `sync.ts` splits on first hyphen to extract role
- Non-standard filenames (no hyphen, or first segment not a reserved role) → `role: "other"`
- `attach open` interactive mode calls sync with `yes: true`, silently registering files as `other`
- No way to reclassify or rename after sync

## References

- Spec: `spec/features/attachments.md` (Filename inference, TTY Interactive Mode sections)
- Operation: `src/features/operations/attachments/sync.ts` (`inferFromFilename`, `syncAttachments`)
- CLI: `src/cli/commands/attach.ts` (`runInteractiveSyncMode`, `runInteractiveMode`)
- CLI helpers: `src/cli/helpers.ts` (`readConfirmation`)
- Filename utils: `src/features/attachments/filename.ts` (`parseFilename`, `generateFilename`)
- Types: `src/features/attachments/types.ts` (`RESERVED_ROLES`)

## Affected Files

### Production Code

| File | Changes |
|------|---------|
| `src/features/operations/attachments/sync.ts` | Add `roleOverrides` to options; export `InferredFile`; add `suggestRoleFromContext` |
| `src/features/attachments/filename.ts` | (No change needed — `generateFilename` already exists for rename) |
| `src/cli/commands/attach.ts` | Add role selection prompt in `runInteractiveSyncMode` and `runInteractiveMode`; add rename offer after role assignment |
| `src/cli/helpers.ts` | Add `readChoice` helper (numbered list selection via readline) |

### Test Files

| File | Changes |
|------|---------|
| `src/features/operations/attachments/sync.test.ts` | Tests for `roleOverrides`, `suggestRoleFromContext`, rename during sync |
| `src/cli/commands/attach.test.ts` | Tests for interactive role assignment flow |
| `src/cli/attach.e2e.test.ts` | E2E scenarios with non-standard filenames |

### Spec/Docs

| File | Changes |
|------|---------|
| `spec/features/attachments.md` | Update "Filename inference" table, "TTY Interactive Mode" section, add rename behavior |

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Context-based Role Suggestion

Add a function that suggests roles for unknown files based on context (existing attachments and file extension).

**File**: `src/features/operations/attachments/sync.ts`
**Test**: `src/features/operations/attachments/sync.test.ts`

Logic for `suggestRoleFromContext(filename, existingFiles)`:

| Condition | Suggested Role |
|-----------|---------------|
| File is `.pdf`/`.md` and no `fulltext` exists | `fulltext` |
| File is `.pdf`/`.md` and `fulltext` already exists | `supplement` |
| File is data-like (`.xlsx`, `.csv`, `.tsv`, `.zip`, `.tar.gz`) | `supplement` |
| Otherwise | `other` (no suggestion) |

The function returns a suggested role string or `null` if no suggestion. This is a pure function with no side effects.

- [x] Write test: `src/features/operations/attachments/sync.test.ts`
  - Test each condition row in the table above
  - Test edge cases: multiple existing fulltext files, unknown extensions
- [x] Create stub: `suggestRoleFromContext` with `throw new Error("Not implemented")`
- [x] Verify Red
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 2: Add `roleOverrides` to Sync Operation

Allow callers to override inferred roles before applying sync. This decouples the interactive UI from the core operation.

**File**: `src/features/operations/attachments/sync.ts`
**Test**: `src/features/operations/attachments/sync.test.ts`

Changes:
- Add `roleOverrides?: Record<string, { role: string; label?: string }>` to `SyncAttachmentOptions`
  - Key: filename, Value: overridden role and optional label
- In `buildUpdatedFiles`, when adding new files, check for overrides and apply them
- Ensure overrides only apply when `yes: true` (i.e., when actually applying changes)

- [x] Write test: `src/features/operations/attachments/sync.test.ts`
  - Sync with overrides applied: verify metadata uses overridden role/label
  - Override only specific files (some overridden, others keep inferred role)
  - Overrides ignored in dry-run mode
  - Override with non-existent filename (ignored gracefully)
- [x] Create stub: extend `SyncAttachmentOptions` interface, add override logic placeholder
- [x] Verify Red
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 3: Add `readChoice` CLI Helper

Add a readline-based numbered choice prompt for role selection, consistent with existing `readConfirmation`.

**File**: `src/cli/helpers.ts`
**Test**: Unit test is not strictly required (readline-based I/O), but type-check must pass.

Interface:
```typescript
interface Choice {
  label: string;
  value: string;
}
async function readChoice(prompt: string, choices: Choice[], defaultIndex?: number): Promise<string>
```

Behavior:
- Display numbered choices on stderr
- Accept number input via readline
- Return the selected `value`
- Default to `defaultIndex` on empty input (Enter)
- Non-TTY: return default choice value

- [x] Implement: `readChoice` in `src/cli/helpers.ts`
- [x] Lint/Type check

### Step 4: Interactive Role Assignment in `attach sync` (TTY)

Modify `runInteractiveSyncMode` to prompt users for role assignment when files are classified as `other`.

**File**: `src/cli/commands/attach.ts`
**Test**: `src/cli/commands/attach.test.ts`

Flow:
1. Dry-run sync → get `newFiles`
2. Separate files into: `knownRoleFiles` (inferred correctly) and `unknownRoleFiles` (role = "other")
3. For each unknown file:
   - Call `suggestRoleFromContext` for default suggestion
   - Display `readChoice` prompt with reserved roles + "other" + suggested default
   - Optionally prompt for label (via readline)
4. Collect all overrides into `roleOverrides` record
5. Show combined preview (known + overridden files)
6. Confirm and apply sync with `roleOverrides`

- [ ] Write test: `src/cli/commands/attach.test.ts`
  - Test that unknown files trigger role prompt
  - Test that known files skip prompt
  - Test that overrides are passed to sync
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 5: Interactive Role Assignment in `attach open` Flow

Modify `runInteractiveMode` (called from `attach open`) to use the same interactive role assignment.

**File**: `src/cli/commands/attach.ts`
**Test**: `src/cli/commands/attach.test.ts`

Changes:
- Currently `runInteractiveMode` calls `executeAttachSync` with `{ yes: true }` directly
- Change to: dry-run first → check for `other` roles → prompt if needed → apply with overrides
- Extract shared logic with `runInteractiveSyncMode` into a helper (e.g., `promptForUnknownRoles`)

- [ ] Write test: `src/cli/commands/attach.test.ts`
  - Test that `attach open` interactive mode prompts for unknown roles
  - Test that files matching convention are auto-accepted
- [ ] Implement
- [ ] Verify Green
- [ ] Lint/Type check

### Step 6: Rename Offer

After role/label assignment, offer to rename files on disk to match the naming convention.

**File**: `src/features/operations/attachments/sync.ts`, `src/cli/commands/attach.ts`
**Test**: `src/features/operations/attachments/sync.test.ts`

Operation layer changes:
- Add optional `renames?: Record<string, string>` to `SyncAttachmentOptions`
  - Key: current filename, Value: new filename
- In `syncAttachments`, when applying changes, rename files on disk and update metadata
- Generate expected filename via `generateFilename(role, ext, label)` for comparison

CLI layer changes:
- After role/label assignment, compare current filename with generated convention filename
- If different, ask: `Rename mmc1.pdf → supplement-mmc1.pdf? (y/N)`
- Collect renames and pass to sync

- [ ] Write test: `src/features/operations/attachments/sync.test.ts`
  - File renamed on disk and metadata updated
  - Rename conflict (target already exists) → skip with warning
  - Rename declined → keep original filename in metadata
- [ ] Write test: `src/cli/commands/attach.test.ts`
  - Rename prompt shown when filename doesn't match convention
  - Rename prompt NOT shown when filename already matches
- [ ] Implement operation layer
- [ ] Implement CLI layer
- [ ] Verify Green
- [ ] Lint/Type check

### Step 7: E2E Tests

**File**: `src/cli/attach.e2e.test.ts`

Add non-TTY scenarios (E2E tests run in non-TTY):
- Sync with `roleOverrides` via the operation layer (test directly, not through CLI)
- Verify rename is applied correctly in a full workflow

- [ ] Write E2E tests
- [ ] Verify Green

## Manual Verification

**Script**: `test-fixtures/test-sync-role-assignment.sh`

Non-TTY tests (automated):
- [ ] `ref attach sync <id> --yes` with non-standard files → files registered as `other` (unchanged behavior)
- [ ] Verify renamed files are accessible via `ref attach get`

TTY-required tests (run manually in a terminal):
- [ ] `ref attach sync <id>` with `mmc1.pdf` in directory → prompts for role selection
- [ ] `ref attach open <id>` with non-standard file → prompts for role after Enter
- [ ] Select "supplement" for `mmc1.pdf` → verify metadata shows `role: "supplement"`
- [ ] Accept rename offer → verify file renamed on disk and metadata updated
- [ ] Decline rename offer → verify file keeps original name

## Design Decisions

### Why `roleOverrides` in operation layer instead of modifying inference?

Separation of concerns: the operation layer handles data, the CLI layer handles user interaction. `inferFromFilename` remains a pure, deterministic function. The suggestion function is also pure. Interactive prompting stays in the CLI layer.

### Why readline-based `readChoice` instead of React Ink?

The sync interactive flow already uses simple readline prompts (`readConfirmation`). Adding a React Ink TUI for a simple numbered list would be inconsistent and over-engineered. `readChoice` follows the same pattern.

### Non-TTY behavior

In non-TTY mode, all interactive prompting is skipped. `--yes` applies with inferred roles as before (no regression). `roleOverrides` can be used programmatically by callers (e.g., MCP server, HTTP API) if needed in the future.

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification completed
- [ ] Spec updated (`spec/features/attachments.md`)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
