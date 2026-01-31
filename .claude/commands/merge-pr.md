PR #$ARGUMENTS のマージ処理を行って下さい。

## 手順

### 1. CI確認
- CIが通っていればマージ
- まだCIが走っている場合は終了するまで待ってから確認

### 2. マージ実行
```bash
gh pr merge $ARGUMENTS --merge
```

### 3. cleanup
- mainを最新にする (`git checkout main && git pull`)
- `git worktree list` で該当のworktree（`/workspaces/reference-manager--worktrees/` 内）を確認し削除
- 不要になったブランチを削除

### 4. タスク完了処理（mainブランチで）
- 該当タスクファイルを `spec/tasks/` から `spec/tasks/completed/` に移動
- spec/tasks/ROADMAP.md のステータスを更新
- commit & push
