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

### 役割分担

| 担当 | 内容 |
|------|------|
| **AIエージェント** | ビルド、ダミーライブラリ生成、テスト用config作成、ディレクトリ準備、動作確認 (`list`) |
| **ユーザー** | エイリアス設定（1行コピペ）、TUI操作（検索・選択・アクション実行）、目視確認 |

TTY操作はエージェントから実行できないため、ユーザーが直接ターミナルで操作する必要がある。
エージェントは準備完了後、以下の「ユーザー向けテスト手順」をそのまま案内すること。

### エージェント準備手順

```bash
# 1. worktree に移動してビルド
cd /workspaces/reference-manager--worktrees/feature/tui-action-menu
npm run build

# 2. ダミーライブラリ生成（DOI/PMID/URL付きの20件）
node test-fixtures/generate-dummy-library.mjs /tmp/tui-test-library.json 20

# 3. テスト用config作成
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

# 4. attachments ディレクトリ作成
mkdir -p /tmp/tui-test-attachments

# 5. 動作確認（list が動くことを確認）
node bin/cli.js --config /tmp/tui-test-config.toml list --limit 3
```

準備が完了したら、以下の「ユーザー向けテスト手順」をユーザーにそのまま提示する。

---

### ユーザー向けテスト手順

> 以下はターミナルで直接実行してください。

#### 0. 事前準備

```bash
# worktree に移動
cd /workspaces/reference-manager--worktrees/feature/tui-action-menu

# ref コマンドのエイリアスを設定（--config 込み、セッション中のみ有効）
alias ref="node $(pwd)/bin/cli.js --config /tmp/tui-test-config.toml"

# 動作確認: リストが3件表示されれば OK
ref list --limit 3
```

#### A. アクションメニュー表示（単一選択）

```bash
ref search --tui
```

1. 何も入力せず（全件表示の状態で）、**↑↓** で移動し **Space** で **1件だけ** 選択
2. **Enter** を押す
3. **確認**: アクションメニューに以下の **10項目** が上から順に表示される
   ```
   Citation key (Pandoc)
   Generate citation
   Generate citation (choose style)
   Open URL
   Open fulltext
   Manage attachments
   Edit reference          ← 単数形
   Output (choose format)
   Remove
   Cancel
   ```
4. **Cancel** を選んで終了

- [ ] 10項目表示される

#### B. アクションメニュー表示（複数選択）

```bash
ref search --tui
```

1. **Space** で **3件** 選択して **Enter**
2. **確認**: 以下の **7項目** が表示される（Open URL, Open fulltext, Manage attachments **がない**）
   ```
   Citation keys (Pandoc)  ← 複数形
   Generate citation
   Generate citation (choose style)
   Edit references         ← 複数形
   Output (choose format)
   Remove
   Cancel
   ```
3. **Cancel** を選んで終了

- [ ] 7項目表示（単数形→複数形の変化も確認）

#### C. Citation key（単一・Pandoc）

```bash
ref search --tui
```

1. 1件選択 → Enter → **"Citation key (Pandoc)"** を選択
2. **確認**: `@<citation-key>` 形式の文字列が stdout に出力される（例: `@Smith-2023`）

- [ ] `@<id>` 形式で出力

#### D. Citation keys（複数・Pandoc）

```bash
ref search --tui
```

1. 3件選択 → Enter → **"Citation keys (Pandoc)"** を選択
2. **確認**: `@id1; @id2; @id3` 形式（セミコロン区切り）で出力

- [ ] `@id1; @id2; @id3` 形式

#### E. LaTeX key 形式

config を一時的に latex に切り替え:

```bash
sed -i 's/default_key_format = "pandoc"/default_key_format = "latex"/' /tmp/tui-test-config.toml
```

```bash
ref search --tui
```

1. 1件選択 → **"Citation key (LaTeX)"** → **確認**: `\cite{<id>}` 形式
2. 再度実行 → 3件選択 → **"Citation keys (LaTeX)"** → **確認**: `\cite{id1,id2,id3}` 形式

config を元に戻す:

```bash
sed -i 's/default_key_format = "latex"/default_key_format = "pandoc"/' /tmp/tui-test-config.toml
```

- [ ] LaTeX形式の単一・複数出力

#### F. Generate citation（デフォルトスタイル）

