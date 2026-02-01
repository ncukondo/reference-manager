# Task: TUI Action Menu Enhancement

## Purpose

Enhance the TUI search action menu (`ref search -t`) with:
- Dynamic menu based on selection count (single vs. multiple entries)
- Citation key action (Pandoc/LaTeX, config-driven)
- New side-effect actions: Open URL, Open fulltext, Manage attachments, Edit, Remove
- Output format submenu (IDs, CSL-JSON, BibTeX, YAML)
- Default citation style from `config.citation.defaultStyle`

See `spec/features/interactive-search.md` (Action Menu section) for full specification.

**Depends on:**
- `20260130-01-citation-key-format.md` (citation key format, config, generateOutput)
- `20260130-02-url-command.md` (URL resolution module)

## References

- Spec: `spec/features/interactive-search.md`
- Action menu: `src/features/interactive/action-menu.ts`
- Search flow app: `src/features/interactive/apps/SearchFlowApp.tsx`
- Search command: `src/cli/commands/search.ts` (`executeInteractiveSearch`, `handleSearchAction`)
- Caller: `src/cli/index.ts` (`handleSearchAction`)
- URL resolution: `src/features/operations/url.ts` (from url-command task)
- Citation key format: `src/features/format/items.ts` (from citation-key-format task)

## Architecture Notes

### Current Design

- `ActionType` is a string union, `ACTION_CHOICES` is a fixed array
- `SearchFlowApp` has states: `search` → `action` → `style` → `exiting`
- `runActionMenu` / `SearchFlowApp` generates output text and returns `ActionMenuResult { action, output, cancelled }`
- `handleSearchAction` in `src/cli/index.ts` writes `result.output` to stdout

### Required Changes

1. **Dynamic action choices**: `ACTION_CHOICES` → `getActionChoices(count, config)` function
2. **New flow state**: `output-format` state for the output format submenu
3. **Side-effect action pattern**: `executeInteractiveSearch` must handle actions that don't produce stdout output
   - Output actions: return `{ output, cancelled: false }` as before
   - Side-effect actions: execute the operation within `executeInteractiveSearch`, return `{ output: "", cancelled: false }`
   - This keeps `handleSearchAction` simple — it doesn't need to know about action details
4. **Config access**: `executeInteractiveSearch` already receives `config`, pass `config.citation.defaultStyle` and `config.citation.defaultKeyFormat` to SearchFlowApp/action menu
5. **Selected items access**: Side-effect actions need the selected `CslItem[]` and `ExecutionContext` — these are available in `executeInteractiveSearch`

### Action Menu Structure

**Single entry selected:**

```
? Action for 1 selected reference:
❯ Citation key (Pandoc)           ← label changes with config.citation.defaultKeyFormat
  Generate citation
  Generate citation (choose style)
  Open URL                        ← opens DOI/PubMed page in browser
  Open fulltext                   ← opens local PDF
  Manage attachments
  Edit reference
  Output (choose format)          ← submenu: IDs, CSL-JSON, BibTeX, YAML
  Remove
  Cancel
```

**Multiple entries selected:**

```
? Action for 3 selected references:
❯ Citation keys (Pandoc)
  Generate citation
  Generate citation (choose style)
  Edit references
  Output (choose format)
  Remove
  Cancel
```

### Citation Key TUI Output Format

| Config | Single | Multiple |
|--------|--------|----------|
| `pandoc` | `@smith2023` | `@smith2023; @jones2024` |
| `latex` | `\cite{smith2023}` | `\cite{smith2023,jones2024}` |

### Underlying Functions for Side-Effect Actions

| Action | Function | Module |
|--------|----------|--------|
| Open URL | `resolveDefaultUrl()` + `openWithSystemApp()` | `src/features/operations/url.ts`, `src/utils/opener.ts` |
| Open fulltext | `executeFulltextOpen()` | `src/cli/commands/fulltext.ts` |
| Manage attachments | `executeAttachOpen()` + `runInteractiveMode()` | `src/cli/commands/attach.ts` |
| Edit | `executeEditCommand()` | `src/cli/commands/edit.ts` |
| Remove | `executeRemove()` with `confirmRemoveIfNeeded()` | `src/cli/commands/remove.ts` |

## TDD Workflow

For each step, follow the Red-Green-Refactor cycle (see `spec/guidelines/testing.md`).

## Steps

### Step 1: Refactor ActionType and Dynamic Action Choices

Extend `ActionType` with new values and make action choices dynamic.

**Changes:**
- Add to `ActionType`: `"key-default"`, `"open-url"`, `"open-fulltext"`, `"manage-attachments"`, `"edit"`, `"remove"`, `"output-format"`
- Create `getActionChoices(count: number, config: { defaultKeyFormat: string }): SelectOption<ActionType>[]`
  - Single (count === 1): Citation key (Pandoc/LaTeX), Generate citation, Generate citation (choose style), Open URL, Open fulltext, Manage attachments, Edit reference, Output (choose format), Remove, Cancel
  - Multiple (count > 1): Citation keys (Pandoc/LaTeX), Generate citation, Generate citation (choose style), Edit references, Output (choose format), Remove, Cancel
