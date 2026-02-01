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
- workmux が使える場合:
  ```bash
  # PRのブランチ名からハンドルを特定
  HANDLE=$(gh pr view $ARGUMENTS --json headRefLabel -q .headRefLabel)
  workmux remove "$HANDLE" 2>/dev/null || true
  ```
- workmux が無い場合のフォールバック:
  - `git worktree list` で該当のworktree（`/workspaces/reference-manager--worktrees/` 内）を確認し削除
  - 不要になったブランチを削除
- IPC ステータスファイルのクリーンアップ:
  ```bash
  rm -f /workspaces/reference-manager--worktrees/.ipc/"$HANDLE".status.json 2>/dev/null
  ```

### 4. タスク完了処理（mainブランチで）
- 該当タスクファイルを `spec/tasks/` から `spec/tasks/completed/` に移動
- spec/tasks/ROADMAP.md のステータスを更新
- commit & push