```bash
ref search --tui
```

1. 1件選択 → **"Generate citation"**
2. **確認**: 引用テキストが出力される（config で `default_style = "vancouver"` に設定しているため、Vancouver 形式）

- [ ] config の defaultStyle が使われる

#### G. Generate citation (choose style)

```bash
ref search --tui
```

1. 1件選択 → **"Generate citation (choose style)"**
2. **確認**: スタイル選択メニューが表示される（APA / Vancouver / Harvard）
3. いずれかを選択 → 選んだスタイルで引用が出力される

- [ ] スタイル選択→出力

#### H. Output (choose format) サブメニュー

```bash
ref search --tui
```

1. 1件選択 → **"Output (choose format)"**
2. **確認**: サブメニューが表示される
   ```
   IDs (citation keys)
   CSL-JSON
   BibTeX
   YAML
   Cancel
   ```
3. **"YAML"** を選択 → YAML形式で出力されることを確認

同様に IDs, CSL-JSON, BibTeX も試す（各回コマンド再実行が必要）。

- [ ] サブメニュー表示
- [ ] YAML 出力（`id:`, `type:` 等のキーが含まれる）
- [ ] IDs 出力（citation key が1行1件）
- [ ] CSL-JSON 出力（JSONオブジェクト）
- [ ] BibTeX 出力（`@article{...}` 形式）

#### I. Output format の Cancel

```bash
ref search --tui
```

1. 1件選択 → **"Output (choose format)"** → **"Cancel"**
2. **確認**: アクションメニューに戻る（プロセスが終了しない）
3. **Cancel** で終了

- [ ] Cancel でアクションメニューに戻る

#### J. Open URL

```bash
ref search --tui
```

1. DOI 付きのエントリを1件選択（検索欄に `DOI:` と入力すると絞りやすい）→ **"Open URL"**
2. **確認**: ブラウザが開くか、WSL の場合は `wslview` 経由で URL が開く
   - エラーが出る場合は「opener が呼ばれた」ことを確認できれば OK

- [ ] URL あり: ブラウザまたはopenerが動作
- [ ] URL なし: `No URL available for <id>` がターミナルに表示

#### K. Open fulltext

```bash
ref search --tui
```

1. 1件選択 → **"Open fulltext"**
2. **確認**: ダミーデータには fulltext が無いため、エラーメッセージが表示される（想定動作）

- [ ] エラーメッセージ表示

#### L. Manage attachments

```bash
ref search --tui
```

1. 1件選択 → **"Manage attachments"**
2. **確認**: attachments ディレクトリ（`/tmp/tui-test-attachments/<id>/`）のオープンが試みられる

- [ ] ディレクトリオープン動作（またはエラー）

#### M. Edit reference（単一）

```bash
EDITOR=cat ref search --tui
```

> `EDITOR=cat` を指定すると、エディタの代わりに内容が stdout に表示され、確認しやすい。

1. 1件選択 → **"Edit reference"**
2. **確認**: YAML形式の参照データが表示される

- [ ] エディタ（cat）起動、データ表示

#### N. Edit references（複数）

```bash
EDITOR=cat ref search --tui
```

1. 3件選択 → **"Edit references"**
2. **確認**: 3件分のデータが表示される

- [ ] 複数件の表示

#### O. Remove（単一）

```bash
ref search --tui
```

1. 1件選択 → **"Remove"**
2. **確認**: 削除確認プロンプトが表示される → `y` で削除
3. 確認:
   ```bash
   ref list | wc -l
   ```
   → 件数が1つ減っていれば OK

- [ ] 確認プロンプト→削除→件数減少

#### P. Remove（複数）

```bash
ref search --tui
```

1. 2件選択 → **"Remove"**
2. **確認**: 各エントリについて順次確認・削除が行われる

- [ ] 複数件の逐次削除

#### Q. ナビゲーション

```bash
ref search --tui
```

1. 1件選択 → Enter → アクションメニュー表示 → **Esc キー**
2. **確認**: 検索画面に戻る（TUIは終了しない）
3. 検索画面で **Esc キー**
4. **確認**: TUI が終了し、通常のシェルに戻る

- [ ] アクションメニューで Esc → 検索に戻る
- [ ] 検索画面で Esc → TUI 終了

---

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
