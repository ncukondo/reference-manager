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

### 2. ワーカー起動

`scripts/spawn-worker.sh` がセットアップからエージェント起動まで一括で行う:
```bash
./scripts/spawn-worker.sh feature/<name> <task-keyword>
```

スクリプトの内容:
1. worktree 作成（workmux or 手動）
2. `.claude/settings.local.json` 配置（自動許可）
3. `CLAUDE.md` にワーカー用指示を append（compact復帰手順含む）
4. tmux ペイン分割（`-d` でフォーカス維持）
5. Claude 対話起動 → 待機 → プロンプト送信

起動に失敗した場合はスクリプトが手動コマンドを表示するので、それに従う。

### 3. モニタリングループ

~30秒間隔でポーリング:
```bash
# ペイン一覧
tmux list-panes -F '#{pane_index} #{pane_current_command} #{pane_current_path}'

# IPC ステータス確認（各worktree内の .worker-status.json）
cat /workspaces/reference-manager--worktrees/*/.worker-status.json 2>/dev/null | jq -r '[.branch, .status, .current_step] | @tsv'

# 特定ペインの出力確認（停滞時）
tmux capture-pane -t <pane-index> -p | tail -20
```

### 4. 完了処理

各ワーカーのPRが作成されたら:
1. PR レビュー + CI 待ち
2. `gh pr merge <number> --merge`
3. main で ROADMAP.md 更新 + タスクファイルを `completed/` に移動
4. クリーンアップ（CLAUDE.md復元 → worktree削除）:
   ```bash
   cd /workspaces/reference-manager--worktrees/<branch-name> && git checkout -- CLAUDE.md
   workmux remove <handle>
   # workmux 未使用時: git worktree remove ... && git branch -d ...
   ```

### 5. 障害対応

- **エラー検出**: IPC status が `failed` → `tmux capture-pane -t <pane-index>` でエラー確認
- **リトライ**: メッセージと Enter を分けて送信:
  ```bash
  tmux send-keys -t <pane-index> '続きをお願いします'
  tmux send-keys -t <pane-index> Enter
  ```
- **回復不能**: ペインを閉じて worktree を削除

### 6. アイドル検出

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
