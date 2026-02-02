spec/_index.mdを起点として必要事項を確認後、spec/tasks/ROADMAP.md を確認し、並列実装可能なタスクを分析して実装を進めて下さい。

## 前提チェック

以下をまず確認:
```bash
which workmux && which tmux && echo "workmux ready" || echo "workmux not available"
test -n "$TMUX" && echo "in tmux session" || echo "not in tmux — run: tmux new-session -s main"
```

- workmux が無い場合: 手動 worktree フォールバック（従来手順）で続行
- tmux 外の場合: `tmux new-session -s main` を案内

## 手順

### 1. タスク分析
- spec/tasks/ROADMAP.md を確認し、未完了のタスクを全て洗い出す
- 依存関係が満たされているタスクを特定（並列実行候補）
- 実装するタスクを選択

### 2. IPC ディレクトリ準備
```bash
mkdir -p /workspaces/reference-manager--worktrees/.ipc
```

### 3. ワーカー起動

workmux で worktree を作成し、同一ウィンドウ内のペイン分割でエージェントを起動する。

#### 3a. workmux で worktree 作成

workmux の `workmux add` は worktree 作成・node_modules symlink・npm install を自動化する。
ただし **エージェント起動は workmux に任せず、手動でペイン分割して行う**。

```bash
# workmux で worktree + セットアップ（-b でバックグラウンド）
workmux add feature/<name> -b
```

workmux が無い場合は手動で:
```bash
git worktree add /workspaces/reference-manager--worktrees/<branch-name> -b <branch-name>
cd /workspaces/reference-manager--worktrees/<branch-name> && npm install
```

#### 3b. ワーカー用の自動許可設定

worktree 内に `.claude/settings.local.json` を配置し、ツール使用の許可プロンプトを抑制する:
```bash
WORKTREE=/workspaces/reference-manager--worktrees/<branch-name>
mkdir -p "$WORKTREE/.claude"
cat > "$WORKTREE/.claude/settings.local.json" << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(*)",
      "Read(*)",
      "Write(*)",
      "Edit(*)",
      "Grep(*)",
      "Glob(*)",
      "mcp__serena__*"
    ]
  }
}
EOF
```

これで問題がある場合（意図しない操作が実行される等）は、代わりに `claude --dangerously-skip-permissions` で起動する。

#### 3c. ペイン分割と Claude 起動

**別ウィンドウではなく、現在のウィンドウ内にペインを分割する。**

```bash
# ペインを分割（-d: フォーカスを元のペインに残す）
WORKTREE=/workspaces/reference-manager--worktrees/<branch-name>
tmux split-window -h -d -c "$WORKTREE"
```

#### 3d. Claude を対話モードで起動し、プロンプトを送信

**重要**: `claude -p` ではなく、まず `claude` を対話モードで起動し、起動完了を待ってからプロンプトを送信する。`send-keys` は**メッセージと Enter を必ず2回に分けて**送信する。

```bash
# Claude を対話モードで起動
tmux send-keys -t <pane-index> 'claude'
tmux send-keys -t <pane-index> Enter

# 起動完了を待つ（"? for shortcuts" が表示されるまで）
sleep 15
# 確認: tmux capture-pane -t <pane-index> -p | tail -5

# プロンプトを送信（メッセージと Enter は分ける）
tmux send-keys -t <pane-index> '/code-with-task <keyword>'
sleep 1
tmux send-keys -t <pane-index> Enter
```

### 4. モニタリングループ

~30秒間隔でポーリング:
```bash
# ペイン一覧
tmux list-panes -F '#{pane_index} #{pane_current_command} #{pane_current_path}'

# IPC ステータス確認
cat /workspaces/reference-manager--worktrees/.ipc/*.status.json 2>/dev/null | jq -r '[.handle, .status, .current_step] | @tsv'

# 特定ペインの出力確認（停滞時）
tmux capture-pane -t <pane-index> -p | tail -20
```

### 5. 完了処理

各ワーカーのPRが作成されたら:
1. PR レビュー + CI 待ち
2. `gh pr merge <number> --merge`
3. main で ROADMAP.md 更新 + タスクファイルを `completed/` に移動
4. クリーンアップ（workmux 使用時は一括削除）:
   ```bash
   # workmux: worktree + tmux ウィンドウ + ブランチを一括削除
   workmux remove <handle>
   # workmux 未使用時:
   # git worktree remove /workspaces/reference-manager--worktrees/<branch-name>
   # git branch -d <branch-name>
   rm -f /workspaces/reference-manager--worktrees/.ipc/<handle>.status.json
   ```

### 6. 障害対応

- **エラー検出**: IPC status が `failed` → `tmux capture-pane -t <pane-index>` でエラー確認
- **リトライ**: メッセージと Enter を分けて送信:
  ```bash
  tmux send-keys -t <pane-index> '続きをお願いします'
  tmux send-keys -t <pane-index> Enter
  ```
- **回復不能**: ペインを閉じて worktree を削除

### 7. アイドル検出

- `updated_at` が5分以上古い場合 → `tmux capture-pane -t <pane-index>` でプロンプト状態を確認
- エージェントがアイドルなら `send-keys`（メッセージと Enter を分ける）で継続指示

## tmux 未使用時のフォールバック

worktreeは必ず `/workspaces/reference-manager--worktrees/` 内に作成:
```bash
git worktree add /workspaces/reference-manager--worktrees/<branch-name> -b <branch-name>
cd /workspaces/reference-manager--worktrees/<branch-name>
npm install
```

TDD実装サイクル:
1. **Red**: 失敗するテストを書く
2. **Green**: テストを通す最小限の実装
3. **Refactor**: リファクタリング
4. 各ステップ完了後にcommit

完了前チェック:
```bash
npm run test:all
npm run lint
npm run typecheck
```

PR作成 → マージ → ROADMAP更新 → worktree cleanup

## 作業範囲について

並列作業時のconflictを避けるため:

- **worktree内での作業**: 実装 → テスト → PR作成まで
- **マージ後にmainブランチで**: ROADMAP.md更新とタスクファイルのcompleted/への移動

## context管理
ステップ一つが完了する毎にタスクファイルを更新し、commit。次の作業の完了までにcompactが必要になりそうなら、その時点で作業を中断し、進捗を報告して下さい。
