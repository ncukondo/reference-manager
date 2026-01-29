# Task: Edit ID Collision Auto-Resolution

## Purpose

Enable automatic ID collision resolution for `ref edit` (and align `ref update` CLI behavior with the server).
When a user edits a reference's ID to one that already exists, the system should auto-resolve
by appending a suffix (e.g., `Smith-2020a`) instead of failing, and clearly report the change.

## Prerequisites

- `20260127-01-pr45-followup-refactor.md` Steps 3 & 4 should be completed first (they modify `toEditItemResult` and `updateEditedItem` in `edit.ts`, which this task also modifies)

## References

- Spec: `spec/features/edit.md` (EditItemResult, Output Format, Error Handling)
- Spec: `spec/features/json-output.md` (UpdateJsonOutput)
- Related: `src/cli/commands/edit.ts`, `src/cli/commands/update.ts`
- Related: `src/core/library.ts` (resolveIdCollision, resolveNewId)
- Related: `src/features/operations/update.ts` (updateReference)

## Background

- `Library.resolveNewId` supports `onIdCollision: "suffix"` to auto-resolve ID collisions
- HTTP server routes already default to `"suffix"`
- CLI commands (`ref edit`, `ref update`) default to `"fail"`, causing errors on collision
- `EditItemResult` lacks `idChanged`/`newId` fields, so even if auto-resolution were enabled,
  the result would not be reported to the user

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`):

1. **Write test**: Create test file with comprehensive test cases
2. **Create stub**: Create implementation file with empty functions (`throw new Error("Not implemented")`)
3. **Verify Red**: Run tests, confirm they fail with "Not implemented"
4. **Implement**: Write actual logic until tests pass (Green)
5. **Refactor**: Clean up code while keeping tests green
6. **Quality checks**: Pass lint/typecheck

## Steps

### Step 1: Add `idChanged`/`newId` to EditItemResult

Extend `EditItemResult` interface and update `toEditItemResult` to propagate
`idChanged`/`newId` from `UpdateResult`.

**Changes:**
- `src/cli/commands/edit.ts`: Add `idChanged?: boolean` and `newId?: string` to `EditItemResult`
- `src/cli/commands/edit.ts`: Update `toEditItemResult` to set these fields from `UpdateResult`

**Tests:**
- `src/cli/commands/edit.test.ts`: Test `toEditItemResult` returns `idChanged`/`newId` when present in `UpdateResult`

- [x] Write test
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 2: Enable `onIdCollision: "suffix"` for edit command

Pass `onIdCollision: "suffix"` in `updateEditedItem` calls to `library.update()`.

**Changes:**
- `src/cli/commands/edit.ts`: Pass `{ idType: "uuid", onIdCollision: "suffix" }` in `updateEditedItem`

**Tests:**
- `src/cli/commands/edit.test.ts`: Test that ID collision is resolved (state is `"updated"` with `idChanged: true`)

- [x] Write test
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 3: Update `formatEditOutput` for ID changes

Show `(was: <original>)` notation for items where ID was auto-resolved.

**Changes:**
- `src/cli/commands/edit.ts`: Update `formatEditOutput` to display resolved IDs
- `src/cli/commands/edit.ts`: Update `executeEditCommand` to use `newId` for `updatedIds`

**Tests:**
- `src/cli/commands/edit.test.ts`: Test output formatting with `idChanged` items

- [x] Write test
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 4: Enable `onIdCollision: "suffix"` for update command

Pass `onIdCollision: "suffix"` in update command's `executeUpdate`.

**Changes:**
- `src/cli/commands/update.ts`: Pass `onIdCollision: "suffix"` to `library.update()`
- `src/cli/commands/update.ts`: Update `formatUpdateOutput` collision path (now resolves instead of failing)

**Tests:**
- `src/cli/commands/update.test.ts`: Test that ID collision is resolved with suffix
- `src/cli/commands/update.test.ts`: Update existing collision error tests

- [x] Write test
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 5: Update existing tests

Update tests that expect `id_collision` failure behavior to reflect new auto-resolution behavior.

**Tests to update:**
- `src/cli/commands/edit.test.ts`: `id_collision` state formatting tests
- `src/cli/commands/update.test.ts`: ID collision result formatting tests
- `src/features/operations/update.test.ts`: `updateReference` collision tests (default changes)
- `src/features/operations/json-output.test.ts`: JSON collision error tests

- [x] Update tests (no changes needed: existing tests remain valid)
- [x] Verify Green: `npm test`
- [x] Lint/Type check

## Handover Notes (未完了の作業)

### 実施済み
- Steps 1–5 のコード変更は全て完了、テスト・lint・typecheck 合格
- マニュアルテストで edit/update 両方の衝突自動解決を確認済み
- `test-fixtures/test-id-collision-resolution.sh` 作成済み（自動テスト6件 全PASS）

### マニュアルテスト後に追加した修正（未コミット）
以下の修正がワーキングツリーに残っている：

1. **衝突解決メッセージの改善**（Step 3–4 の発展）
   - `formatEditOutput`: `(was: X)` → `(ID collision resolved: X → Y)` に変更
   - `formatUpdateOutput`: `ID changed to: X` → `ID collision resolved: X → Y` に変更
   - `formatNotUpdated` ヘルパー抽出（cognitive complexity 対策）

2. **衝突解決後に元IDと同じになるケースの対応**
   - `src/core/library.ts` `updateReference`: no-changes パスでも `idChanged`/`newId` を返すように修正
   - `src/cli/commands/edit.ts` `toEditItemResult`: unchanged ケースでも `idChanged`/`newId` を伝搬
   - `src/cli/commands/update.ts` `formatNotUpdated`: unchanged + 衝突解決時に理由を表示
   - `src/cli/commands/edit.ts` `formatEditOutput`: unchanged リストでも衝突情報を表示
   - 例: `No changes: [Moore-2018ea] ...\nID collision resolved: requested ID already exists → kept Moore-2018ea`

3. **テストスクリプト**: `test-fixtures/test-id-collision-resolution.sh` のアサーションを新メッセージに合わせて更新済み

### 残りの作業
- [ ] `npm run build` 確認
- [ ] `npm test` 全件合格確認
- [ ] `bash test-fixtures/test-id-collision-resolution.sh` 再実行
- [ ] TTY マニュアルテスト再実行（衝突解決後に同じIDになるケースの表示確認）
- [ ] CHANGELOG.md 更新
- [ ] コミット・push
- [ ] spec の出力例を更新（`(was: X)` → `(ID collision resolved: ...)` に合わせる）
- [ ] タスクファイルを `spec/tasks/completed/` に移動

## Completion Checklist

- [x] All tests pass (`npm run test`)
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [ ] Build succeeds (`npm run build`)
- [ ] CHANGELOG.md updated
- [ ] Move this file to `spec/tasks/completed/`
