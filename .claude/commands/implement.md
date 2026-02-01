spec/_index.mdを起点として必要事項を確認後、spec/tasks/ROADMAP.md を確認し、並列実装可能なタスクを分析して実装を進めて下さい。

## 前提チェック

以下をまず確認:
```bash
which workmux && which tmux && echo "workmux ready" || echo "workmux not available"
test -n "$TMUX" && echo "in tmux session" || echo "not in tmux — run: tmux new-session -s main"
```

- workmux/tmux が無い場合: 手動 worktree フォールバック（従来手順）で続行
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

### 3. ワーカー起動（workmux利用時）

各タスクについて:
```bash
workmux add feature/<name> -b -p "/code-with-task <keyword>"
```
- `-b`: バックグラウンド（ウィンドウ切替しない）
- `-p`: エージェントへの初期プロンプト

### 4. モニタリングループ

~30秒間隔でポーリング:
```bash
# 全体状況
workmux list

# IPC ステータス確認
cat /workspaces/reference-manager--worktrees/.ipc/*.status.json 2>/dev/null | jq -r '[.handle, .status, .current_step] | @tsv'

# 停滞ワーカーの確認（updated_at が古い場合）
tmux capture-pane -t <window-name> -p | tail -20
```

### 5. 完了処理

各ワーカーのPRが作成されたら:
1. PR レビュー + CI 待ち
2. `gh pr merge <number> --merge`
3. main で ROADMAP.md 更新 + タスクファイルを `completed/` に移動
4. `workmux remove <handle>` でクリーンアップ
5. `rm -f /workspaces/reference-manager--worktrees/.ipc/<handle>.status.json`

### 6. 障害対応

- **エラー検出**: IPC status が `failed` → `tmux capture-pane` でエラー確認
- **リトライ**: エージェントがアイドル状態なら `tmux send-keys -t <window> "続きをお願いします" Enter`
- **回復不能**: `workmux remove <handle>` でクリーンアップ

### 7. アイドル検出

- `updated_at` が5分以上古い場合 → `tmux capture-pane` でプロンプト状態を確認
- エージェントがアイドルなら `tmux send-keys` で継続指示

## workmux未使用時のフォールバック

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