- Dynamic label for citation key: `"pandoc"` → `"Citation key (Pandoc)"`, `"latex"` → `"Citation key (LaTeX)"`
- Update `SearchFlowApp` to call `getActionChoices(selectedItems.length, config)` instead of using `ACTION_CHOICES`

**Files:**
- `src/features/interactive/action-menu.ts`
- `src/features/interactive/apps/SearchFlowApp.tsx`

**Tests:**
- [x] Write test: `src/features/interactive/action-menu.test.ts` — `getActionChoices` returns correct items for count=1 and count>1
- [x] Write test: `getActionChoices` uses config to set citation key label
- [x] Implement
- [x] Verify Green
- [x] Lint/Type check

### Step 2: Add Output Format Submenu ✅

- [x] Implemented `OutputFormatType` and `OUTPUT_FORMAT_CHOICES`
- [x] Added `"output-format"` flow state to `SearchFlowApp`
- [x] YAML output via `yaml` package `stringify`
- [x] Tests pass

### Step 3: Use Default Citation Style from Config ✅

- [x] `defaultStyle` passed through config chain
- [x] `cite-default` uses `config.citation.defaultStyle`
- [x] Tests pass

### Step 4: Side-Effect Action Architecture ✅

- [x] `ActionMenuResult.selectedItems` added for side-effect actions
- [x] `isSideEffectAction()` helper function
- [x] `executeInteractiveSearch` handles side-effect results
- [x] `executeSideEffectAction` dispatches to appropriate functions
- [x] Tests pass

### Steps 5-10: All Actions Implemented ✅

- [x] Step 5: Citation key action (via `generateOutput("key-default")`)
- [x] Step 6: Open URL action (`resolveDefaultUrl` + `openWithSystemApp`)
- [x] Step 7: Open fulltext action (`executeFulltextOpen`)
- [x] Step 8: Manage attachments action (`executeAttachOpen`)
- [x] Step 9: Edit action (`executeEditCommand`)
- [x] Step 10: Remove action (`executeRemove`)

## Manual Verification

**Status**: 未実施。PR #55 はCI全パス済み。次セッションでマニュアルテスト後にマージ判断。

### 準備手順

```bash
# 1. worktree に移動
cd /workspaces/reference-manager--worktrees/feature/tui-action-menu

# 2. ビルド
npm run build

# 3. エイリアス設定（このセッション中有効）
alias ref="node $(pwd)/bin/cli.js"

# 4. ダミーライブラリ生成
node test-fixtures/generate-dummy-library.mjs /tmp/tui-test-library.json 20

# 5. テスト用config作成（/tmp/tui-test-config.toml）
cat > /tmp/tui-test-config.toml <<'TOML'
library = "/tmp/tui-test-library.json"

[citation]
default_style = "vancouver"
default_key_format = "pandoc"

[attachments]
directory = "/tmp/tui-test-attachments"

[cli.tui]
limit = 15

[cli.edit]
default_format = "yaml"
TOML

# 6. attachments ディレクトリ作成（Manage attachments テスト用）
mkdir -p /tmp/tui-test-attachments

# 7. 動作確認
ref --config /tmp/tui-test-config.toml list --limit 3
```

### テスト手順

**全テストで `--config /tmp/tui-test-config.toml` を付与する。**
省略のため以下では `ref -t` = `ref search --tui --config /tmp/tui-test-config.toml` と表記。

#### A. アクションメニュー表示（単一選択）

```bash
ref search --tui --config /tmp/tui-test-config.toml
```

1. 適当な検索語を入力し、1件だけ Space で選択して Enter
2. **確認**: アクションメニューに以下の10項目が表示されること
   - Citation key (Pandoc)
   - Generate citation
   - Generate citation (choose style)
   - Open URL
   - Open fulltext
   - Manage attachments
   - Edit reference
   - Output (choose format)
   - Remove
   - Cancel

- [ ] 10項目表示される

#### B. アクションメニュー表示（複数選択）

1. TUI で3件を Space で選択して Enter
2. **確認**: 以下の7項目のみ表示（Open URL, Open fulltext, Manage attachments がない）
   - Citation keys (Pandoc)
   - Generate citation
   - Generate citation (choose style)
   - Edit references
   - Output (choose format)
   - Remove
   - Cancel

- [ ] 7項目表示される（単数形→複数形の変化も確認）

#### C. Citation key (単一)

1. 1件選択 → "Citation key (Pandoc)" を選択
2. **確認**: `@<id>` 形式で出力される

- [ ] Pandoc形式の出力

#### D. Citation keys (複数)

1. 3件選択 → "Citation keys (Pandoc)" を選択
2. **確認**: `@id1; @id2; @id3` 形式で出力される

- [ ] 複数Pandocキー出力

