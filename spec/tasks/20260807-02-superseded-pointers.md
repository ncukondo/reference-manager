# Task: Superseded Pointers — `custom.superseded_by` and `ref deprecate` (#108, PR-1)

## Purpose

Give the library a way to say "do not cite this one, cite that one" (issue #108). This is PR-1 of
three; it delivers the data model, the `ref deprecate` command, and reference-time warnings. That is
enough to handle the conference-version → journal-version case by hand, which no automatic detector
can reach.

Follow-up PRs (not in scope here):

- PR-2: `ref duplicates [--by ...] [--fix]` — retroactive scan, applies marks in bulk
- PR-3: `check --fix` action that adds the published version as a new record and marks the old one

## References

- Issue: #108
- Spec: `spec/features/superseded.md`
- Related: `src/core/csl-json/types.ts` (`CslCustomSchema`),
  `src/core/library-interface.ts` (`MANAGED_CUSTOM_FIELDS`),
  `src/cli/commands/update.ts` (`PROTECTED_FIELDS`),
  `src/features/operations/list.ts`, `src/cli/commands/{show,cite,export,list,search}.ts`

## Decisions

Settled before implementation:

1. **`superseded_by` stores the successor's uuid**, not its citation key. Keys are renamed by
   collision resolution (`src/core/library.ts`, `resolveNewId`), so a key-valued pointer dangles
   silently. Display resolves uuid → key.
2. **`export` includes superseded records and warns; `list` hides them** behind
   `--include-superseded`. Excluding from `export` would break manuscripts that still cite the old
   key — the failure would surface as an unresolved citeproc key rather than a warning.
3. The three fields join `MANAGED_CUSTOM_FIELDS` (not `PROTECTED_CUSTOM_FIELDS`), making
   `ref deprecate` the only writer while keeping the mark visible to change detection.

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Schema and field protection

- [ ] Write test: `src/core/csl-json/types.test.ts` — `superseded_by` / `superseded_reason` /
      `superseded_at` parse, reason is a union, partial marks still parse (other software writes
      `custom` freely)
- [ ] Add the three fields to `CslCustomSchema` (`src/core/csl-json/types.ts`)
- [ ] Add them to `MANAGED_CUSTOM_FIELDS` (`src/core/library-interface.ts`)
- [ ] Write test: `src/cli/commands/update.test.ts` — `update --set custom.superseded_by=x` is
      rejected as a protected field
- [ ] Write test: `src/cli/commands/edit.test.ts` — an edit that drops or rewrites the fields keeps
      the original values
- [ ] Verify Green + `npm run lint && npm run typecheck`

### Step 2: Resolution module (`src/features/superseded/`)

- [ ] Write test: `src/features/superseded/resolver.test.ts`
  - `getSupersededMark(item)` → mark or null; partial marks treated as absent
  - `resolveSuccessor(item, allItems)` → `{ target, dangling }`
  - `resolveFinalSuccessor(item, allItems)` → end of chain, terminates on a cycle rather than
    looping forever (defensive: `deprecate` prevents cycles, hand-edited files may not)
  - `isSuperseded(item)`
- [ ] Create stub, verify Red, implement, verify Green
- [ ] Write test: `src/features/superseded/warning.test.ts` — `formatSupersededWarning` for the
      resolved, dangling, and chained cases
- [ ] Implement, verify Green
- [ ] Lint/Type check

### Step 3: `ref deprecate` command

- [ ] Write test: `src/features/operations/deprecate.test.ts` — operation layer: set, unset,
      overwrite existing mark, self-reference rejected, cycle rejected, unknown old id, unknown
      target, unset on unmarked record is a no-op
- [ ] Create stub `src/features/operations/deprecate.ts`, verify Red, implement, verify Green
- [ ] Write test: `src/cli/commands/deprecate.test.ts` — option parsing (`--to` / `--unset` mutual
      exclusion, `--reason` default `other`, `--uuid`), exit codes, text and `-o json` output
- [ ] Implement `src/cli/commands/deprecate.ts`, register in `src/cli/index.ts`
- [ ] Verify Green + lint/typecheck

### Step 4: Reference-time warnings

- [ ] Write test: `src/cli/commands/show.test.ts` — stderr warning; pretty output has a
      `Superseded by` line; stdout unchanged in json mode
- [ ] Write test: `src/cli/commands/cite.test.ts` — one warning per cited superseded record
- [ ] Write test: `src/cli/commands/search.test.ts` — warns, does not filter
- [ ] Write test: `src/cli/commands/export.test.ts` — includes the record, warns per record, prints
      the summary line, stdout byte-identical to the unmarked case
- [ ] Implement the warning emission in each command
- [ ] Verify Green + lint/typecheck

### Step 5: `list` filtering

- [ ] Write test: `src/features/operations/list.test.ts` — superseded excluded by default,
      `includeSuperseded` restores them, `total` reflects the filter
- [ ] Implement `includeSuperseded` in `listReferences`
- [ ] Write test: `src/cli/commands/list.test.ts` — `--include-superseded` flag, warning emitted
      only when they are shown
- [ ] Implement flag in `src/cli/index.ts` / `src/cli/commands/list.ts`
- [ ] Verify Green + lint/typecheck

### Step 6: Shell completion and docs

- [ ] Add `deprecate` to shell completion (`src/features/install` / completion source — check where
      commands are enumerated)
- [ ] Update `spec/_index.md` command table with `deprecate` → `spec/features/superseded.md`
- [ ] Update `spec/core/data-model.md` with the three reserved fields
- [ ] Update README if it lists commands

## Manual Verification

**Script**: `test-fixtures/test-superseded.sh`

Non-TTY tests (automated):
- [ ] `ref deprecate A --to B --reason duplicate` marks A; `ref show A` reports the successor
- [ ] `ref export --all` includes A on stdout and warns on stderr; `ref export --all 2>/dev/null`
      is byte-identical to the pre-mark output
- [ ] `ref list` omits A; `ref list --include-superseded` shows it
- [ ] `ref deprecate B --to A` is rejected as a cycle
- [ ] `ref update A --set custom.superseded_by=X` is rejected as a protected field
- [ ] `ref deprecate A --unset` clears all three fields

## Completion Checklist

- [ ] All tests pass (`npm run test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] Manual verification: `./test-fixtures/test-superseded.sh`
- [ ] CHANGELOG.md updated
- [ ] PR description references #108 (do **not** close it — PR-2 and PR-3 remain)
- [ ] Move this file to `spec/tasks/completed/` when all three PRs land