#### E. LaTeX key 形式テスト

```bash
# config を latex に切り替え
sed -i 's/default_key_format = "pandoc"/default_key_format = "latex"/' /tmp/tui-test-config.toml
```

1. 1件選択 → "Citation key (LaTeX)" を選択
2. **確認**: `\cite{<id>}` 形式で出力される
3. 3件選択 → "Citation keys (LaTeX)" を選択
4. **確認**: `\cite{id1,id2,id3}` 形式で出力される

```bash
# 元に戻す
sed -i 's/default_key_format = "latex"/default_key_format = "pandoc"/' /tmp/tui-test-config.toml
```

- [ ] LaTeX形式の単一・複数出力

#### F. Generate citation（デフォルトスタイル）

1. 1件選択 → "Generate citation" を選択
2. **確認**: vancouver スタイル（config の defaultStyle）でフォーマットされた引用が出力される

- [ ] config の defaultStyle が使われる

#### G. Generate citation (choose style)

1. 1件選択 → "Generate citation (choose style)" を選択
2. スタイル選択メニューが表示される（APA, Vancouver, Harvard）
3. 任意のスタイルを選択
4. **確認**: 選択したスタイルで引用が出力される

- [ ] スタイル選択メニュー動作

#### H. Output (choose format) サブメニュー

1. 1件選択 → "Output (choose format)" を選択
2. **確認**: サブメニューに IDs, CSL-JSON, BibTeX, YAML, Cancel が表示
3. "IDs" → citation key が1行で出力
4. 再度 → "CSL-JSON" → JSON形式で出力
5. 再度 → "BibTeX" → BibTeX形式で出力
6. 再度 → "YAML" → YAML形式で出力

- [ ] 各フォーマット出力確認

#### I. Output format の Cancel

1. "Output (choose format)" → Cancel
2. **確認**: アクションメニューに戻る（プロセスが終了しない）

- [ ] Cancel でアクションメニューに戻る

#### J. Open URL

1. DOI またはPMIDを持つエントリを1件選択 → "Open URL"
2. **確認**: ブラウザ（またはシステムデフォルト）でURLが開く
   - WSL環境では `wslview` が使われる想定
   - 開かない場合はエラーメッセージを確認
3. URL を持たないエントリで試す → stderr に `No URL available for <id>` と出力

- [ ] URL あり: ブラウザが開く（またはopenerが呼ばれる）
- [ ] URL なし: エラーメッセージ

#### K. Open fulltext

1. 1件選択 → "Open fulltext"
2. **確認**: fulltextファイルが存在しない場合はエラーメッセージ
   - （ダミーデータにはfulltext未設定のため、エラーが想定動作）

- [ ] エラーまたはファイルオープン動作

#### L. Manage attachments

1. 1件選択 → "Manage attachments"
2. **確認**: attachments ディレクトリオープンが試みられる

- [ ] ディレクトリオープン動作

#### M. Edit reference（単一）

1. 1件選択 → "Edit reference"
2. **確認**: `$EDITOR` / `$VISUAL` が設定されていればエディタが開く
   - `EDITOR=cat` とすると内容がstdoutに表示されて確認しやすい

```bash
EDITOR=cat ref search --tui --config /tmp/tui-test-config.toml
```

- [ ] エディタが起動する

#### N. Edit references（複数）

1. 3件選択 → "Edit references"
2. **確認**: 3件分のデータがエディタに渡される

- [ ] 複数件の編集

#### O. Remove（単一）

1. 1件選択 → "Remove"
2. **確認**: 確認プロンプトが表示される
3. 削除を確認し、`ref list --config /tmp/tui-test-config.toml` で消えていることを確認

- [ ] 確認プロンプト→削除

#### P. Remove（複数）

1. 複数件選択 → "Remove"
2. **確認**: 各エントリについて順次処理される

- [ ] 複数件の逐次削除

#### Q. ナビゲーション

1. アクションメニューで Esc → **確認**: 検索画面に戻る
2. 検索画面で Esc → **確認**: TUI が終了する

- [ ] Esc で検索に戻る
- [ ] 検索画面で Esc 終了

### テスト後のクリーンアップ

```bash
rm -f /tmp/tui-test-library.json /tmp/tui-test-config.toml
rm -rf /tmp/tui-test-attachments
unalias ref 2>/dev/null
```

## Completion Checklist

- [x] All tests pass (`npm run test`) — 2548 unit tests, 27 action-menu tests
- [x] Lint passes (`npm run lint`)
- [x] Type check passes (`npm run typecheck`)
- [x] Build succeeds (`npm run build`)
- [x] CI passes (ubuntu, macOS, Windows) — PR #55
- [ ] Manual verification (TTY required) — 上記手順 A〜Q を実施
- [x] Spec verified: `spec/features/interactive-search.md` (already up to date)
- [x] CHANGELOG.md updated
- [ ] PR #55 をマージ
- [ ] main で ROADMAP 更新、タスクファイルを `completed/` に移動
